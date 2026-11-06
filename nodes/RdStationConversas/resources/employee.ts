/**
 * Recurso "Employee": os atendentes do Conversas. Lista, lê (com departamentos),
 * ativa, desativa e cria/desativa em massa. As operações em massa exigem o plano Advanced.
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { fail, requireId, seg, showFor, splitList } from '../helpers';
import { locator } from '../locators';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asList, asObject, operationProperty } from './types';

const RESOURCE = 'employee';

const operations: INodePropertyOptions[] = [
	{
		name: 'Activate',
		value: 'activate',
		action: 'Activate an employee',
		description: 'Activate an employee',
	},
	{
		name: 'Create Many',
		value: 'createMany',
		action: 'Create many employees',
		description:
			'Create several employees at once. Needs the Advanced plan and runs in the background, so it returns a job.',
	},
	{
		name: 'Deactivate',
		value: 'deactivate',
		action: 'Deactivate an employee',
		description: 'Deactivate an employee',
	},
	{
		name: 'Deactivate Many',
		value: 'deactivateMany',
		action: 'Deactivate many employees',
		description: 'Deactivate several employees at once. Needs the Advanced plan.',
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get an employee',
		description: 'Get the email, role and departments of an employee',
	},
	{
		name: 'Get Many',
		value: 'getAll',
		action: 'Get many employees',
		description: 'List all employees',
	},
];

const employeeLocator = locator({
	displayName: 'Employee',
	name: 'employee',
	searchMethod: 'searchEmployees',
	resource: RESOURCE,
	operations: ['get', 'activate', 'deactivate'],
});

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAll'),
	employeeLocator,
	{
		displayName: 'Employee Names or IDs',
		name: 'employeeIds',
		type: 'multiOptions',
		required: true,
		default: [],
		typeOptions: { loadOptionsMethod: 'getEmployees' },
		displayOptions: showFor(RESOURCE, ['deactivateMany']),
		description:
			'Employees to deactivate. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Employees',
		name: 'employees',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Employee',
		default: {},
		displayOptions: showFor(RESOURCE, ['createMany']),
		options: [
			{
				displayName: 'Employee',
				name: 'items',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'e.g. name@email.com',
						default: '',
						required: true,
						description: 'Email of the employee',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. Ana Souza',
						required: true,
						description: 'Name of the employee',
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						default: 'operator',
						required: true,
						options: [
							{ name: 'Admin', value: 'admin' },
							{ name: 'Manager', value: 'manager' },
							{ name: 'Operator', value: 'operator' },
						],
						description:
							'Role of the employee. The API documents these values for reading; they are assumed for creation.',
					},
				],
			},
		],
	},
];

const getAll: Handler = async function () {
	return asList(await conversasRequest.call(this, 'GET', '/v2/employees'), 'employees');
};

const get: Handler = async function (i) {
	const id = requireId(this, 'employee', 'Employee', i);
	return asObject(await conversasRequest.call(this, 'GET', `/v1/employees/${seg(id)}`));
};

// Ativar e desativar são a mesma chamada com o verbo trocado no fim da rota.
const toggle = (action: 'activate' | 'deactivate'): Handler =>
	async function (i) {
		const id = requireId(this, 'employee', 'Employee', i);
		return asObject(await conversasRequest.call(this, 'PUT', `/v2/employees/${seg(id)}/${action}`));
	};

const deactivateMany: Handler = async function (i) {
	const raw = this.getNodeParameter('employeeIds', i, []) as string[] | string;
	// Aceita a lista do n8n e também texto separado por vírgula vindo de expressão.
	const ids = Array.isArray(raw) ? raw : splitList(raw);
	if (ids.length === 0)
		fail(this, "The 'Employees' parameter is empty", 'Choose at least one employee', i);
	const response = await conversasRequest.call(this, 'PATCH', '/v2/employees/deactivate', {
		body: { employees_ids: ids },
	});
	if (!Array.isArray(response)) return asObject(response);
	// 200 e 207 trazem uma linha por atendente; ficam só os quatro campos documentados.
	return (response as IDataObject[]).map((row) => ({
		employee_id: row.employee_id,
		success: row.success,
		status_code: row.status_code,
		status_message: row.status_message,
	}));
};

const createMany: Handler = async function (i) {
	const rows =
		((this.getNodeParameter('employees', i, {}) as IDataObject).items as IDataObject[]) ?? [];
	if (rows.length === 0)
		fail(this, "The 'Employees' parameter is empty", 'Add at least one employee', i);
	const employees = rows.map((row) => ({ email: row.email, name: row.name, role: row.role }));
	const response = asObject(
		await conversasRequest.call(this, 'POST', '/v2/employees/bulk', { body: { employees } }),
	);
	return asObject(response.job);
};

export const employeeResource: ResourceModule = {
	value: RESOURCE,
	name: 'Employee',
	operations,
	properties,
	handlers: {
		getAll,
		get,
		activate: toggle('activate'),
		deactivate: toggle('deactivate'),
		deactivateMany,
		createMany,
	},
};
