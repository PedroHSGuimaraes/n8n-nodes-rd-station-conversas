/**
 * Testes das fatias S5, S6 e S7: operações em massa, atendentes, fluxos, workflows, jobs,
 * templates, carteiras, integrações, relatórios, analytics e campanhas.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { RdStationConversas, makeContext, run } = require('./helpers.cjs');

const BASE = 'https://api.tallos.com.br';

// Descrição de uma operação, lida da tela do node (para os testes de aviso).
const operationOption = (resource, operation) =>
	new RdStationConversas().description.properties
		.find((p) => p.name === 'operation' && p.displayOptions?.show?.resource?.[0] === resource)
		.options.find((option) => option.value === operation);

// Roda uma operação e devolve o contexto (requisições gravadas) e os itens de saída.
async function exec(params, responder) {
	const context = makeContext({ params, responder });
	const out = await run(context);
	return { context, out, request: context.requests[0] };
}

describe('S5 bulk and irreversible operations', () => {
	it('C43: deleteManyByTag sends exactly tag_name and returns contacts_count', async () => {
		const { request, out } = await exec(
			{ resource: 'contact', operation: 'deleteManyByTag', tag: 'lead-frio' },
			() => ({ contacts_count: 7 }),
		);
		assert.equal(request.method, 'DELETE');
		assert.equal(request.url, `${BASE}/v2/contacts`);
		assert.deepEqual(request.body, { tag_name: 'lead-frio' });
		assert.deepEqual(out, [{ contacts_count: 7 }]);
	});

	it('C44: deleteManyByIntegration sends exactly integration', async () => {
		const { request } = await exec({
			resource: 'contact',
			operation: 'deleteManyByIntegration',
			integration: 'integration-1',
		});
		assert.deepEqual(request.body, { integration: 'integration-1' });
	});

	it('C45: an empty or blank tag is refused and $all travels only as a tag value', async () => {
		for (const tag of ['', '   ']) {
			const context = makeContext({
				params: { resource: 'contact', operation: 'deleteManyByTag', tag },
			});
			await assert.rejects(run(context), (error) => {
				assert.equal(error.message, "The 'Tag' parameter is empty [item 0]");
				assert.equal(error.description, 'Enter the tag whose contacts you want to delete');
				return true;
			});
			assert.equal(context.requests.length, 0);
		}
		const { request } = await exec({
			resource: 'contact',
			operation: 'deleteManyByTag',
			tag: '$all',
		});
		assert.deepEqual(request.body, { tag_name: '$all' });
		assert.equal(Object.keys(request.body).includes('$all'), false);
	});

	// Procura a chave `$all` em qualquer nível do corpo (objetos e listas).
	const hasAllKey = (value) => {
		if (Array.isArray(value)) return value.some(hasAllKey);
		if (
			value &&
			typeof value === 'object' &&
			!(value instanceof URLSearchParams) &&
			!(value instanceof FormData)
		) {
			return Object.keys(value).includes('$all') || Object.values(value).some(hasAllKey);
		}
		return false;
	};

	it('C46: no operation ever sends a $all key, whatever the inputs are', async () => {
		const node = new RdStationConversas();
		const pairs = [];
		for (const property of node.description.properties.filter((p) => p.name === 'operation')) {
			for (const option of property.options) {
				pairs.push([property.displayOptions.show.resource[0], option.value]);
			}
		}
		assert.equal(pairs.length, 42);
		let checked = 0;
		for (const [resource, operation] of pairs) {
			for (const input of ['', null, '$all']) {
				const context = makeContext({
					params: (name) => ({ resource, operation }),
					responder: () => ({}),
				});
				// Todos os parâmetros (menos recurso e operação) recebem a entrada hostil.
				context.getNodeParameter = (name) =>
					name === 'resource' ? resource : name === 'operation' ? operation : input;
				context.getCredentials = async () => ({ apiToken: 'tok', privateKeyJwk: input });
				try {
					await new RdStationConversas().execute.call(context);
				} catch {
					// Recusar a entrada é aceitável; o que não pode é enviar `$all`.
				}
				for (const request of context.requests) {
					assert.equal(hasAllKey(request.body), false, `${resource}.${operation} sent $all`);
				}
				checked += 1;
			}
		}
		assert.equal(checked, 126);
	});

	it('C47: the contact operations have no delete-all operation or Delete All field', () => {
		const node = new RdStationConversas();
		const contactOperations = node.description.properties
			.find((p) => p.name === 'operation' && p.displayOptions.show.resource[0] === 'contact')
			.options.map((option) => option.value);
		// Nenhuma operação de exclusão pode apagar "tudo": só por tag ou por integração.
		const deletions = contactOperations.filter((value) => /delete/i.test(value));
		assert.deepEqual(deletions.sort(), ['deleteManyByIntegration', 'deleteManyByTag']);
		const names = JSON.stringify(node.description.properties);
		assert.equal(/Delete All/i.test(names), false);
		assert.equal(/"\$all"/.test(names), false);
	});

	it('C48: both delete-many descriptions start with the permanent-deletion warning', () => {
		for (const [operation, filter] of [
			['deleteManyByTag', /tag/],
			['deleteManyByIntegration', /integration/],
		]) {
			const { description } = operationOption('contact', operation);
			assert.ok(description.startsWith('Warning: permanently deletes'), operation);
			assert.match(description, /cannot be undone/);
			assert.match(description, /every contact/);
			assert.match(description, filter);
		}
	});

	it('C49: resetAllContactsFlow confirmed posts without a body and returns message', async () => {
		const { request, out } = await exec(
			{ resource: 'flow', operation: 'resetAllContactsFlow', confirmRestart: true },
			() => ({ message: 'done' }),
		);
		assert.equal(request.method, 'POST');
		assert.equal(request.url, `${BASE}/v2/reset-customers-flow-processes`);
		assert.equal(request.body, undefined);
		assert.deepEqual(out, [{ message: 'done' }]);
	});

	it('C50: resetAllContactsFlow without confirmation fails before any request', async () => {
		const context = makeContext({
			params: { resource: 'flow', operation: 'resetAllContactsFlow' },
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(
				error.message,
				"Turn on 'Confirm Restart' to restart the flow of the contacts [item 0]",
			);
			return true;
		});
		assert.equal(context.requests.length, 0);
	});

	it('C51: the reset description warns that the scope is not documented', () => {
		const { description } = operationOption('flow', 'resetAllContactsFlow');
		assert.ok(description.startsWith('Warning: restarts the flow of the contacts'));
		assert.match(description, /not documented/);
		assert.match(description, /all contacts/);
	});

	it('C52: wallet removeAllContacts posts wallet_name and returns quantityModified', async () => {
		const { request, out } = await exec(
			{ resource: 'wallet', operation: 'removeAllContacts', wallet: 'VIP' },
			() => ({ quantityModified: 12 }),
		);
		assert.equal(request.url, `${BASE}/v2/customers/wallets/remove-all`);
		assert.deepEqual(request.body, { wallet_name: 'VIP' });
		assert.deepEqual(out, [{ quantityModified: 12 }]);
	});

	it('C53: deactivateMany patches employees_ids', async () => {
		const { request } = await exec({
			resource: 'employee',
			operation: 'deactivateMany',
			employeeIds: ['a', 'b'],
		});
		assert.equal(request.method, 'PATCH');
		assert.equal(request.url, `${BASE}/v2/employees/deactivate`);
		assert.deepEqual(request.body, { employees_ids: ['a', 'b'] });
	});

	it('C54: a 207 answer becomes one item per employee with the four fields', async () => {
		const { out } = await exec(
			{ resource: 'employee', operation: 'deactivateMany', employeeIds: ['a', 'b'] },
			() => [
				{ employee_id: 'a', success: true, status_code: 200, status_message: 'ok', details: {} },
				{
					employee_id: 'b',
					success: false,
					status_code: 404,
					status_message: 'missing',
					details: {},
				},
			],
		);
		assert.deepEqual(out, [
			{ employee_id: 'a', success: true, status_code: 200, status_message: 'ok' },
			{ employee_id: 'b', success: false, status_code: 404, status_message: 'missing' },
		]);
	});

	it('C55: employee createMany posts email, name and role of each and returns the job', async () => {
		const { request, out } = await exec(
			{
				resource: 'employee',
				operation: 'createMany',
				employees: {
					items: [
						{ email: 'a@x.com', name: 'A', role: 'operator' },
						{ email: 'b@x.com', name: 'B', role: 'manager' },
					],
				},
			},
			() => ({ job: { id: 'j9' } }),
		);
		assert.equal(request.url, `${BASE}/v2/employees/bulk`);
		assert.deepEqual(request.body, {
			employees: [
				{ email: 'a@x.com', name: 'A', role: 'operator' },
				{ email: 'b@x.com', name: 'B', role: 'manager' },
			],
		});
		assert.deepEqual(out, [{ id: 'j9' }]);
	});
});

describe('S6 account resources', () => {
	it('C56: employee getAll returns id, name and email per employee', async () => {
		const { request, out } = await exec({ resource: 'employee', operation: 'getAll' }, () => ({
			employees: [
				{ id: '1', name: 'Ana', email: 'ana@x.com' },
				{ id: '2', name: 'Beto', email: 'beto@x.com' },
			],
		}));
		assert.equal(request.url, `${BASE}/v2/employees`);
		assert.equal(out.length, 2);
		assert.deepEqual(out[0], { id: '1', name: 'Ana', email: 'ana@x.com' });
	});

	it('C57: employee get uses the v1 route', async () => {
		const { request, out } = await exec(
			{ resource: 'employee', operation: 'get', employee: { mode: 'id', value: 'emp1' } },
			() => ({ email: 'a@x.com', role: 'admin', departments: [{ key: 'k', name: 'N' }] }),
		);
		assert.equal(request.url, `${BASE}/v1/employees/emp1`);
		assert.equal(out[0].role, 'admin');
	});

	it('C58: activate and deactivate put to their own routes', async () => {
		for (const operation of ['activate', 'deactivate']) {
			const { request, out } = await exec(
				{ resource: 'employee', operation, employee: { mode: 'id', value: 'emp1' } },
				() => ({ message: 'ok' }),
			);
			assert.equal(request.method, 'PUT');
			assert.equal(request.url, `${BASE}/v2/employees/emp1/${operation}`);
			assert.deepEqual(out, [{ message: 'ok' }]);
		}
	});

	it('C59: flow getAll returns id and title per flow', async () => {
		const { request, out } = await exec({ resource: 'flow', operation: 'getAll' }, () => ({
			flows: [{ id: 'f1', title: 'Welcome' }],
		}));
		assert.equal(request.url, `${BASE}/v2/flows`);
		assert.deepEqual(out, [{ id: 'f1', title: 'Welcome' }]);
	});

	it('C60: forwardContact posts customer and flow', async () => {
		const { request, out } = await exec(
			{
				resource: 'flow',
				operation: 'forwardContact',
				contact: { mode: 'id', value: 'c1' },
				flow: { mode: 'id', value: 'f1' },
			},
			() => ({ message: 'forwarded' }),
		);
		assert.equal(request.url, `${BASE}/v2/forward-to-customer`);
		assert.deepEqual(request.body, { customer: 'c1', flow: 'f1' });
		assert.deepEqual(out, [{ message: 'forwarded' }]);
	});

	it('C61: crmWorkflow getAll returns title and stages', async () => {
		const { request, out } = await exec({ resource: 'crmWorkflow', operation: 'getAll' }, () => ({
			workflows: [{ title: 'Sales', stages: ['New', 'Won'] }],
		}));
		assert.equal(request.url, `${BASE}/v2/workflows`);
		assert.deepEqual(out, [{ title: 'Sales', stages: ['New', 'Won'] }]);
	});

	it('C62: job get returns the job fields', async () => {
		const job = {
			id: 'j1',
			status: 'completed',
			totalItems: 3,
			successfulItems: 3,
			failedItems: 0,
			result: [],
		};
		const { request, out } = await exec(
			{ resource: 'job', operation: 'get', jobId: 'j1' },
			() => job,
		);
		assert.equal(request.url, `${BASE}/v2/jobs/j1`);
		assert.deepEqual(out, [job]);
	});

	it('C63: template getAll returns one item per template', async () => {
		const { request, out } = await exec({ resource: 'template', operation: 'getAll' }, () => ({
			templates: [
				{ id: 't1', title: 'Hi' },
				{ id: 't2', title: 'Bye' },
			],
		}));
		assert.equal(request.url, `${BASE}/v2/template/all`);
		assert.equal(out.length, 2);
	});

	it('C64: wallet getAll returns a name item per wallet', async () => {
		const { request, out } = await exec({ resource: 'wallet', operation: 'getAll' }, () => ({
			wallets: ['VIP', 'Gold'],
		}));
		assert.equal(request.url, `${BASE}/v2/wallets`);
		assert.deepEqual(out, [{ name: 'VIP' }, { name: 'Gold' }]);
	});

	it('C65: addContact posts customer and wallet', async () => {
		const { request } = await exec({
			resource: 'wallet',
			operation: 'addContact',
			contact: { mode: 'id', value: 'c1' },
			wallet: 'VIP',
		});
		assert.equal(request.method, 'POST');
		assert.equal(request.url, `${BASE}/v2/wallets`);
		assert.deepEqual(request.body, { customer: 'c1', wallet: 'VIP' });
	});

	it('C66: removeContact patches the contact route and returns deleted true on 204', async () => {
		const { request, out } = await exec(
			{ resource: 'wallet', operation: 'removeContact', contact: { mode: 'id', value: 'c1' } },
			() => '',
		);
		assert.equal(request.method, 'PATCH');
		assert.equal(request.url, `${BASE}/v2/wallets/c1`);
		assert.deepEqual(out, [{ deleted: true }]);
	});

	it('C67: whatsappIntegration getAll switches to the official route', async () => {
		const all = await exec({ resource: 'whatsappIntegration', operation: 'getAll' }, () => ({
			integrations: [{ key: 'k1' }],
		}));
		assert.equal(all.request.url, `${BASE}/v2/whatsapp/integrations`);
		const official = await exec(
			{ resource: 'whatsappIntegration', operation: 'getAll', officialOnly: true },
			() => ({ integrations: [{ key: 'integration-1', label: 'Main' }] }),
		);
		assert.equal(official.request.url, `${BASE}/v2/whatsapp/integrations/official`);
		assert.deepEqual(official.out, [{ key: 'integration-1', label: 'Main' }]);
	});
});

describe('S7 reports, analytics and campaigns', () => {
	it('C68: report getAll sends the dates and defaults the type to operators', async () => {
		const { request, out } = await exec(
			{
				resource: 'report',
				operation: 'getAll',
				startDate: '2026-10-01T00:00:00',
				endDate: '2026-10-31T00:00:00',
			},
			() => ({ docs: [{ id: 'r1' }] }),
		);
		assert.equal(request.url, `${BASE}/v4/reports`);
		assert.equal(request.qs.start_date, '2026-10-01');
		assert.equal(request.qs.end_date, '2026-10-31');
		assert.equal(request.qs.type, 'operators');
		assert.deepEqual(out, [{ id: 'r1' }]);
	});

	it('C69: getCampaignReport walks pages 1, 2 and 3 with limit 50', async () => {
		const { context, out } = await exec(
			{
				resource: 'report',
				operation: 'getCampaignReport',
				campaign: { mode: 'id', value: 'cp1' },
				returnAll: true,
			},
			(options) => ({
				docs: [{ id: `d${options.qs.page}a` }, { id: `d${options.qs.page}b` }],
				pages: 3,
				page: options.qs.page,
			}),
		);
		assert.deepEqual(
			context.requests.map((r) => r.qs.page),
			[1, 2, 3],
		);
		assert.equal(context.requests[0].url, `${BASE}/v4/reports/campaign/cp1`);
		assert.equal(context.requests[0].qs.limit, 50);
		assert.equal(out.length, 6);
	});

	const analyticsParams = {
		resource: 'analytics',
		operation: 'getAttendanceSummary',
		startDate: '2026-10-01T00:00:00.000Z',
		endDate: '2026-10-31T23:59:59.000Z',
		timezone: 'America/Sao_Paulo',
	};

	it('C70: getAttendanceSummary sends ISO dates and the timezone', async () => {
		const { request } = await exec(analyticsParams, () => ({ attendancesTotal: 3 }));
		assert.equal(request.url, `${BASE}/v1/analytics/attendances/summary`);
		assert.equal(request.qs.start_date, '2026-10-01T00:00:00.000Z');
		assert.equal(request.qs.end_date, '2026-10-31T23:59:59.000Z');
		assert.equal(request.qs.timezone, 'America/Sao_Paulo');
	});

	it('C71: retention, reviews average and contacts origin call their own routes', async () => {
		const routes = {
			getRetention: '/v1/analytics/attendances/retention',
			getReviewsAverage: '/v1/analytics/attendances/reviews/average',
			getContactsOrigin: '/v1/analytics/contacts/origin',
		};
		for (const [operation, path] of Object.entries(routes)) {
			const { request, out } = await exec({ ...analyticsParams, operation }, () => ({ value: 1 }));
			assert.equal(request.url, `${BASE}${path}`);
			assert.deepEqual(out, [{ value: 1 }]);
		}
	});

	it('C72: department and employee ids go comma separated', async () => {
		const { request } = await exec(
			{ ...analyticsParams, options: { departmentIds: ['d1', 'd2'], employeeIds: ['e1', 'e2'] } },
			() => ({}),
		);
		assert.equal(request.qs.department_ids, 'd1,d2');
		assert.equal(request.qs.employee_ids, 'e1,e2');
	});

	it('C73: campaign getAll follows has_more over pages 1, 2 and 3', async () => {
		const { context, out } = await exec(
			{ resource: 'campaign', operation: 'getAll', returnAll: true },
			(options) => ({
				campaigns: [{ id: `c${options.qs.page}`, title: 'T' }],
				has_more: options.qs.page < 3,
				total: 3,
			}),
		);
		assert.deepEqual(
			context.requests.map((r) => r.qs.page),
			[1, 2, 3],
		);
		assert.equal(context.requests[0].qs.limit, 100);
		assert.equal(out.length, 3);
	});

	it('C74: campaign get returns the campaign details', async () => {
		const campaign = { segmentation: {}, template: {}, stats: {}, clicks_stats: [] };
		const { request, out } = await exec(
			{ resource: 'campaign', operation: 'get', campaign: { mode: 'id', value: 'cp1' } },
			() => campaign,
		);
		assert.equal(request.url, `${BASE}/v1/campaigns/cp1`);
		assert.deepEqual(out, [campaign]);
	});
});
