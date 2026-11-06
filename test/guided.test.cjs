/**
 * Testes da fatia S8: campos guiados (listas), erros no padrão do n8n e regras da tela.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { RdStationConversas, makeContext, run } = require('./helpers.cjs');

const BASE = 'https://api.tallos.com.br';
const node = new RdStationConversas();

// Percorre todas as propriedades da tela, inclusive as que ficam dentro de coleções.
function walk(properties, visit, parents = []) {
	for (const property of properties) {
		visit(property, parents);
		if (Array.isArray(property.options)) {
			const nested = property.options.filter((option) => option.values || option.type);
			for (const option of nested) {
				if (option.values) walk(option.values, visit, [...parents, property]);
				else if (option.type) walk([option], visit, [...parents, property]);
			}
		}
	}
}

const allProperties = () => {
	const found = [];
	walk(node.description.properties, (property) => found.push(property));
	return found;
};

describe('S8 resource locators and lists', () => {
	it('C75: ID fields are resource locators with list (default, searchable) and id modes', () => {
		const names = ['contact', 'template', 'flow', 'employee', 'campaign', 'customField'];
		for (const name of names) {
			const locators = node.description.properties.filter((p) => p.name === name);
			assert.ok(locators.length > 0, `${name} has no locator`);
			for (const locator of locators) {
				assert.equal(locator.type, 'resourceLocator', name);
				assert.equal(locator.default.mode, 'list');
				const list = locator.modes.find((mode) => mode.name === 'list');
				assert.equal(list.typeOptions.searchable, true);
				assert.ok(locator.modes.find((mode) => mode.name === 'id'));
				// O método de busca ligado ao modo lista precisa existir no node.
				assert.equal(typeof node.methods.listSearch[list.typeOptions.searchListMethod], 'function');
			}
		}
		// Contato aceita telefone onde a rota pede o `_id` (mensagem, fluxo, carteira).
		for (const resource of ['message', 'flow', 'wallet']) {
			const contact = node.description.properties.find(
				(p) => p.name === 'contact' && p.displayOptions.show.resource[0] === resource,
			);
			assert.ok(
				contact.modes.find((mode) => mode.name === 'phone'),
				`${resource} contact has no phone mode`,
			);
		}
	});

	it('C76: the contact search filters by name ignoring case and accents and pages on', async () => {
		const page = Array.from({ length: 100 }, (_, n) => ({
			_id: `c${n}`,
			full_name: n === 0 ? 'Ana Souza' : n === 1 ? 'JOANA' : n === 2 ? 'Ânã Lima' : `Beto ${n}`,
		}));
		const context = makeContext({ responder: () => page });
		const result = await node.methods.listSearch.searchContacts.call(context, 'ana');
		assert.equal(context.requests[0].url, `${BASE}/v2/customers`);
		assert.equal(context.requests[0].qs.page, 1);
		assert.equal(context.requests[0].qs.limit, 100);
		assert.deepEqual(
			result.results.map((entry) => entry.name),
			['Ana Souza', 'JOANA', 'Ânã Lima'],
		);
		assert.deepEqual(result.results[0], { name: 'Ana Souza', value: 'c0' });
		assert.equal(result.paginationToken, '2');
		const next = await node.methods.listSearch.searchContacts.call(
			makeContext({ responder: () => [] }),
			'ana',
			'2',
		);
		assert.equal(next.paginationToken, undefined);
	});

	it('C77: the template search keeps only titles that contain the text', async () => {
		const context = makeContext({
			responder: () => ({
				templates: [
					{ id: 't1', title: 'Boas-vindas' },
					{ id: 't2', title: 'Cobrança' },
				],
			}),
		});
		const result = await node.methods.listSearch.searchTemplates.call(context, 'boas');
		assert.equal(context.requests[0].url, `${BASE}/v2/template/all`);
		assert.deepEqual(result.results, [{ name: 'Boas-vindas', value: 't1' }]);
	});

	it('C78: Integration options come from the official integrations route', async () => {
		const context = makeContext({
			responder: () => ({ integrations: [{ key: 'integration-1', label: 'Main number' }] }),
		});
		const options = await node.methods.loadOptions.getOfficialIntegrations.call(context);
		assert.equal(context.requests[0].url, `${BASE}/v2/whatsapp/integrations/official`);
		assert.deepEqual(options, [{ name: 'Main number', value: 'integration-1' }]);
	});

	it('C79: Workflow Stage options list only the stages of the chosen workflow', async () => {
		const context = makeContext({
			params: { 'additionalFields.workflow': 'Vendas' },
			responder: () => ({
				workflows: [
					{ title: 'Vendas', stages: ['Novo', 'Ganho'] },
					{ title: 'Suporte', stages: ['Aberto'] },
				],
			}),
		});
		const options = await node.methods.loadOptions.getWorkflowStages.call(context);
		assert.deepEqual(options, [
			{ name: 'Novo', value: 'Novo' },
			{ name: 'Ganho', value: 'Ganho' },
		]);
	});

	it('C80: Departments merge the first 50 employees without repeated keys', async () => {
		const employees = Array.from({ length: 60 }, (_, n) => ({ id: `e${n}`, name: `E${n}` }));
		const context = makeContext({
			responder: (options) =>
				options.url.endsWith('/v2/employees')
					? { employees }
					: {
							departments: [
								{ key: 'sales', name: 'Sales' },
								{ key: `d-${options.url.split('/').pop()}`, name: 'Own' },
							],
						},
		});
		const options = await node.methods.loadOptions.getDepartments.call(context);
		// 1 chamada da lista + 50 chamadas (só os 50 primeiros atendentes).
		assert.equal(context.requests.length, 51);
		assert.equal(options.filter((option) => option.value === 'sales').length, 1);
		assert.equal(options.length, 51);
	});
});

describe('S8 errors and screen rules', () => {
	it('C81: By Phone with a 404 explains how to continue', async () => {
		const context = makeContext({
			params: {
				resource: 'message',
				operation: 'send',
				contact: { mode: 'phone', value: '5511999998888' },
				message: 'oi',
			},
			responder: () => {
				throw { httpCode: '404', context: { data: { message: 'not found' } } };
			},
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(
				error.message,
				"No contact found for the phone in the 'Contact' parameter [item 0]",
			);
			assert.equal(error.description, 'Check the number or create the contact first');
			return true;
		});
	});

	it('C82: a 422 keeps the API message and lists one field per line', async () => {
		const context = makeContext({
			params: { resource: 'customField', operation: 'create', label: '', info: 'x' },
			responder: () => {
				throw {
					httpCode: '422',
					context: {
						data: {
							message: 'Propriedade "name" falhou na validação.',
							errors: [
								{ field: 'name', message: 'is required' },
								{ field: 'info', message: 'too short' },
							],
						},
					},
				};
			},
		});
		await assert.rejects(run(context), (error) => {
			assert.equal(error.name, 'NodeApiError');
			assert.equal(error.message, 'Propriedade "name" falhou na validação.');
			assert.equal(error.description, 'name: is required\ninfo: too short');
			return true;
		});
	});

	it('C83: Continue On Fail returns the error of item 1 and still runs item 2', async () => {
		const context = makeContext({
			items: 3,
			continueOnFail: true,
			params: { resource: 'employee', operation: 'getAll' },
			responder: (_options, n) => {
				if (n === 1) throw { httpCode: '400', context: { data: { message: 'bad request' } } };
				return { employees: [{ id: String(n), name: 'E', email: 'e@x.com' }] };
			},
		});
		const out = await run(context);
		assert.equal(out.length, 3);
		assert.equal(out[0].id, '0');
		assert.equal(out[1].error, 'bad request');
		assert.equal(out[2].id, '2');
	});

	it('C84: labels are Title Case, descriptions are sentences, booleans start with Whether', () => {
		const small = new Set([
			'a',
			'an',
			'the',
			'and',
			'or',
			'of',
			'in',
			'on',
			'for',
			'to',
			'by',
			'with',
			'at',
			'from',
		]);
		const titleCase = (text) =>
			text
				.split(' ')
				.every((word, index) => /^[A-Z0-9(]/.test(word) || (index > 0 && small.has(word)));
		const problems = [];
		for (const property of allProperties()) {
			if (property.displayName && !titleCase(property.displayName))
				problems.push(`label: ${property.displayName}`);
			if (property.description && !/^[A-Z]/.test(property.description))
				problems.push(`description: ${property.name}`);
			if (property.type === 'boolean' && !property.description.startsWith('Whether'))
				problems.push(`boolean: ${property.name}`);
			if (
				property.placeholder &&
				!property.placeholder.startsWith('e.g.') &&
				property.placeholder !== 'Add Option' &&
				property.placeholder !== 'Add Field' &&
				!/^Add /.test(property.placeholder)
			)
				problems.push(`placeholder: ${property.name} = ${property.placeholder}`);
			for (const mode of property.modes ?? []) {
				if (mode.placeholder && !mode.placeholder.startsWith('e.g.'))
					problems.push(`mode placeholder: ${property.name}.${mode.name}`);
			}
			if (property.name === 'operation') {
				for (const option of property.options) {
					if (!titleCase(option.name)) problems.push(`operation: ${option.name}`);
				}
			}
		}
		assert.deepEqual(problems, []);
	});

	it('C85: phone fields carry the hint and paginated lists have Return All and Limit >= 1', () => {
		const hint = 'International format, digits only, e.g. 5511999998888';
		for (const property of allProperties()) {
			if (property.name === 'phone' && property.type === 'string')
				assert.equal(property.hint, hint);
			for (const mode of property.modes ?? []) {
				if (mode.name === 'phone') assert.equal(mode.hint, hint);
			}
		}
		const pairs = [
			['contact', 'getAll'],
			['customField', 'getAll'],
			['campaign', 'getAll'],
			['report', 'getCampaignReport'],
			['message', 'getHistory'],
		];
		for (const [resource, operation] of pairs) {
			const own = (name) =>
				node.description.properties.find(
					(p) =>
						p.name === name &&
						p.displayOptions?.show?.resource?.[0] === resource &&
						p.displayOptions.show.operation?.includes(operation),
				);
			assert.ok(own('returnAll'), `${resource} has no Return All`);
			assert.equal(own('limit').typeOptions.minValue, 1);
		}
	});

	it('C86: tool use, connections, subtitle and the exact resources and operations', () => {
		const { description } = node;
		assert.equal(description.usableAsTool, true);
		assert.deepEqual(description.inputs, ['main']);
		assert.deepEqual(description.outputs, ['main']);
		assert.match(description.subtitle, /operation/);
		assert.match(description.subtitle, /resource/);
		const expected = {
			analytics: ['getAttendanceSummary', 'getContactsOrigin', 'getRetention', 'getReviewsAverage'],
			campaign: ['get', 'getAll'],
			contact: [
				'create',
				'createMany',
				'deleteManyByIntegration',
				'deleteManyByTag',
				'getAll',
				'getByCpf',
				'getByPhone',
				'update',
				'updateByPhone',
			],
			crmWorkflow: ['getAll'],
			customField: ['create', 'delete', 'get', 'getAll', 'update'],
			employee: ['activate', 'createMany', 'deactivate', 'deactivateMany', 'get', 'getAll'],
			flow: ['forwardContact', 'getAll', 'resetAllContactsFlow'],
			job: ['get'],
			message: ['getHistory', 'send', 'sendTemplate'],
			report: ['getAll', 'getCampaignReport'],
			template: ['getAll'],
			wallet: ['addContact', 'getAll', 'removeAllContacts', 'removeContact'],
			whatsappIntegration: ['getAll'],
		};
		const resourceProperty = description.properties.find((p) => p.name === 'resource');
		assert.deepEqual(
			resourceProperty.options.map((o) => o.value).sort(),
			Object.keys(expected).sort(),
		);
		let total = 0;
		for (const [resource, operations] of Object.entries(expected)) {
			const property = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions.show.resource[0] === resource,
			);
			assert.deepEqual(property.options.map((o) => o.value).sort(), operations, resource);
			total += operations.length;
		}
		assert.equal(total, 42);
	});
});
