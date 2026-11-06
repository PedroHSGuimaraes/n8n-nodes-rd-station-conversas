/**
 * Recurso "Analytics": métricas de atendimento (retenção, avaliação, resumo) e origem dos contatos.
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { showFor, splitList } from '../helpers';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asObject, operationProperty } from './types';

const RESOURCE = 'analytics';

const operations: INodePropertyOptions[] = [
	{
		name: 'Get Attendance Summary',
		value: 'getAttendanceSummary',
		action: 'Get the attendance summary',
		description: 'Get the total of attendances and the average times',
	},
	{
		name: 'Get Contacts Origin',
		value: 'getContactsOrigin',
		action: 'Get the origin of the contacts',
		description: 'Get how many contacts came from each origin per day',
	},
	{
		name: 'Get Retention',
		value: 'getRetention',
		action: 'Get the retention',
		description: 'Get the percentage of attendances solved without a human',
	},
	{
		name: 'Get Reviews Average',
		value: 'getReviewsAverage',
		action: 'Get the average of the reviews',
		description: 'Get the average score of the attendance reviews',
	},
];

// Rota de cada operação; origem dos contatos é a única que não usa fuso horário.
const ROUTES: Record<string, string> = {
	getAttendanceSummary: '/v1/analytics/attendances/summary',
	getRetention: '/v1/analytics/attendances/retention',
	getReviewsAverage: '/v1/analytics/attendances/reviews/average',
	getContactsOrigin: '/v1/analytics/contacts/origin',
};

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAttendanceSummary'),
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(RESOURCE),
		description: 'Start of the period',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(RESOURCE),
		description: 'End of the period',
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: 'America/Sao_Paulo',
		placeholder: 'e.g. America/Sao_Paulo',
		displayOptions: {
			show: {
				resource: [RESOURCE],
				operation: ['getAttendanceSummary', 'getRetention', 'getReviewsAverage'],
			},
		},
		description: 'IANA timezone used to cut the days of the period',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: [RESOURCE], operation: ['getAttendanceSummary', 'getReviewsAverage'] },
		},
		options: [
			{
				displayName: 'Department Names or IDs',
				name: 'departmentIds',
				type: 'multiOptions',
				default: [],
				typeOptions: { loadOptionsMethod: 'getDepartments' },
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Employee Names or IDs',
				name: 'employeeIds',
				type: 'multiOptions',
				default: [],
				typeOptions: { loadOptionsMethod: 'getEmployees' },
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	},
];

// Data em ISO 8601: texto passa como veio; objeto Date vira ISO.
const iso = (value: unknown): string =>
	typeof value === 'string' ? value : new Date(value as number).toISOString();

// Lista vira "a,b" (a API aceita vírgula); texto solto de expressão é limpo do mesmo jeito.
const joined = (value: unknown): string =>
	(Array.isArray(value) ? (value as string[]) : splitList(value)).join(',');

const analytics = (operation: string): Handler =>
	async function (i) {
		const qs: IDataObject = {
			start_date: iso(this.getNodeParameter('startDate', i, '')),
			end_date: iso(this.getNodeParameter('endDate', i, '')),
		};
		if (operation !== 'getContactsOrigin') {
			qs.timezone = this.getNodeParameter('timezone', i, 'America/Sao_Paulo') as string;
		}
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		if (options.departmentIds) qs.department_ids = joined(options.departmentIds);
		if (options.employeeIds) qs.employee_ids = joined(options.employeeIds);
		return asObject(await conversasRequest.call(this, 'GET', ROUTES[operation], { qs }));
	};

export const analyticsResource: ResourceModule = {
	value: RESOURCE,
	name: 'Analytics',
	operations,
	properties,
	handlers: Object.fromEntries(Object.keys(ROUTES).map((name) => [name, analytics(name)])),
};
