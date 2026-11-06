/**
 * Recurso "Flow": os fluxos (chatbot) do Conversas. Lista, encaminha um contato
 * para um fluxo e reinicia o fluxo dos contatos (operação de risco, com confirmação).
 */
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { fail, requireId, resolveContact, showFor } from '../helpers';
import { locator } from '../locators';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asList, asObject, operationProperty } from './types';

const RESOURCE = 'flow';

const operations: INodePropertyOptions[] = [
	{
		name: 'Forward Contact',
		value: 'forwardContact',
		action: 'Forward a contact to a flow',
		description: 'Send a contact into a flow',
	},
	{ name: 'Get Many', value: 'getAll', action: 'Get many flows', description: 'List all flows' },
	{
		name: 'Reset All Contacts Flow',
		value: 'resetAllContactsFlow',
		action: 'Reset the flow of the contacts',
		description:
			'Warning: restarts the flow of the contacts. The scope of this route is not documented and it may apply to all contacts. Turn on Confirm Restart to run it',
	},
];

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAll'),
	locator({
		displayName: 'Contact',
		name: 'contact',
		searchMethod: 'searchContacts',
		resource: RESOURCE,
		operations: ['forwardContact'],
		withPhone: true,
	}),
	locator({
		displayName: 'Flow',
		name: 'flow',
		searchMethod: 'searchFlows',
		resource: RESOURCE,
		operations: ['forwardContact'],
	}),
	{
		displayName: 'Confirm Restart',
		name: 'confirmRestart',
		type: 'boolean',
		default: false,
		displayOptions: showFor(RESOURCE, ['resetAllContactsFlow']),
		description: 'Whether to confirm that the flow of the contacts is restarted. Without it the operation stops before calling the API.',
	},
];

const getAll: Handler = async function () {
	return asList(await conversasRequest.call(this, 'GET', '/v2/flows'), 'flows');
};

const forwardContact: Handler = async function (i) {
	const customer = await resolveContact(this, 'contact', i);
	const flow = requireId(this, 'flow', 'Flow', i);
	return asObject(
		await conversasRequest.call(this, 'POST', '/v2/forward-to-customer', {
			body: { customer, flow },
		}),
	);
};

const resetAllContactsFlow: Handler = async function (i) {
	// A rota pode valer para todos os contatos: sem confirmação nada é enviado (AD-013).
	if (this.getNodeParameter('confirmRestart', i, false) !== true) {
		fail(
			this,
			"Turn on 'Confirm Restart' to restart the flow of the contacts",
			'This operation may restart the flow of every contact, and the API does not document its scope',
			i,
		);
	}
	return asObject(await conversasRequest.call(this, 'POST', '/v2/reset-customers-flow-processes'));
};

export const flowResource: ResourceModule = {
	value: RESOURCE,
	name: 'Flow',
	operations,
	properties,
	handlers: { getAll, forwardContact, resetAllContactsFlow },
};
