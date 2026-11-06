/**
 * Decriptação do JWE compacto que a API devolve no histórico de mensagens.
 *
 * Usa só `node:crypto`, sem `jose` nem `node-jose`: community node verificado não pode
 * ter dependência de runtime (AD-009). O formato segue a RFC 7516 (5 partes separadas por
 * ponto) e os algoritmos seguem a RFC 7518: RSA-OAEP-256 para abrir a chave de conteúdo e
 * AES-GCM ou AES-CBC com HMAC para abrir o texto.
 */
import {
	constants,
	createDecipheriv,
	createHmac,
	createPrivateKey,
	privateDecrypt,
	timingSafeEqual,
} from 'node:crypto';

// Resultado da decriptação: em vez de lançar erro (o lint do n8n só aceita erros do n8n),
// devolvemos o motivo e o `enc` lido do cabeçalho, para a mensagem ao usuário citá-lo.
export type JweResult = { ok: true; value: unknown } | { ok: false; enc: string; reason: string };

const failure = (enc: string, reason: string): JweResult => ({ ok: false, enc, reason });

// Parâmetros de cada `enc` aceito: bits da chave AES e, nos modos CBC, o hash do HMAC.
const ENC_SPECS: Record<string, { gcm: boolean; bits: number; hash?: string }> = {
	A128GCM: { gcm: true, bits: 128 },
	A192GCM: { gcm: true, bits: 192 },
	A256GCM: { gcm: true, bits: 256 },
	'A128CBC-HS256': { gcm: false, bits: 128, hash: 'sha256' },
	'A192CBC-HS384': { gcm: false, bits: 192, hash: 'sha384' },
	'A256CBC-HS512': { gcm: false, bits: 256, hash: 'sha512' },
};

// Decodifica o texto aberto. O node-jose grava uma string passada ao `update` como latin1
// (exemplo oficial conversas-v2-encryption), e UTF-8 puro leria "á" como "�". Tentamos UTF-8
// estrito primeiro; se os bytes não forem UTF-8 válido, caímos para latin1. Qual dos dois a API
// usa de verdade fica para o teste com conta real (AD-015).
function decodeText(bytes: Buffer): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return bytes.toString('latin1');
	}
}

// Lê uma parte base64url do JWE como bytes.
const part = (value: string): Buffer => Buffer.from(value, 'base64url');

/**
 * Abre o JWE e devolve o JSON do texto. Devolve `ok: false` se a chave não serve,
 * o `enc` é desconhecido ou o conteúdo foi alterado (a tag de autenticação não confere).
 */
export function decryptJwe(compact: string, jwk: Record<string, unknown>): JweResult {
	const parts = compact.split('.');
	if (parts.length !== 5) return failure('', 'The value is not a compact JWE');

	let header: { alg?: string; enc?: string; zip?: string };
	try {
		header = JSON.parse(part(parts[0]).toString('utf8')) as typeof header;
	} catch {
		return failure('', 'The JWE header is not valid');
	}
	const enc = header.enc ?? '';
	const spec = ENC_SPECS[enc];
	if (!spec) return failure(enc, `Unsupported enc '${enc}'`);
	if (header.zip) return failure(enc, `Unsupported compression '${header.zip}'`);

	// RSA-OAEP-256 usa SHA-256; RSA-OAEP (sem 256) usa SHA-1.
	const oaepHash = header.alg === 'RSA-OAEP' ? 'sha1' : 'sha256';
	if (header.alg !== 'RSA-OAEP' && header.alg !== 'RSA-OAEP-256') {
		return failure(enc, `Unsupported alg '${String(header.alg)}'`);
	}

	try {
		const key = createPrivateKey({ key: jwk as never, format: 'jwk' });
		// Primeiro abre a chave de conteúdo (CEK) com a chave privada RSA da conta.
		const cek = privateDecrypt(
			{ key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash },
			part(parts[1]),
		);
		const iv = part(parts[2]);
		const ciphertext = part(parts[3]);
		const tag = part(parts[4]);
		// O cabeçalho em base64url, exatamente como veio, é o dado autenticado (AAD).
		const aad = Buffer.from(parts[0], 'ascii');

		let plaintext: Buffer;
		if (spec.gcm) {
			// O cast só informa ao TypeScript que o modo é GCM (tem tag e AAD); o nome real vem do `enc`.
			const decipher = createDecipheriv(`aes-${spec.bits}-gcm` as 'aes-256-gcm', cek, iv, {
				authTagLength: 16,
			});
			// Tag GCM tem sempre 16 bytes: uma tag curta enfraquece a autenticação e é recusada.
			if (tag.length !== 16) throw new Error('invalid authentication tag length');
			decipher.setAAD(aad);
			decipher.setAuthTag(tag);
			plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		} else {
			// CBC-HS: a CEK é MAC_KEY seguida de ENC_KEY, metade para cada uma.
			const half = cek.length / 2;
			const al = Buffer.alloc(8);
			al.writeBigUInt64BE(BigInt(aad.length) * 8n);
			const expected = createHmac(spec.hash as string, cek.subarray(0, half))
				.update(Buffer.concat([aad, iv, ciphertext, al]))
				.digest()
				.subarray(0, half);
			// Comparação em tempo constante: não revela quantos bytes da tag estavam certos.
			if (tag.length !== expected.length || !timingSafeEqual(tag, expected)) {
				throw new Error('authentication failed'); // cai no catch abaixo e vira `ok: false`
			}
			const decipher = createDecipheriv(`aes-${spec.bits}-cbc`, cek.subarray(half), iv);
			plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		}
		return { ok: true, value: JSON.parse(decodeText(plaintext)) as unknown };
	} catch (error) {
		return failure(enc, (error as Error).message);
	}
}
