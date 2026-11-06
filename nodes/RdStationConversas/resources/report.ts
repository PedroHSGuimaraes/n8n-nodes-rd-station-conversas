/**
 * Recurso "Report": relatórios de atendimento (v4) e relatório por destinatário de campanha.
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { requireId, returnAllAndLimit, showFor } from '../helpers';
import { locator } from '../locators';
import { collectPages } from '../pagination';
import { conversasRequest } from '../transport';
import {
	type Handler,
	type ResourceModule,
	asList,
	asObject,
	operationProperty,
	toDay,
} from './types';

const RESOURCE = 'report';

const operations: INodePropertyOptions[] = [
	{
		name: 'Get Campaign Report',
		value: 'getCampaignReport',
		action: 'Get the report of a campaign',
		description: 'Get the delivery result of each recipient of a campaign',
	},
	{
		name: 'Get Many',
		value: 'getAll',
		action: 'Get many reports',
		description: 'Get the attendance reports of a period of up to 3 months',
	},
];

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAll'),
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(RESOURCE, ['getAll']),
		description: 'First day of the period',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(RESOURCE, ['getAll']),
		description: 'Last day of the period. The period can have at most 3 months.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: 'operators',
		displayOptions: showFor(RESOURCE, ['getAll']),
		options: [
			{ name: 'Chatbots', value: 'chatbots' },
			{ name: 'Customers', value: 'customers' },
			{ name: 'Operators', value: 'operators' },
			{ name: 'Rejected', value: 'rejecteds' },
		],
		description: 'Kind of report to return',
	},
	locator({
		displayName: 'Campaign',
		name: 'campaign',
		searchMethod: 'searchCampaigns',
		resource: RESOURCE,
		operations: ['getCampaignReport'],
	}),
	...returnAllAndLimit(RESOURCE, ['getCampaignReport']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(RESOURCE, ['getAll']),
		options: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				default: 'whatsapp',
				options: [
					{ name: 'Email', value: 'email' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'Megasac', value: 'megasac' },
					{ name: 'Messenger', value: 'messenger' },
					{ name: 'Telegram', value: 'telegram' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				description: 'Return only this channel',
			},
			{
				displayName: 'Department Name or ID',
				name: 'department',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Employee Name or ID',
				name: 'employee',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getEmployees' },
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'opened',
				options: [
					{ name: 'Closed', value: 'closed' },
					{ name: 'Opened', value: 'opened' },
				],
				description: 'Return only attendances with this status',
			},
			{
				displayName: 'Tabulation',
				name: 'tabulation',
				type: 'string',
				default: '',
				placeholder: 'e.g. Sale closed',
				description: 'Return only attendances with this tabulation',
			},
		],
	},
];

const getAll: Handler = async function (i) {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const qs: IDataObject = {
		start_date: toDay(this.getNodeParameter('startDate', i, '')),
		end_date: toDay(this.getNodeParameter('endDate', i, '')),
		type: this.getNodeParameter('type', i, 'operators') as string,
	};
	// Só envia os filtros que a pessoa escolheu.
	for (const key of ['channel', 'department', 'employee', 'status', 'tabulation']) {
		if (options[key]) qs[key] = options[key];
	}
	return asList(await conversasRequest.call(this, 'GET', '/v4/reports', { qs }), 'docs');
};

const getCampaignReport: Handler = async function (i) {
	const campaign = requireId(this, 'campaign', 'Campaign', i);
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	// O teto da rota é 50 por página.
	const pageSize = returnAll ? 50 : Math.min(limit, 50);
	return collectPages<IDataObject>(
		async (page) => {
			const response = asObject(
				await conversasRequest.call(this, 'GET', `/v4/reports/campaign/${campaign}`, {
					qs: { page, limit: pageSize },
				}),
			);
			// A resposta diz quantas páginas existem; a última é a que alcança `pages`.
			return { items: asList(response, 'docs'), last: page >= Number(response.pages ?? 1) };
		},
		returnAll,
		limit,
	);
};

export const reportResource: ResourceModule = {
	value: RESOURCE,
	name: 'Report',
	operations,
	properties,
	handlers: { getAll, getCampaignReport },
};
