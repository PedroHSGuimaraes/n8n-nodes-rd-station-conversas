/**
 * Recurso "Contact": buscar, listar, criar, atualizar e apagar contatos do Conversas.
 * As rotas deprecadas (criar contato genérico e WhatsApp Business antigo) ficam de fora (AD-007).
 * Não existe operação de apagar todos os contatos: a chave `$all` da API nunca é enviada (AD-008).
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import {
	compact,
	fail,
	onlyDigits,
	requirePhone,
	returnAllAndLimit,
	showFor,
	splitList,
} from '../helpers';
import { collectPages } from '../pagination';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asObject, operationProperty } from './types';

const RESOURCE = 'contact';

// Mensagem de aviso das exclusões em massa: começa igual nas duas operações (check C48).
const DELETE_WARNING =
	'Warning: permanently deletes every contact that has the given {what}. The deletion cannot be undone and applies to all matching contacts';

const operations: INodePropertyOptions[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a contact',
		description: 'Create a WhatsApp Business contact',
	},
	{
		name: 'Create Many',
		value: 'createMany',
		action: 'Create many contacts',
		description:
			'Create several contacts at once. Runs in the background and returns a job to follow with Job: Get.',
	},
	{
		name: 'Delete Many by Integration',
		value: 'deleteManyByIntegration',
		action: 'Delete contacts by integration',
		description: DELETE_WARNING.replace('{what}', 'chosen integration'),
	},
	{
		name: 'Delete Many by Tag',
		value: 'deleteManyByTag',
		action: 'Delete contacts by tag',
		description: DELETE_WARNING.replace('{what}', 'given tag'),
	},
	{
		name: 'Get by CPF',
		value: 'getByCpf',
		action: 'Get a contact by CPF',
		description: 'Get a contact by its CPF',
	},
	{
		name: 'Get by Phone',
		value: 'getByPhone',
		action: 'Get a contact by phone',
		description: 'Get a contact by its phone number',
	},
	{
		name: 'Get Many',
		value: 'getAll',
		action: 'Get many contacts',
		description: 'List the contacts',
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a contact',
		description: 'Update a WhatsApp Business contact found by phone',
	},
	{
		name: 'Update by Phone',
		value: 'updateByPhone',
		action: 'Update a contact by phone',
		description: 'Update a contact using its phone number. Needs the Advanced plan.',
	},
];

// Campos que valem para criar e atualizar, com o nome que a API espera no corpo.
const COMMON_FIELDS: Array<[param: string, apiName: string]> = [
	['email', 'email'],
	['cpf', 'cpf'],
	['cnpj', 'cnpj'],
	['rg', 'rg'],
	['birthDate', 'birth_date'],
	['description', 'description'],
	['code', 'code'],
	['whatsappName', 'whatsapp_name'],
	['address', 'address'],
	['job', 'job'],
];

// Converte o bloco "Additional Fields" no corpo da API, só com o que foi preenchido.
function additionalBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [param, apiName] of COMMON_FIELDS) {
		const value = fields[param];
		// Endereço e cargo chegam como JSON em texto; a API quer objeto.
		body[apiName] =
			(param === 'address' || param === 'job') && typeof value === 'string' && value !== ''
				? (JSON.parse(value) as IDataObject)
				: value;
	}
	// Etiquetas digitadas separadas por vírgula viram lista.
	body.tags = splitList(fields.tags);
	return compact(body);
}

const textField = (
	name: string,
	displayName: string,
	placeholder: string,
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	placeholder,
	description,
});

// Campos extras compartilhados por criar e atualizar.
const sharedExtras: INodeProperties[] = [
	textField('email', 'Email', 'e.g. ana@example.com', 'Email of the contact'),
	textField('cpf', 'CPF', 'e.g. 12345678909', 'CPF of the contact'),
	textField('cnpj', 'CNPJ', 'e.g. 12345678000190', 'CNPJ of the contact'),
	textField('rg', 'RG', 'e.g. 123456789', 'RG of the contact'),
	textField('birthDate', 'Birth Date', 'e.g. 31/12/1990', 'Birth date in the format DD/MM/YYYY'),
	textField(
		'description',
		'Description',
		'e.g. Came from the Black Friday campaign',
		'Free text about the contact',
	),
	textField('code', 'Code', 'e.g. CL-1042', 'Internal code of the contact'),
	textField('whatsappName', 'WhatsApp Name', 'e.g. Ana', 'Name the contact shows on WhatsApp'),
	textField(
		'tags',
		'Tags',
		'e.g. vip, newsletter',
		'Tags separated by commas. On update they replace the existing tags',
	),
	{
		displayName: 'Address (JSON)',
		name: 'address',
		type: 'json',
		default: '',
		placeholder: 'e.g. {"city": "São Paulo", "state": "SP"}',
		description:
			'Address object with city, complement, country, district, number, state, street and zip_code',
	},
	{
		displayName: 'Job (JSON)',
		name: 'job',
		type: 'json',
		default: '',
		placeholder: 'e.g. {"company": "Acme", "title": "Buyer"}',
		description:
			'Job object with cnpj, company, department, email, occupation_area, phone, site and title',
	},
];

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAll'),
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 5511999998888',
		hint: 'International format, digits only, e.g. 5511999998888',
		displayOptions: showFor(RESOURCE, ['getByPhone', 'create', 'update', 'updateByPhone']),
		description: 'Phone number with country code',
	},
	{
		displayName: 'CPF',
		name: 'cpf',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 12345678909',
		displayOptions: showFor(RESOURCE, ['getByCpf']),
		description: 'CPF of the contact. Dots and dashes are removed for you.',
	},
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'options',
		default: 'whatsapp',
		displayOptions: showFor(RESOURCE, ['getByPhone', 'getByCpf']),
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'Megasac', value: 'megasac' },
			{ name: 'Messenger', value: 'messenger' },
			{ name: 'Telegram', value: 'telegram' },
			{ name: 'WhatsApp', value: 'whatsapp' },
		],
		description: 'Channel where the contact is registered',
	},
	{
		displayName: 'Full Name',
		name: 'fullName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Ana Souza',
		displayOptions: showFor(RESOURCE, ['create', 'update', 'updateByPhone']),
		description: 'Full name of the contact',
	},
	{
		displayName: 'Integration Name or ID',
		name: 'integration',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getOfficialIntegrations' },
		displayOptions: showFor(RESOURCE, ['create', 'update', 'deleteManyByIntegration']),
		description:
			'Official WhatsApp integration (number) of the contact. Choose from the list, or specify by using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Tag',
		name: 'tag',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. cold-lead',
		displayOptions: showFor(RESOURCE, ['deleteManyByTag']),
		description: 'Every contact with this tag is permanently deleted',
	},
	{
		displayName: 'Contacts',
		name: 'contacts',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Contact',
		default: {},
		displayOptions: showFor(RESOURCE, ['createMany']),
		options: [
			{
				displayName: 'Contact',
				name: 'items',
				values: [
					{
						...textField('phone', 'Phone', 'e.g. 5511999998888', 'Phone number with country code'),
						required: true,
						hint: 'International format, digits only, e.g. 5511999998888',
					},
					textField('fullName', 'Full Name', 'e.g. Ana Souza', 'Full name of the contact'),
					textField('email', 'Email', 'e.g. ana@example.com', 'Email of the contact'),
					textField('cpf', 'CPF', 'e.g. 12345678909', 'CPF of the contact'),
					textField('tags', 'Tags', 'e.g. vip, newsletter', 'Tags separated by commas'),
				],
			},
		],
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
				displayName: 'Channels',
				name: 'channels',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Telegram', value: 'telegram' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				description: 'Return only contacts of these channels',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(RESOURCE, ['create']),
		options: [
			...sharedExtras,
			textField('departmentName', 'Department Name', 'e.g. Sales', 'Department of the contact'),
			{
				displayName: 'Workflow Name or ID',
				name: 'workflow',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getWorkflows' },
				description:
					'CRM workflow of the contact. Choose from the list, or specify by using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Workflow Stage Name or ID',
				name: 'workflowStage',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getWorkflowStages',
					loadOptionsDependsOn: ['additionalFields.workflow'],
				},
				description:
					'Stage of the chosen workflow. Choose from the list, or specify by using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Wallet Name or ID',
				name: 'currentWallet',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getWallets' },
				description:
					'Wallet that holds the contact. Choose from the list, or specify by using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(RESOURCE, ['update', 'updateByPhone']),
		options: [
			...sharedExtras,
			textField(
				'secondaryPhone0',
				'Secondary Phone 1',
				'e.g. 5511999990001',
				'Second phone of the contact (only on Update)',
			),
			textField(
				'secondaryPhone1',
				'Secondary Phone 2',
				'e.g. 5511999990002',
				'Third phone of the contact (only on Update)',
			),
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Custom Field',
				default: {},
				description: 'Custom field values (only on Update by Phone)',
				options: [
					{
						displayName: 'Field',
						name: 'items',
						values: [
							textField('label', 'Label', 'e.g. Plan', 'Label of the custom field'),
							textField('info', 'Info', 'e.g. Premium', 'Value of the custom field'),
						],
					},
				],
			},
		],
	},
];

const getByPhone: Handler = async function (i) {
	const phone = requirePhone(this, this.getNodeParameter('phone', i, '') as string, 'Phone', i);
	const channel = this.getNodeParameter('channel', i, 'whatsapp') as string;
	return asObject(
		await conversasRequest.call(this, 'GET', `/v2/contacts/${phone}/exists`, { qs: { channel } }),
	);
};

const getByCpf: Handler = async function (i) {
	// O CPF vai só com números na rota, mesmo digitado com ponto e traço.
	const cpf = onlyDigits(this.getNodeParameter('cpf', i, '') as string);
	const channel = this.getNodeParameter('channel', i, 'whatsapp') as string;
	return asObject(
		await conversasRequest.call(this, 'GET', `/v2/contacts/cpf/${cpf}/exists`, { qs: { channel } }),
	);
};

const getAll: Handler = async function (i) {
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	// Com limite pequeno pedimos só o necessário; senão páginas de 100, o teto das outras listas.
	const pageSize = returnAll ? 100 : Math.min(limit, 100);
	const channels = (options.channels as string[] | undefined) ?? [];
	return collectPages<IDataObject>(
		async (page) => {
			const qs: IDataObject = { page, limit: pageSize };
			if (channels.length > 0) qs.channels = channels.join(',');
			const response = await conversasRequest.call(this, 'GET', '/v2/customers', { qs });
			const items = Array.isArray(response) ? (response as IDataObject[]) : [];
			// A rota não devolve total: página menor que o tamanho pedido é a última.
			return { items, last: items.length < pageSize };
		},
		returnAll,
		limit,
	);
};

const create: Handler = async function (i) {
	const phone = requirePhone(this, this.getNodeParameter('phone', i, '') as string, 'Phone', i);
	const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	if (extra.workflowStage && !extra.workflow) {
		fail(
			this,
			"The 'Workflow' parameter is empty",
			'Choose a workflow before choosing its stage',
			i,
		);
	}
	const body: IDataObject = {
		cel_phone: phone,
		full_name: this.getNodeParameter('fullName', i) as string,
		integration: this.getNodeParameter('integration', i) as string,
		...additionalBody(extra),
		...compact({
			department_name: extra.departmentName,
			workflow_title: extra.workflow,
			workflow_stage_title: extra.workflowStage,
			current_wallet: extra.currentWallet,
		}),
	};
	return asObject(
		await conversasRequest.call(this, 'POST', '/v2/contacts/whatsapp-business-by-brokers', {
			body,
		}),
	);
};

const update: Handler = async function (i) {
	const phone = requirePhone(this, this.getNodeParameter('phone', i, '') as string, 'Phone', i);
	const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const body: IDataObject = {
		cel_phone: phone,
		full_name: this.getNodeParameter('fullName', i) as string,
		integration: this.getNodeParameter('integration', i) as string,
		...additionalBody(extra),
		...compact({
			cel_phone_secondary0: extra.secondaryPhone0,
			cel_phone_secondary1: extra.secondaryPhone1,
		}),
	};
	return asObject(
		await conversasRequest.call(this, 'PUT', '/v2/contacts/whatsapp-business-by-brokers', { body }),
	);
};

const updateByPhone: Handler = async function (i) {
	const phone = requirePhone(this, this.getNodeParameter('phone', i, '') as string, 'Phone', i);
	const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const customFields = (extra.customFields as IDataObject | undefined)?.items as
		| IDataObject[]
		| undefined;
	const body: IDataObject = {
		full_name: this.getNodeParameter('fullName', i) as string,
		...additionalBody(extra),
		// Formato dos itens NÃO CONFIRMADO na doc: usamos o mesmo `[{ label, info }]` que a leitura devolve.
		...compact({ customizable_field: customFields }),
	};
	return asObject(await conversasRequest.call(this, 'PATCH', `/v2/contacts/${phone}`, { body }));
};

const createMany: Handler = async function (i) {
	const rows =
		((this.getNodeParameter('contacts', i, {}) as IDataObject).items as IDataObject[]) ?? [];
	const contacts = rows.map((row) =>
		compact({
			cel_phone: requirePhone(this, String(row.phone ?? ''), 'Phone', i),
			full_name: row.fullName,
			email: row.email,
			cpf: row.cpf,
			tags: splitList(row.tags),
		}),
	);
	const response = asObject(
		await conversasRequest.call(this, 'POST', '/v2/contacts/bulk', { body: { contacts } }),
	);
	// O resultado útil é o job: a pessoa acompanha com Job: Get.
	return asObject(response.job);
};

/**
 * Monta o corpo do `DELETE /v2/contacts`. Aceita só `tag_name` ou só `integration`.
 * Nenhum caminho emite a chave `$all` (AD-008): o valor digitado, mesmo "$all", vai como TEXTO do filtro.
 */
export function buildBulkDeleteBody(filter: { tag?: string; integration?: string }): IDataObject {
	if (filter.tag !== undefined) return { tag_name: filter.tag };
	return { integration: filter.integration ?? '' };
}

const deleteManyByTag: Handler = async function (i) {
	const tag = String(this.getNodeParameter('tag', i, '') ?? '').trim();
	if (tag === '') {
		fail(
			this,
			"The 'Tag' parameter is empty",
			'Enter the tag whose contacts you want to delete',
			i,
		);
	}
	const response = await conversasRequest.call(this, 'DELETE', '/v2/contacts', {
		body: buildBulkDeleteBody({ tag }),
	});
	return asObject(response);
};

const deleteManyByIntegration: Handler = async function (i) {
	const integration = String(this.getNodeParameter('integration', i, '') ?? '').trim();
	if (integration === '') {
		fail(
			this,
			"The 'Integration' parameter is empty",
			'Choose the integration whose contacts you want to delete',
			i,
		);
	}
	const response = await conversasRequest.call(this, 'DELETE', '/v2/contacts', {
		body: buildBulkDeleteBody({ integration }),
	});
	return asObject(response);
};

export const contactResource: ResourceModule = {
	value: RESOURCE,
	name: 'Contact',
	operations,
	properties,
	handlers: {
		getByPhone,
		getByCpf,
		getAll,
		create,
		update,
		updateByPhone,
		createMany,
		deleteManyByTag,
		deleteManyByIntegration,
	},
};
