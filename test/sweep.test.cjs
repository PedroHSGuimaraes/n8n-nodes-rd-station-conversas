/**
 * Varredura das 42 operações com parâmetros válidos: toda requisição de toda operação
 * precisa ir à base fixa, com a credencial certa e `timeout` de 30000 ms (check C8).
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { makeContext, run } = require('./helpers.cjs');

const id = (value) => ({ mode: 'id', value });
const dates = { startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-31T00:00:00.000Z' };

// Uma linha por operação: [recurso, operação, parâmetros válidos].
const OPERATIONS = [
	['contact', 'getAll', { returnAll: false, limit: 5 }],
	['contact', 'getByPhone', { phone: '5511999998888' }],
	['contact', 'getByCpf', { cpf: '12345678909' }],
	['contact', 'create', { phone: '5511999998888', fullName: 'A', integration: 'i' }],
	['contact', 'update', { phone: '5511999998888', fullName: 'A', integration: 'i' }],
	['contact', 'updateByPhone', { phone: '5511999998888', fullName: 'A' }],
	['contact', 'createMany', { contacts: { items: [{ phone: '5511999998888' }] } }],
	['contact', 'deleteManyByTag', { tag: 't' }],
	['contact', 'deleteManyByIntegration', { integration: 'i' }],
	['customField', 'getAll', { returnAll: false, limit: 5 }],
	['customField', 'create', { label: 'L', info: 'I' }],
	['customField', 'get', { customField: id('f') }],
	['customField', 'update', { customField: id('f'), info: 'I' }],
	['customField', 'delete', { customField: id('f') }],
	['employee', 'getAll', {}],
	['employee', 'get', { employee: id('e') }],
	['employee', 'activate', { employee: id('e') }],
	['employee', 'deactivate', { employee: id('e') }],
	[
		'employee',
		'createMany',
		{ employees: { items: [{ email: 'a@x.com', name: 'A', role: 'admin' }] } },
	],
	['employee', 'deactivateMany', { employeeIds: ['e'] }],
	['flow', 'getAll', {}],
	['flow', 'forwardContact', { contact: id('c'), flow: id('f') }],
	['flow', 'resetAllContactsFlow', { confirmRestart: true }],
	['crmWorkflow', 'getAll', {}],
	['job', 'get', { jobId: 'j' }],
	['message', 'send', { contact: id('c'), message: 'm' }],
	['message', 'sendTemplate', { phone: '5511999998888', template: id('t') }],
	['message', 'getHistory', { contact: id('c'), returnAll: false, limit: 5 }],
	['report', 'getAll', dates],
	['report', 'getCampaignReport', { campaign: id('cp'), returnAll: false, limit: 5 }],
	['template', 'getAll', {}],
	['wallet', 'getAll', {}],
	['wallet', 'addContact', { contact: id('c'), wallet: 'W' }],
	['wallet', 'removeContact', { contact: id('c') }],
	['wallet', 'removeAllContacts', { wallet: 'W' }],
	['whatsappIntegration', 'getAll', {}],
	['analytics', 'getAttendanceSummary', dates],
	['analytics', 'getRetention', dates],
	['analytics', 'getReviewsAverage', dates],
	['analytics', 'getContactsOrigin', dates],
	['campaign', 'getAll', { returnAll: false, limit: 5 }],
	['campaign', 'get', { campaign: id('cp') }],
];

describe('S1 request sweep', () => {
	it('C8: every request of all 42 operations has the fixed base, the credential and timeout 30000', async () => {
		assert.equal(OPERATIONS.length, 42);
		for (const [resource, operation, params] of OPERATIONS) {
			const context = makeContext({
				params: { resource, operation, ...params },
				credentials: { apiToken: 'tok', privateKeyJwk: '{}' },
				responder: () => ({}),
			});
			await run(context);
			assert.ok(context.requests.length > 0, `${resource}.${operation} sent no request`);
			for (const request of context.requests) {
				assert.equal(request.timeout, 30000, `${resource}.${operation} timeout`);
				assert.ok(
					request.url.startsWith('https://api.tallos.com.br/'),
					`${resource}.${operation} url`,
				);
				assert.equal(request.credentialType, 'rdStationConversasApi');
			}
		}
	});
});

module.exports = { OPERATIONS };
