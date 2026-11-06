/**
 * Recursos pequenos, de uma ou duas operações cada: CRM Workflow, Job, Template e
 * WhatsApp Integration. Ficam juntos num arquivo só porque cada um é uma chamada direta
 * (uma rota, um parâmetro) e separá-los criaria quatro arquivos quase vazios.
 */
import type { INodeProperties } from 'n8n-workflow';

import { requireId, seg, showFor } from '../helpers';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asList, asObject, operationProperty } from './types';

const getAllOnly = (action: string, description: string) => [
	{ name: 'Get Many', value: 'getAll', action, description },
];

// --- CRM Workflow: os funis do CRM do Conversas, referenciados por título (a API não dá id). ---
const crmOperations = getAllOnly(
	'Get many CRM workflows',
	'List the CRM workflows with their stages',
);
export const crmWorkflowResource: ResourceModule = {
	value: 'crmWorkflow',
	name: 'CRM Workflow',
	operations: crmOperations,
	properties: [operationProperty('crmWorkflow', crmOperations, 'getAll')],
	handlers: {
		getAll: async function () {
			return asList(await conversasRequest.call(this, 'GET', '/v2/workflows'), 'workflows');
		},
	},
};

// --- Job: acompanha as criações em massa, que rodam em segundo plano. ---
const jobOperations = [
	{
		name: 'Get',
		value: 'get',
		action: 'Get a job',
		description: 'Get the status and result of a background job',
	},
];
const jobGet: Handler = async function (i) {
	const jobId = requireId(this, 'jobId', 'Job ID', i);
	return asObject(await conversasRequest.call(this, 'GET', `/v2/jobs/${seg(jobId)}`));
};
export const jobResource: ResourceModule = {
	value: 'job',
	name: 'Job',
	operations: jobOperations,
	properties: [
		operationProperty('job', jobOperations, 'get'),
		{
			displayName: 'Job ID',
			name: 'jobId',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. 6650f2a1b2c3d4e5f6a7b8c9',
			displayOptions: showFor('job', ['get']),
			description: 'ID returned by Create Many on contacts or employees',
		},
	],
	handlers: { get: jobGet },
};

// --- Template: modelos de mensagem aprovados. O envio fica no recurso Message. ---
const templateOperations = getAllOnly('Get many templates', 'List the message templates');
export const templateResource: ResourceModule = {
	value: 'template',
	name: 'Template',
	operations: templateOperations,
	properties: [operationProperty('template', templateOperations, 'getAll')],
	handlers: {
		getAll: async function () {
			return asList(await conversasRequest.call(this, 'GET', '/v2/template/all'), 'templates');
		},
	},
};

// --- WhatsApp Integration: os números ligados à conta; "oficiais" são os da API oficial. ---
const integrationOperations = getAllOnly(
	'Get many WhatsApp integrations',
	'List the WhatsApp integrations (numbers) of the account',
);
const integrationProperties: INodeProperties[] = [
	operationProperty('whatsappIntegration', integrationOperations, 'getAll'),
	{
		displayName: 'Official Only',
		name: 'officialOnly',
		type: 'boolean',
		default: false,
		displayOptions: showFor('whatsappIntegration', ['getAll']),
		description: 'Whether to list only the integrations of the official WhatsApp API',
	},
];
export const whatsappIntegrationResource: ResourceModule = {
	value: 'whatsappIntegration',
	name: 'WhatsApp Integration',
	operations: integrationOperations,
	properties: integrationProperties,
	handlers: {
		getAll: async function (i) {
			const official = this.getNodeParameter('officialOnly', i, false) as boolean;
			const path = official ? '/v2/whatsapp/integrations/official' : '/v2/whatsapp/integrations';
			return asList(await conversasRequest.call(this, 'GET', path), 'integrations');
		},
	},
};
