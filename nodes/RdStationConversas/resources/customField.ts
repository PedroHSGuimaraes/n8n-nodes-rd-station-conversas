/**
 * Recurso "Custom Field" (beta, contas selecionadas): criar, ler, editar, apagar e listar
 * os campos personalizados dos contatos. O campo guarda `label` (nome), `info` (descrição)
 * e `key` (variável usada nos templates).
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { locator } from '../locators';
import { collectPages } from '../pagination';
import { requireId, returnAllAndLimit, seg, showFor } from '../helpers';
import { conversasRequest } from '../transport';
import { DELETED, type Handler, type ResourceModule, asObject, operationProperty } from './types';

const RESOURCE = 'customField';

// Localizador do campo: lista pesquisável (padrão) ou ID digitado.
const customFieldLocator = (operations: string[]): INodeProperties =>
	locator({
		displayName: 'Custom Field',
		name: 'customField',
		searchMethod: 'searchCustomFields',
		resource: RESOURCE,
		operations,
	});

// Cria o registro com os campos obrigatórios e só os opcionais preenchidos.
const create: Handler = async function (i) {
	// O corpo leva só os dois campos que a API aceita ao criar.
	const body: IDataObject = {
		label: this.getNodeParameter('label', i) as string,
		info: this.getNodeParameter('info', i) as string,
	};
	return asObject(await conversasRequest.call(this, 'POST', '/v2/custom-fields', { body }));
};

// Lê um registro pelo ID escolhido e devolve a resposta da API.
const get: Handler = async function (i) {
	const id = requireId(this, 'customField', 'Custom Field', i);
	return asObject(await conversasRequest.call(this, 'GET', `/v2/custom-fields/${seg(id)}`));
};

// Atualiza o registro enviando só os campos que a rota aceita.
const update: Handler = async function (i) {
	const id = requireId(this, 'customField', 'Custom Field', i);
	// Só `info` muda: a API não deixa editar o `label` de um campo já criado.
	const body: IDataObject = { info: this.getNodeParameter('info', i) as string };
	return asObject(
		await conversasRequest.call(this, 'PUT', `/v2/custom-fields/${seg(id)}`, { body }),
	);
};

// Apaga o registro; a API responde 204 sem corpo, então devolvemos `{ deleted: true }`.
const remove: Handler = async function (i) {
	const id = requireId(this, 'customField', 'Custom Field', i);
	// A API responde 204 sem corpo; devolvemos o item padrão de exclusão.
	await conversasRequest.call(this, 'DELETE', `/v2/custom-fields/${seg(id)}`);
	return DELETED;
};

// Lista os registros da rota de listagem e devolve um item por registro.
const getAll: Handler = async function (i) {
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const pageSize = 100;
	const items = await collectPages<IDataObject>(
		async (page) => {
			const qs: IDataObject = { page, limit: pageSize };
			if (options.label) qs.label = options.label as string;
			const response = asObject(
				await conversasRequest.call(this, 'GET', '/v2/custom-fields', { qs }),
			);
			const data = (response.data as IDataObject[] | undefined) ?? [];
			const total = Number(response.total ?? 0);
			// A última página é a que alcança o total informado pela API.
			return { items: data, last: page * pageSize >= total };
		},
		returnAll,
		limit,
	);
	return items;
};

// Operações do recurso, na ordem alfabética que o n8n recomenda.
const operations: INodePropertyOptions[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a custom field',
		description: 'Create a custom field for contacts',
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a custom field',
		description: 'Delete a custom field',
	},
	{ name: 'Get', value: 'get', action: 'Get a custom field', description: 'Get a custom field' },
	{
		name: 'Get Many',
		value: 'getAll',
		action: 'Get many custom fields',
		description: 'List the custom fields',
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a custom field',
		description: 'Change the description of a custom field',
	},
];

export const customFieldResource: ResourceModule = {
	value: RESOURCE,
	name: 'Custom Field',
	operations,
	properties: [
		operationProperty(RESOURCE, operations, 'getAll'),
		customFieldLocator(['get', 'update', 'delete']),
		{
			displayName: 'Label',
			name: 'label',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. Contract Plan',
			// O nome só existe na criação: depois a API não deixa mudar.
			displayOptions: showFor(RESOURCE, ['create']),
			description: 'Name of the field',
		},
		{
			displayName: 'Info',
			name: 'info',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. Plan the customer bought',
			displayOptions: showFor(RESOURCE, ['create', 'update']),
			description: 'Description of the field',
		},
		...returnAllAndLimit(RESOURCE, ['getAll']),
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: showFor(RESOURCE, ['getAll']),
			options: [
				{
					displayName: 'Label',
					name: 'label',
					type: 'string',
					default: '',
					placeholder: 'e.g. Plan',
					description: 'Return only fields whose label contains this text',
				},
			],
		},
	],
	handlers: { create, get, update, delete: remove, getAll },
};
