/**
 * Testes da fatia S10: correções dos achados do Verifier (F1 a F14 e F23).
 * Cada teste reproduz um defeito que os 91 primeiros checks deixaram passar.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { RdStationConversas, makeContext, run } = require('./helpers.cjs');
const { encryptJwe, makeKeys } = require('./jwe-helper.cjs');
const { RdStationConversasApi } = require('../dist/credentials/RdStationConversasApi.credentials');

const BASE = 'https://api.tallos.com.br';
const node = new RdStationConversas();

// Recusa esperada: mensagem exata, nenhuma requisição enviada.
async function refused(params, message, extra = {}) {
	const context = makeContext({ params, ...extra });
	await assert.rejects(run(context), (error) => {
		assert.equal(error.message, message);
		return true;
	});
	assert.equal(context.requests.length, 0);
}

describe('S10 hardening', () => {
	it('C92: the history Options collection has no displayOptions inside it and Country Code lives in its own collection', async () => {
		const collections = node.description.properties.filter((p) => p.type === 'collection');
		for (const collection of collections) {
			for (const option of collection.options) {
				assert.equal(option.displayOptions, undefined, `${collection.name}.${option.name}`);
			}
		}
		const templateOptions = node.description.properties.find((p) => p.name === 'templateOptions');
		assert.deepEqual(
			templateOptions.options.map((o) => o.name),
			['countryCode'],
		);
		const context = makeContext({
			params: {
				resource: 'message',
				operation: 'sendTemplate',
				phone: '5511999998888',
				template: { mode: 'id', value: 't' },
				templateOptions: { countryCode: '1' },
			},
		});
		await run(context);
		assert.equal(context.requests[0].body.country_code, '1');
	});

	it('C93: Limit 1 asks the API for at least 2 per page and still returns one item', async () => {
		const cases = [
			[{ resource: 'contact', operation: 'getAll' }, () => [{ _id: 'a' }, { _id: 'b' }]],
			[
				{ resource: 'campaign', operation: 'getAll' },
				() => ({ campaigns: [{ id: 'a' }, { id: 'b' }], has_more: false }),
			],
		];
		for (const [params, responder] of cases) {
			const context = makeContext({ params: { ...params, returnAll: false, limit: 1 }, responder });
			const out = await run(context);
			assert.ok(context.requests[0].qs.limit >= 2, params.resource);
			assert.equal(out.length, 1);
		}
	});

	it('C94: IDs are URL-encoded before they enter a route', async () => {
		const context = makeContext({
			params: {
				resource: 'employee',
				operation: 'deactivate',
				employee: { mode: 'id', value: '../flows?x=' },
			},
		});
		await run(context);
		assert.equal(context.requests[0].url, `${BASE}/v2/employees/..%2Fflows%3Fx%3D/deactivate`);
	});

	it('C95: a phone with letters or an extension is refused', async () => {
		for (const phone of ['55 11 abc 99999-8888', '(11) 99999-8888 ext 2']) {
			await refused(
				{ resource: 'contact', operation: 'getByPhone', phone },
				"The 'Phone' parameter is invalid [item 0]",
			);
		}
	});

	it('C96: create and update refuse an empty name or integration', async () => {
		const base = { resource: 'contact', phone: '5511999998888', fullName: 'Ana', integration: 'i' };
		for (const operation of ['create', 'update']) {
			await refused(
				{ ...base, operation, fullName: '' },
				"The 'Full Name' parameter is empty [item 0]",
			);
			await refused(
				{ ...base, operation, integration: '' },
				"The 'Integration' parameter is empty [item 0]",
			);
		}
	});

	it('C97: a CPF without 11 digits is refused', async () => {
		for (const cpf of ['', 'abc', '123.456']) {
			await refused(
				{ resource: 'contact', operation: 'getByCpf', cpf },
				"The 'CPF' parameter is invalid [item 0]",
			);
		}
	});

	it('C98: Update and Update by Phone show only their own extra fields', () => {
		const forOperation = (operation) =>
			node.description.properties
				.find(
					(p) =>
						p.name === 'additionalFields' &&
						p.displayOptions.show.resource[0] === 'contact' &&
						p.displayOptions.show.operation.includes(operation),
				)
				.options.map((o) => o.name);
		assert.equal(forOperation('update').includes('customFields'), false);
		assert.equal(forOperation('update').includes('secondaryPhone0'), true);
		assert.equal(forOperation('updateByPhone').includes('secondaryPhone0'), false);
		assert.equal(forOperation('updateByPhone').includes('customFields'), true);
	});

	it('C99: an invalid Address JSON is refused with the guided message', async () => {
		await refused(
			{
				resource: 'contact',
				operation: 'create',
				phone: '5511999998888',
				fullName: 'A',
				integration: 'i',
				additionalFields: { address: 'not json' },
			},
			"The 'Address (JSON)' parameter is invalid [item 0]",
		);
	});

	it('C100: analytics drops empty id lists and refuses an empty date', async () => {
		const params = {
			resource: 'analytics',
			operation: 'getAttendanceSummary',
			startDate: '2026-10-01T00:00:00.000Z',
			endDate: '2026-10-31T00:00:00.000Z',
			options: { departmentIds: [], employeeIds: [] },
		};
		const context = makeContext({ params });
		await run(context);
		assert.equal('department_ids' in context.requests[0].qs, false);
		assert.equal('employee_ids' in context.requests[0].qs, false);
		await refused({ ...params, startDate: '' }, "The 'Start Date' parameter is empty [item 0]");
	});

	it('C101: a tampered or truncated JWE is refused for GCM and CBC', async () => {
		const { publicKey, privateJwk } = makeKeys();
		const credentials = { apiToken: 't', privateKeyJwk: JSON.stringify(privateJwk) };
		const params = {
			resource: 'message',
			operation: 'getHistory',
			contact: { mode: 'id', value: 'c' },
			returnAll: false,
			limit: 100,
		};
		const tamper = {
			'GCM tag cut to 4 bytes': (parts) => {
				parts[4] = Buffer.from(parts[4], 'base64url').subarray(0, 4).toString('base64url');
			},
			'GCM ciphertext changed': (parts) => {
				const b = Buffer.from(parts[3], 'base64url');
				b[0] ^= 1;
				parts[3] = b.toString('base64url');
			},
			'CBC tag changed': (parts) => {
				const b = Buffer.from(parts[4], 'base64url');
				b[0] ^= 1;
				parts[4] = b.toString('base64url');
			},
		};
		for (const [label, change] of Object.entries(tamper)) {
			const enc = label.startsWith('CBC') ? 'A128CBC-HS256' : 'A128GCM';
			const parts = encryptJwe([{ content: 'oi' }], publicKey, enc).split('.');
			change(parts);
			const context = makeContext({
				params,
				credentials,
				responder: () => ({ messages: parts.join('.') }),
			});
			await assert.rejects(run(context), /could not be decrypted/, label);
		}
	});

	it('C102: the credential test carries timeout 30000', () => {
		assert.equal(new RdStationConversasApi().test.request.timeout, 30000);
	});

	it('C103: an operation named like an object property is not available', async () => {
		for (const operation of ['toString', 'constructor', '__proto__']) {
			const context = makeContext({ params: { resource: 'contact', operation } });
			await assert.rejects(run(context), /is not available/, operation);
		}
	});

	it('C104: history asks for pages of 100 whatever the Limit and returns at most Limit', async () => {
		const { publicKey, privateJwk } = makeKeys();
		const many = Array.from({ length: 100 }, (_, n) => ({ content: String(n) }));
		const context = makeContext({
			params: {
				resource: 'message',
				operation: 'getHistory',
				contact: { mode: 'id', value: 'c' },
				returnAll: false,
				limit: 50,
			},
			credentials: { apiToken: 't', privateKeyJwk: JSON.stringify(privateJwk) },
			responder: () => ({ messages: encryptJwe(many, publicKey, 'A128GCM') }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].qs.limit, 100);
		assert.equal(out.length, 50);
	});

	it('C105: bulk operations refuse an empty list before any request', async () => {
		await refused(
			{ resource: 'employee', operation: 'deactivateMany', employeeIds: [] },
			"The 'Employees' parameter is empty [item 0]",
		);
		await refused(
			{ resource: 'employee', operation: 'createMany', employees: { items: [] } },
			"The 'Employees' parameter is empty [item 0]",
		);
		await refused(
			{ resource: 'contact', operation: 'createMany', contacts: { items: [] } },
			"The 'Contacts' parameter is empty [item 0]",
		);
	});

	it('C106: send refuses a message with no text and no attachment', async () => {
		await refused(
			{
				resource: 'message',
				operation: 'send',
				contact: { mode: 'id', value: 'c' },
				message: '   ',
			},
			"The 'Message' parameter is empty [item 0]",
		);
	});
});
