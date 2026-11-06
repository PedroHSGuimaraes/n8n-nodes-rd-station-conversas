/**
 * Achado F1 da the-judge: o texto aberto do JWE pode vir em UTF-8 ou em latin1
 * (o node-jose grava uma string passada ao `update` como latin1). Os dois precisam voltar com "á".
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { makeContext, run } = require('./helpers.cjs');
const { encryptJwe, makeKeys } = require('./jwe-helper.cjs');

describe('F1 JWE text encoding', () => {
	const { publicKey, privateJwk } = makeKeys();
	const credentials = { apiToken: 't', privateKeyJwk: JSON.stringify(privateJwk) };
	const params = {
		resource: 'message',
		operation: 'getHistory',
		contact: { mode: 'id', value: 'c' },
		returnAll: false,
		limit: 100,
	};

	// Texto latin1 que contém um par que também é UTF-8 válido ("Ã©") seguido de byte solto: só o byte solto
	// denuncia o latin1, e o resultado precisa voltar intacto.
	it('C116: latin1 text with a UTF-8-looking pair and a stray byte decrypts intact', async () => {
		const context = makeContext({
			params,
			credentials,
			responder: () => ({
				messages: encryptJwe([{ content: 'Ã©á' }], publicKey, 'A128GCM', 'latin1'),
			}),
		});
		assert.deepEqual(await run(context), [{ content: 'Ã©á' }]);
	});

	for (const [label, encoding] of [
		['C110: UTF-8 bytes', 'utf8'],
		['C111: latin1 bytes (node-jose string path)', 'latin1'],
	]) {
		it(`${label} decrypt to the same accented text`, async () => {
			const context = makeContext({
				params,
				credentials,
				responder: () => ({
					messages: encryptJwe([{ content: 'olá, ação' }], publicKey, 'A128GCM', encoding),
				}),
			});
			assert.deepEqual(await run(context), [{ content: 'olá, ação' }]);
		});
	}
});
