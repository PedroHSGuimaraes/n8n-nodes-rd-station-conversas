/**
 * Testes da fatia S4: envio de mensagem, envio de template e histórico decriptado.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { RdStationConversas, makeContext, run } = require('./helpers.cjs');
const { ENC, encryptJwe, makeKeys } = require('./jwe-helper.cjs');

const BASE = 'https://api.tallos.com.br';
const PHONE = '5511999998888';

describe('S4 send message', () => {
	it('C29: send by phone resolves the contact then posts urlencoded text', async () => {
		const context = makeContext({
			params: {
				resource: 'message',
				operation: 'send',
				contact: { mode: 'phone', value: PHONE },
				message: 'Olá',
				sentBy: 'bot',
			},
			responder: (_options, n) => (n === 0 ? { data: { _id: 'c9' } } : { message: 'sent' }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/${PHONE}/exists`);
		assert.equal(context.requests[1].method, 'POST');
		assert.equal(context.requests[1].url, `${BASE}/v2/messages/c9/send`);
		assert.equal(context.requests[1].body.toString(), 'message=Ol%C3%A1&sent_by=bot');
		assert.deepEqual(out, [{ message: 'sent' }]);
	});

	it('C30: sending as operator without an employee is refused before any request', async () => {
		const context = makeContext({
			params: {
				resource: 'message',
				operation: 'send',
				contact: { mode: 'phone', value: PHONE },
				message: 'Oi',
				sentBy: 'operator',
				employee: { mode: 'list', value: '' },
			},
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(error.message, "The 'Employee' parameter is empty [item 0]");
			assert.equal(
				error.description,
				'Choose the employee who sends the message, or use Sent By: Bot',
			);
			return true;
		});
		assert.equal(context.requests.length, 0);
	});

	it('C31: a binary in attach turns the body into multipart', async () => {
		const context = makeContext({
			params: {
				resource: 'message',
				operation: 'send',
				contact: { mode: 'id', value: 'c9' },
				message: 'Veja',
				sentBy: 'bot',
				attachBinaryProperty: 'attach',
			},
			binary: { attach: { buffer: Buffer.from('png'), fileName: 'a.png', mimeType: 'image/png' } },
			responder: () => ({ message: 'sent' }),
		});
		await run(context);
		const body = context.requests[0].body;
		assert.ok(body instanceof FormData);
		assert.equal(body.get('message'), 'Veja');
		assert.equal(body.get('sent_by'), 'bot');
		assert.equal(body.get('attach').name, 'a.png');
	});
});

describe('S4 send template', () => {
	const templateParams = {
		resource: 'message',
		operation: 'sendTemplate',
		phone: PHONE,
		template: { mode: 'id', value: 'abc123' },
		variables: { items: [{ value: 'Ana' }, { value: '12/11' }] },
	};

	it('C32: sendTemplate posts recipient, template, variables and defaults', async () => {
		const context = makeContext({
			params: templateParams,
			responder: () => ({ data: {}, message: 'ok' }),
		});
		await run(context);
		assert.equal(context.requests[0].method, 'POST');
		assert.equal(context.requests[0].url, `${BASE}/v3/messages/template/send`);
		assert.deepEqual(context.requests[0].body, {
			recipient_number: PHONE,
			template_message_id: 'abc123',
			variables: ['Ana', '12/11'],
			country_code: '55',
			sent_by: 'bot',
		});
	});

	it('C33: operator without an employee is refused with the guided description', async () => {
		const context = makeContext({ params: { ...templateParams, sentBy: 'operator' } });
		await assert.rejects(run(context), (error) => {
			assert.equal(error.message, "The 'Employee' parameter is empty [item 0]");
			assert.equal(error.description, 'Choose an employee, or use Sent By: Bot');
			return true;
		});
		assert.equal(context.requests.length, 0);
	});

	it('C34: the 201 answer returns data and message and the description warns about delivery', async () => {
		const context = makeContext({
			params: templateParams,
			responder: () => ({ data: { id: 'm1' }, message: 'Created', extra: 1 }),
		});
		const out = await run(context);
		assert.deepEqual(out, [{ data: { id: 'm1' }, message: 'Created' }]);
		const operation = new RdStationConversas().description.properties
			.find(
				(property) =>
					property.name === 'operation' && property.displayOptions.show.resource[0] === 'message',
			)
			.options.find((option) => option.value === 'sendTemplate');
		assert.match(operation.description, /201/);
		assert.match(operation.description, /does not guarantee delivery/);
	});

	it('C35: a 404 with code 301 names the phone', async () => {
		const context = makeContext({
			params: templateParams,
			responder: () => {
				throw { httpCode: '404', context: { data: { code: 301, message: 'not found' } } };
			},
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(error.name, 'NodeApiError');
			assert.match(error.message, new RegExp(PHONE));
			assert.match(error.description, /no contact with this number/i);
			return true;
		});
	});
});

describe('S4 message history', () => {
	const { publicKey, privateJwk } = makeKeys();
	const credentials = { apiToken: 'tok', privateKeyJwk: JSON.stringify(privateJwk) };
	const messages = [{ content: 'oi', sent_by: 'customer' }];
	const historyParams = {
		resource: 'message',
		operation: 'getHistory',
		contact: { mode: 'id', value: 'c1' },
		returnAll: false,
		limit: 100,
	};

	it('C36: getHistory asks the route, decrypts messages and returns one item each', async () => {
		const context = makeContext({
			params: historyParams,
			credentials,
			responder: () => ({ messages: encryptJwe(messages, publicKey, 'A256GCM') }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].method, 'GET');
		assert.equal(context.requests[0].url, `${BASE}/v2/messages/history`);
		assert.equal(context.requests[0].qs.customer_id, 'c1');
		assert.equal(context.requests[0].qs.limit, 100);
		assert.equal(context.requests[0].qs.page, 1);
		assert.deepEqual(out, messages);
	});

	it('C37: RSA-OAEP-256 with A256GCM decrypts a message made in the test', async () => {
		const sample = [{ content: 'oi', sent_by: 'customer' }];
		const context = makeContext({
			params: historyParams,
			credentials,
			responder: () => ({ messages: encryptJwe(sample, publicKey, 'A256GCM') }),
		});
		assert.deepEqual(await run(context), [{ content: 'oi', sent_by: 'customer' }]);
	});

	it('C38: all six enc values decrypt and an unknown enc fails like C40', async () => {
		for (const enc of Object.keys(ENC)) {
			const context = makeContext({
				params: historyParams,
				credentials,
				responder: () => ({ messages: encryptJwe(messages, publicKey, enc) }),
			});
			assert.deepEqual(await run(context), messages, enc);
		}
		const jwe = encryptJwe(messages, publicKey, 'A128GCM').split('.');
		jwe[0] = Buffer.from(JSON.stringify({ alg: 'RSA-OAEP-256', enc: 'A999GCM' })).toString(
			'base64url',
		);
		const context = makeContext({
			params: historyParams,
			credentials,
			responder: () => ({ messages: jwe.join('.') }),
		});
		await assert.rejects(run(context), /could not be decrypted/);
	});

	it('C39: history without the private key is refused before any request', async () => {
		const context = makeContext({ params: historyParams, credentials: { apiToken: 'tok' } });
		await assert.rejects(run(context), (error) => {
			assert.equal(error.message, "The credential 'Private Key (JWK)' is empty [item 0]");
			assert.equal(
				error.description,
				'Generate the key in RD Station Conversas: Apps and Integrations, API, Generate Key, then paste the JWK JSON in the credential',
			);
			return true;
		});
		assert.equal(context.requests.length, 0);
	});

	it('C40: a message encrypted for another account fails with the enc in the description', async () => {
		const other = makeKeys();
		const context = makeContext({
			params: historyParams,
			credentials,
			responder: () => ({ messages: encryptJwe(messages, other.publicKey, 'A128CBC-HS256') }),
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(error.message, 'The messages could not be decrypted [item 0]');
			assert.match(error.description, /A128CBC-HS256/);
			assert.match(error.description, /same account/);
			return true;
		});
	});

	it('C41: dates go as YYYY-MM-DD and filters are arrays with the documented defaults', async () => {
		const context = makeContext({
			params: {
				...historyParams,
				options: { startDate: '2026-10-01T00:00:00', endDate: '2026-10-31T23:59:59' },
			},
			credentials,
			responder: () => ({ messages: encryptJwe(messages, publicKey, 'A128GCM') }),
		});
		await run(context);
		const { qs } = context.requests[0];
		assert.equal(qs.start_date, '2026-10-01');
		assert.equal(qs.end_date, '2026-10-31');
		assert.deepEqual(qs.channel, ['whatsapp']);
		assert.deepEqual(qs.sent_by, ['customer', 'operator']);
		assert.deepEqual(qs.type, ['text']);
	});

	it('C42: a 403 on history explains the plan requirement', async () => {
		const context = makeContext({
			params: historyParams,
			credentials,
			responder: () => {
				throw { httpCode: '403', context: { data: { message: 'Forbidden' } } };
			},
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(error.name, 'NodeApiError');
			assert.equal(error.description, 'Message history needs the Pro or Advanced plan');
			return true;
		});
	});
});
