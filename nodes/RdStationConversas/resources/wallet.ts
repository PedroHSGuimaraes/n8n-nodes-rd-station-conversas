/**
 * Recurso "Wallet": carteiras de contatos. Lista, põe e tira um contato, e esvazia uma carteira.
 */
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { fail, resolveContact, seg, showFor } from '../helpers';
import { locator } from '../locators';
import { conversasRequest } from '../transport';
import { DELETED, type Handler, type ResourceModule, asObject, operationProperty } from './types';

const RESOURCE = 'wallet';

const operations: INodePropertyOptions[] = [
	{
		name: 'Add Contact',
		value: 'addContact',
		action: 'Add a contact to a wallet',
		description: 'Put a contact in a wallet',
	},
	{
		name: 'Get Many',
		value: 'getAll',
		action: 'Get many wallets',
		description: 'List the wallets',
	},
	{
		name: 'Remove All Contacts',
		value: 'removeAllContacts',
		action: 'Remove all contacts from a wallet',
		description:
			'Warning: removes every contact from the chosen wallet. The contacts are not deleted.',
	},
	{
		name: 'Remove Contact',
		value: 'removeContact',
		action: 'Remove a contact from its wallet',
		description: 'Take a contact out of its wallet',
	},
];

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAll'),
	locator({
		displayName: 'Contact',
		name: 'contact',
		searchMethod: 'searchContacts',
		resource: RESOURCE,
		operations: ['addContact', 'removeContact'],
		withPhone: true,
	}),
	{
		displayName: 'Wallet Name or ID',
		name: 'wallet',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getWallets' },
		displayOptions: showFor(RESOURCE, ['addContact', 'removeAllContacts']),
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
];

// Lista os registros da rota de listagem e devolve um item por registro.
const getAll: Handler = async function () {
	const response = asObject(await conversasRequest.call(this, 'GET', '/v2/wallets'));
	const names = Array.isArray(response.wallets) ? (response.wallets as string[]) : [];
	return names.map((name) => ({ name }));
};

// Nome da carteira é obrigatório nas duas operações que o usam.
function requireWallet(ctx: Parameters<typeof fail>[0], wallet: string, i: number): string {
	if (wallet.trim() === '') fail(ctx, "The 'Wallet' parameter is empty", 'Choose a wallet', i);
	return wallet;
}

// Põe o contato numa carteira.
const addContact: Handler = async function (i) {
	const customer = await resolveContact(this, 'contact', i);
	const wallet = requireWallet(this, String(this.getNodeParameter('wallet', i, '')), i);
	return asObject(
		await conversasRequest.call(this, 'POST', '/v2/wallets', { body: { customer, wallet } }),
	);
};

// Tira o contato da carteira; a API responde 204.
const removeContact: Handler = async function (i) {
	const contactId = await resolveContact(this, 'contact', i);
	// Resposta 204 sem corpo: devolvemos o item padrão de exclusão.
	await conversasRequest.call(this, 'PATCH', `/v2/wallets/${seg(contactId)}`);
	return DELETED;
};

// Esvazia uma carteira; os contatos não são apagados.
const removeAllContacts: Handler = async function (i) {
	const wallet = requireWallet(this, String(this.getNodeParameter('wallet', i, '')), i);
	return asObject(
		await conversasRequest.call(this, 'POST', '/v2/customers/wallets/remove-all', {
			body: { wallet_name: wallet },
		}),
	);
};

export const walletResource: ResourceModule = {
	value: RESOURCE,
	name: 'Wallet',
	operations,
	properties,
	handlers: { getAll, addContact, removeContact, removeAllContacts },
};
