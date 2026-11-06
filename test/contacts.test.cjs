/**
 * Testes da fatia S3: contatos e campos personalizados.
 * Cada teste chama o `execute` do node com um contexto falso e confere a requisição gravada.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { makeContext, run } = require('./helpers.cjs');

const BASE = 'https://api.tallos.com.br';

// Cria uma lista de contatos falsos com ids únicos para as páginas.
const contacts = (count, start = 0) =>
	Array.from({ length: count }, (_, n) => ({
		_id: `c${start + n}`,
		full_name: `Contato ${start + n}`,
	}));

describe('S3 contacts', () => {
	it('C15: getByPhone normalises the phone and defaults the channel to whatsapp', async () => {
		const context = makeContext({
			params: { resource: 'contact', operation: 'getByPhone', phone: '+55 (11) 99999-8888' },
			responder: () => ({ data: { _id: 'c1' }, message: 'ok' }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].method, 'GET');
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/5511999998888/exists`);
		assert.equal(context.requests[0].qs.channel, 'whatsapp');
		assert.equal(context.requests[0].credentialType, 'rdStationConversasApi');
		assert.deepEqual(out, [{ data: { _id: 'c1' }, message: 'ok' }]);
	});

	it('C16: getByCpf keeps only the digits of the CPF', async () => {
		const context = makeContext({
			params: { resource: 'contact', operation: 'getByCpf', cpf: '123.456.789-09' },
		});
		await run(context);
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/cpf/12345678909/exists`);
	});

	it('C17: an invalid phone is refused before any request', async () => {
		const cases = [
			['5511999998888', '5511999998888'],
			['11999', null],
			['+55 11 99999-8888', '5511999998888'],
			['', null],
		];
		for (const [typed, digits] of cases) {
			const context = makeContext({
				params: { resource: 'contact', operation: 'getByPhone', phone: typed },
			});
			if (digits) {
				await run(context);
				assert.match(context.requests[0].url, new RegExp(`/${digits}/exists$`));
			} else {
				await assert.rejects(run(context), (error) => {
					assert.equal(error.message, "The 'Phone' parameter is invalid [item 0]");
					assert.equal(
						error.description,
						'Use the international format with country code, digits only, e.g. 5511999998888',
					);
					return true;
				});
				assert.equal(context.requests.length, 0);
			}
		}
	});

	it('C18: getAll with Return All walks pages of 100, 100 and 37 and returns 237 items', async () => {
		const sizes = [100, 100, 37];
		const context = makeContext({
			params: { resource: 'contact', operation: 'getAll', returnAll: true },
			responder: (options) => contacts(sizes[options.qs.page - 1], (options.qs.page - 1) * 100),
		});
		const out = await run(context);
		assert.deepEqual(
			context.requests.map((request) => request.qs.page),
			[1, 2, 3],
		);
		assert.equal(context.requests[0].url, `${BASE}/v2/customers`);
		assert.equal(context.requests[0].qs.limit, 100);
		assert.equal(out.length, 237);
	});

	it('C19: getAll with Limit 150 stops after 150 items', async () => {
		const context = makeContext({
			params: { resource: 'contact', operation: 'getAll', returnAll: false, limit: 150 },
			responder: (options) => contacts(100, (options.qs.page - 1) * 100),
		});
		const out = await run(context);
		assert.equal(out.length, 150);
		assert.equal(context.requests.length, 2);
	});

	it('C20: create posts the required fields and only the filled additional fields', async () => {
		const context = makeContext({
			params: {
				resource: 'contact',
				operation: 'create',
				phone: '+55 11 99999-8888',
				fullName: 'Ana Souza',
				integration: 'integration-1',
				additionalFields: { email: 'ana@example.com', tags: 'vip, novo' },
			},
			responder: () => ({ data: { _id: 'c1' }, message: 'ok' }),
		});
		await run(context);
		assert.equal(context.requests[0].method, 'POST');
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/whatsapp-business-by-brokers`);
		assert.deepEqual(context.requests[0].body, {
			cel_phone: '5511999998888',
			full_name: 'Ana Souza',
			integration: 'integration-1',
			email: 'ana@example.com',
			tags: ['vip', 'novo'],
		});
	});

	it('C21: a workflow stage without a workflow is refused', async () => {
		const context = makeContext({
			params: {
				resource: 'contact',
				operation: 'create',
				phone: '5511999998888',
				fullName: 'Ana',
				integration: 'integration-1',
				additionalFields: { workflowStage: 'Negociação' },
			},
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(error.message, "The 'Workflow' parameter is empty [item 0]");
			assert.equal(error.description, 'Choose a workflow before choosing its stage');
			return true;
		});
		assert.equal(context.requests.length, 0);
	});

	it('C22: update puts phone, name and integration to the broker route', async () => {
		const context = makeContext({
			params: {
				resource: 'contact',
				operation: 'update',
				phone: '5511999998888',
				fullName: 'Ana Souza',
				integration: 'integration-1',
			},
		});
		await run(context);
		assert.equal(context.requests[0].method, 'PUT');
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/whatsapp-business-by-brokers`);
		assert.deepEqual(context.requests[0].body, {
			cel_phone: '5511999998888',
			full_name: 'Ana Souza',
			integration: 'integration-1',
		});
	});

	it('C23: updateByPhone patches the phone route and returns customerId', async () => {
		const context = makeContext({
			params: {
				resource: 'contact',
				operation: 'updateByPhone',
				phone: '5511999998888',
				fullName: 'Ana',
			},
			responder: () => ({ customerId: 'abc' }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].method, 'PATCH');
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/5511999998888`);
		assert.deepEqual(out, [{ customerId: 'abc' }]);
	});

	it('C24: createMany posts three contacts and returns the job', async () => {
		const context = makeContext({
			params: {
				resource: 'contact',
				operation: 'createMany',
				contacts: {
					items: [
						{ phone: '5511999990001', fullName: 'A' },
						{ phone: '5511999990002', fullName: 'B' },
						{ phone: '5511999990003', fullName: 'C' },
					],
				},
			},
			responder: () => ({ job: { id: 'j1', status: 'awaiting' } }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].url, `${BASE}/v2/contacts/bulk`);
		assert.equal(context.requests[0].body.contacts.length, 3);
		assert.deepEqual(context.requests[0].body.contacts[0], {
			cel_phone: '5511999990001',
			full_name: 'A',
		});
		assert.deepEqual(out, [{ id: 'j1', status: 'awaiting' }]);
	});
});

describe('S3 custom fields', () => {
	it('C25: create posts label and info', async () => {
		const context = makeContext({
			params: {
				resource: 'customField',
				operation: 'create',
				label: 'Plano',
				info: 'Plano contratado',
			},
			responder: () => ({ id: 'cf1', info: 'Plano contratado', key: 'plano', label: 'Plano' }),
		});
		const out = await run(context);
		assert.equal(context.requests[0].url, `${BASE}/v2/custom-fields`);
		assert.deepEqual(context.requests[0].body, { label: 'Plano', info: 'Plano contratado' });
		assert.equal(out[0].key, 'plano');
	});

	it('C26: update sends only info and the screen has no label field for it', async () => {
		const context = makeContext({
			params: {
				resource: 'customField',
				operation: 'update',
				customField: { mode: 'id', value: 'cf1' },
				info: 'Novo texto',
			},
		});
		await run(context);
		assert.equal(context.requests[0].method, 'PUT');
		assert.equal(context.requests[0].url, `${BASE}/v2/custom-fields/cf1`);
		assert.deepEqual(context.requests[0].body, { info: 'Novo texto' });
		const { RdStationConversas } = require('./helpers.cjs');
		const labelShownOnUpdate = new RdStationConversas().description.properties.some(
			(property) =>
				property.name === 'label' &&
				property.displayOptions?.show?.resource?.includes('customField') &&
				property.displayOptions?.show?.operation?.includes('update'),
		);
		assert.equal(labelShownOnUpdate, false);
	});

	it('C27: delete with an empty 204 answer returns deleted true', async () => {
		const context = makeContext({
			params: {
				resource: 'customField',
				operation: 'delete',
				customField: { mode: 'id', value: 'cf1' },
			},
			responder: () => '',
		});
		const out = await run(context);
		assert.equal(context.requests[0].method, 'DELETE');
		assert.equal(context.requests[0].url, `${BASE}/v2/custom-fields/cf1`);
		assert.deepEqual(out, [{ deleted: true }]);
	});

	it('C28: getAll sends page, limit and label and stops at the total', async () => {
		const context = makeContext({
			params: {
				resource: 'customField',
				operation: 'getAll',
				returnAll: true,
				options: { label: 'pla' },
			},
			responder: (options) => ({
				data: Array.from({ length: options.qs.page < 3 ? 100 : 50 }, (_, n) => ({ id: `f${n}` })),
				limit: 100,
				page: options.qs.page,
				total: 250,
			}),
		});
		const out = await run(context);
		assert.deepEqual(
			context.requests.map((request) => request.qs.page),
			[1, 2, 3],
		);
		assert.equal(context.requests[0].qs.label, 'pla');
		assert.equal(context.requests[0].qs.limit, 100);
		assert.equal(out.length, 250);
	});
});
