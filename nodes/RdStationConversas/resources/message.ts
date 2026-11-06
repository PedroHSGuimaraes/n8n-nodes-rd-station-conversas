/**
 * Recurso "Message": enviar mensagem (com anexo opcional), enviar template do WhatsApp
 * e ler o histórico já decriptado. As rotas deprecadas de template preenchido ficam
 * de fora (AD-007).
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	fail,
	readLocator,
	requirePhone,
	resolveContact,
	seg,
	returnAllAndLimit,
	showFor,
} from '../helpers';
import { decryptJwe } from '../jwe';
import { locator } from '../locators';
import { collectPages } from '../pagination';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asObject, operationProperty } from './types';

const RESOURCE = 'message';

const operations: INodePropertyOptions[] = [
	{
		name: 'Get History',
		value: 'getHistory',
		action: 'Get the message history of a contact',
		description:
			'Get the decrypted message history of a contact. Needs the Pro or Advanced plan and the private key in the credential.',
	},
	{
		name: 'Send',
		value: 'send',
		action: 'Send a message',
		description: 'Send a text message, with an optional file, to a contact',
	},
	{
		name: 'Send Template',
		value: 'sendTemplate',
		action: 'Send a template message',
		description:
			'Send an approved WhatsApp template to a phone number. A 201 answer does not guarantee delivery, and the template does not open a conversation until the contact replies.',
	},
];

const sentByProperty = (operationsList: string[]): INodeProperties => ({
	displayName: 'Sent By',
	name: 'sentBy',
	type: 'options',
	default: 'bot',
	displayOptions: showFor(RESOURCE, operationsList),
	options: [
		{ name: 'Bot', value: 'bot' },
		{ name: 'Operator', value: 'operator' },
	],
	description: 'Whether the message is sent as the bot or as an employee',
});

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'send'),
	locator({
		displayName: 'Contact',
		name: 'contact',
		searchMethod: 'searchContacts',
		resource: RESOURCE,
		operations: ['send', 'getHistory'],
		withPhone: true,
	}),
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 5511999998888',
		hint: 'International format, digits only, e.g. 5511999998888',
		displayOptions: showFor(RESOURCE, ['sendTemplate']),
		description: 'Phone number that receives the template',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		typeOptions: { rows: 4 },
		default: '',
		placeholder: 'e.g. Hello! Your order is ready',
		displayOptions: showFor(RESOURCE, ['send']),
		description: 'Text of the message',
	},
	locator({
		displayName: 'Template',
		name: 'template',
		searchMethod: 'searchTemplates',
		resource: RESOURCE,
		operations: ['sendTemplate'],
	}),
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Variable',
		default: {},
		displayOptions: showFor(RESOURCE, ['sendTemplate']),
		description: 'Values that replace the template fields, in order',
		options: [
			{
				displayName: 'Variable',
				name: 'items',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'e.g. Ana',
						description: 'Value of one template field',
					},
				],
			},
		],
	},
	sentByProperty(['send', 'sendTemplate']),
	locator({
		displayName: 'Employee',
		name: 'employee',
		searchMethod: 'searchEmployees',
		resource: RESOURCE,
		operations: ['send', 'sendTemplate'],
		required: false,
		description: 'Employee who sends the message. Needed when Sent By is Operator',
	}),
	{
		displayName: 'Attach Binary Property',
		name: 'attachBinaryProperty',
		type: 'string',
		default: '',
		placeholder: 'e.g. data',
		displayOptions: showFor(RESOURCE, ['send']),
		description:
			'Name of the binary property with the file to attach. Leave empty to send text only.',
	},
	...returnAllAndLimit(RESOURCE, ['getHistory']),
	{
		displayName: 'Options',
		name: 'templateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(RESOURCE, ['sendTemplate']),
		options: [
			{
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'string',
				default: '55',
				placeholder: 'e.g. 55',
				description: 'Country code of the phone number',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(RESOURCE, ['getHistory']),
		options: [
			{
				displayName: 'Channels',
				name: 'channel',
				type: 'multiOptions',
				default: ['whatsapp'],
				options: [
					{ name: 'Email', value: 'email' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'Megasac', value: 'megasac' },
					{ name: 'Messenger', value: 'messenger' },
					{ name: 'Telegram', value: 'telegram' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				description: 'Channels to read messages from',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Return messages up to this day',
			},
			{
				displayName: 'Sent By',
				name: 'sentBy',
				type: 'multiOptions',
				default: ['customer', 'operator'],
				options: [
					{ name: 'Bot', value: 'bot' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Operator', value: 'operator' },
				],
				description: 'Who sent the messages to return',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Return messages from this day on',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'multiOptions',
				default: ['text'],
				options: [
					{ name: 'Audio', value: 'audio' },
					{ name: 'Document', value: 'document' },
					{ name: 'Image', value: 'image' },
					{ name: 'Text', value: 'text' },
					{ name: 'Video', value: 'video' },
				],
				description: 'Message types to return',
			},
		],
	},
];

// Envia mensagem de texto, com anexo opcional, para o contato escolhido.
const send: Handler = async function (i) {
	const sentBy = this.getNodeParameter('sentBy', i, 'bot') as string;
	let operator = '';
	if (sentBy === 'operator') {
		operator = readLocator(this, 'employee', i).value;
		if (operator === '') {
			fail(
				this,
				"The 'Employee' parameter is empty",
				'Choose the employee who sends the message, or use Sent By: Bot',
				i,
			);
		}
	}
	const text = String(this.getNodeParameter('message', i, '') ?? '');
	const attachName = String(this.getNodeParameter('attachBinaryProperty', i, '') ?? '').trim();
	// Sem texto e sem anexo a API receberia uma mensagem vazia.
	if (text.trim() === '' && attachName === '') {
		fail(this, "The 'Message' parameter is empty", 'Write the message or attach a file', i);
	}
	// Todas as validações locais vêm antes de resolver o contato: no modo telefone isso custa uma requisição.
	const contactId = await resolveContact(this, 'contact', i);
	const fields: Array<[string, string]> = [
		['message', text],
		['sent_by', sentBy],
	];
	if (operator !== '') fields.push(['operator', operator]);

	const attachProperty = (this.getNodeParameter('attachBinaryProperty', i, '') as string).trim();
	const path = `/v2/messages/${seg(contactId)}/send`;
	if (attachProperty === '') {
		// Sem anexo a doc pede `application/x-www-form-urlencoded`.
		const body = new URLSearchParams(fields);
		return asObject(
			await conversasRequest.call(this, 'POST', path, {
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			}),
		);
	}
	// Com anexo o campo `attach` é binário, o que só cabe em multipart (suposição do plano).
	const binary = this.helpers.assertBinaryData(i, attachProperty);
	const buffer = await this.helpers.getBinaryDataBuffer(i, attachProperty);
	const form = new FormData();
	for (const [name, value] of fields) form.append(name, value);
	form.append(
		'attach',
		new Blob([buffer], { type: binary.mimeType }),
		binary.fileName ?? 'attachment',
	);
	return asObject(await conversasRequest.call(this, 'POST', path, { body: form }));
};

// Envia um template do WhatsApp para um telefone.
const sendTemplate: Handler = async function (i) {
	const phone = requirePhone(this, this.getNodeParameter('phone', i, '') as string, 'Phone', i);
	const templateId = readLocator(this, 'template', i).value;
	if (templateId === '') {
		fail(this, "The 'Template' parameter is empty", 'Choose the template to send', i);
	}
	const sentBy = this.getNodeParameter('sentBy', i, 'bot') as string;
	const options = this.getNodeParameter('templateOptions', i, {}) as IDataObject;
	const variables = (
		((this.getNodeParameter('variables', i, {}) as IDataObject).items as IDataObject[]) ?? []
	).map((entry) => String(entry.value ?? ''));

	const body: IDataObject = {
		recipient_number: phone,
		template_message_id: templateId,
		country_code: (options.countryCode as string) || '55',
		sent_by: sentBy,
	};
	if (variables.length > 0) body.variables = variables;
	if (sentBy === 'operator') {
		const operator = readLocator(this, 'employee', i).value;
		if (operator === '') {
			fail(this, "The 'Employee' parameter is empty", 'Choose an employee, or use Sent By: Bot', i);
		}
		body.operator_id = operator;
	}

	try {
		const response = asObject(
			await conversasRequest.call(this, 'POST', '/v3/messages/template/send', { body }),
		);
		// Devolvemos só o que a doc descreve; o 201 não prova que a mensagem foi entregue.
		return { data: response.data ?? null, message: response.message ?? null };
	} catch (error) {
		const data = ((error as NodeApiError).context as IDataObject | undefined)?.data as
			| IDataObject
			| undefined;
		if (error instanceof NodeApiError && String(error.httpCode) === '404' && data?.code === 301) {
			throw new NodeApiError(this.getNode(), data as never, {
				message: `No contact found for the phone ${phone} [item ${i}]`,
				description: 'There is no contact with this number. Create the contact first',
				httpCode: '404',
				itemIndex: i,
			});
		}
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
		throw error;
	}
};

// Lê o histórico do contato e abre o JWE com a chave da credencial.
const getHistory: Handler = async function (i) {
	// A chave é exigida antes de qualquer chamada: sem ela o histórico não abre.
	const credentials = await this.getCredentials('rdStationConversasApi');
	const rawKey = String(credentials.privateKeyJwk ?? '').trim();
	if (rawKey === '') {
		fail(
			this,
			"The credential 'Private Key (JWK)' is empty",
			'Generate the key in RD Station Conversas: Apps and Integrations, API, Generate Key, then paste the JWK JSON in the credential',
			i,
		);
	}
	let jwk: Record<string, unknown>;
	try {
		jwk = JSON.parse(rawKey) as Record<string, unknown>;
	} catch {
		return fail(
			this,
			"The credential 'Private Key (JWK)' is not valid JSON",
			'Paste the whole JWK JSON that RD Station Conversas generated, including the braces',
			i,
		);
	}

	const customerId = await resolveContact(this, 'contact', i);
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	// O critério fixa páginas de 100; o limite do usuário só corta o resultado (`collectPages`).
	const pageSize = 100;

	try {
		return await collectPages<IDataObject>(
			async (page) => {
				const qs: IDataObject = {
					customer_id: customerId,
					limit: pageSize,
					page,
					// Padrões da doc: só WhatsApp, só mensagens de cliente e atendente, só texto.
					channel: (options.channel as string[] | undefined) ?? ['whatsapp'],
					sent_by: (options.sentBy as string[] | undefined) ?? ['customer', 'operator'],
					type: (options.type as string[] | undefined) ?? ['text'],
				};
				// A API quer a data como YYYY-MM-DD; o n8n entrega ISO completo, então cortamos.
				if (options.startDate) qs.start_date = String(options.startDate).slice(0, 10);
				if (options.endDate) qs.end_date = String(options.endDate).slice(0, 10);
				const response = asObject(
					await conversasRequest.call(this, 'GET', '/v2/messages/history', { qs }),
				);
				let decoded: unknown = response.messages;
				if (typeof response.messages === 'string' && response.messages !== '') {
					const result = decryptJwe(response.messages, jwk);
					if (!result.ok) {
						return fail(
							this,
							'The messages could not be decrypted',
							`The message was encrypted with '${result.enc || 'an unknown format'}'. Check that the key in the credential is the one generated for the same account as the token`,
							i,
						);
					}
					decoded = result.value;
				}
				const messages = Array.isArray(decoded) ? (decoded as IDataObject[]) : [];
				return { items: messages, last: messages.length < pageSize };
			},
			returnAll,
			limit,
		);
	} catch (error) {
		if (error instanceof NodeApiError && String(error.httpCode) === '403') {
			throw new NodeApiError(this.getNode(), {} as never, {
				message: error.message,
				description: 'Message history needs the Pro or Advanced plan',
				httpCode: '403',
				itemIndex: i,
			});
		}
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
		throw error;
	}
};

export const messageResource: ResourceModule = {
	value: RESOURCE,
	name: 'Message',
	operations,
	properties,
	handlers: { send, sendTemplate, getHistory },
};
