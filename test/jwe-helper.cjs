/**
 * Cifra um JWE compacto no próprio teste, seguindo RFC 7516 (formato) e RFC 7518 (algoritmos),
 * para provar a decriptação do node sem depender de uma conta real do Conversas.
 * Escrito de forma independente do código de produção: se o node errar o AAD, o HMAC ou o
 * tamanho da chave, os testes de decriptação falham.
 */
const crypto = require('node:crypto');

const b64u = (buffer) => Buffer.from(buffer).toString('base64url');

// Parâmetros de cada `enc`: bits da chave de conteúdo e, nos modos CBC, o hash do HMAC.
const ENC = {
	A128GCM: { gcm: true, bits: 128 },
	A192GCM: { gcm: true, bits: 192 },
	A256GCM: { gcm: true, bits: 256 },
	'A128CBC-HS256': { gcm: false, bits: 128, hash: 'sha256' },
	'A192CBC-HS384': { gcm: false, bits: 192, hash: 'sha384' },
	'A256CBC-HS512': { gcm: false, bits: 256, hash: 'sha512' },
};

/** Gera um par RSA e devolve a chave pública (para cifrar) e a privada em JWK (para a credencial). */
function makeKeys() {
	const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
	return { publicKey, privateJwk: privateKey.export({ format: 'jwk' }) };
}

/** Cifra `payload` (qualquer valor JSON) com RSA-OAEP-256 e o `enc` pedido. */
function encryptJwe(payload, publicKey, enc, encoding = 'utf8') {
	const spec = ENC[enc];
	const keyBytes = spec.gcm ? spec.bits / 8 : (spec.bits / 8) * 2;
	const cek = crypto.randomBytes(keyBytes);
	const iv = crypto.randomBytes(spec.gcm ? 12 : 16);
	const header = b64u(JSON.stringify({ alg: 'RSA-OAEP-256', enc }));
	const aad = Buffer.from(header, 'ascii');
	// `encoding` imita o node-jose, que grava uma string passada ao `update` como latin1.
	const plaintext = Buffer.from(JSON.stringify(payload), encoding);
	let ciphertext;
	let tag;
	if (spec.gcm) {
		const cipher = crypto.createCipheriv(`aes-${spec.bits}-gcm`, cek, iv);
		cipher.setAAD(aad);
		ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
		tag = cipher.getAuthTag();
	} else {
		const half = cek.length / 2;
		const cipher = crypto.createCipheriv(`aes-${spec.bits}-cbc`, cek.subarray(half), iv);
		ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
		const al = Buffer.alloc(8);
		al.writeBigUInt64BE(BigInt(aad.length) * 8n);
		const mac = crypto
			.createHmac(spec.hash, cek.subarray(0, half))
			.update(Buffer.concat([aad, iv, ciphertext, al]))
			.digest();
		tag = mac.subarray(0, half);
	}
	const encryptedKey = crypto.publicEncrypt(
		{ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
		cek,
	);
	return [header, b64u(encryptedKey), b64u(iv), b64u(ciphertext), b64u(tag)].join('.');
}

module.exports = { makeKeys, encryptJwe, ENC };
