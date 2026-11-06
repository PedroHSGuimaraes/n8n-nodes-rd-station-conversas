/**
 * Opções dos campos de escolha (menus suspensos): integração oficial, workflow do CRM,
 * etapa, carteira, atendente e departamento. A API não tem rota de departamentos, então
 * eles são montados a partir dos atendentes (limite do plano: os 50 primeiros).
 */
import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { conversasRequest } from '../transport';

const listOf = (response: unknown, key: string): IDataObject[] => {
	const list = (response as IDataObject | undefined)?.[key];
	return Array.isArray(list) ? (list as IDataObject[]) : [];
};

// Quantos atendentes consultamos para montar os departamentos: uma chamada por atendente.
const DEPARTMENT_EMPLOYEE_LIMIT = 50;

// Quantas dessas chamadas rodam juntas, para não abrir 50 conexões de uma vez.
const DEPARTMENT_BATCH = 10;

// Menu das integrações oficiais do WhatsApp.
export async function getOfficialIntegrations(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = await conversasRequest.call(this, 'GET', '/v2/whatsapp/integrations/official');
	return listOf(response, 'integrations').map((row) => ({
		name: String(row.label),
		value: String(row.key),
	}));
}

// Menu dos workflows do CRM (o título é o valor).
export async function getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await conversasRequest.call(this, 'GET', '/v2/workflows');
	// Workflows não têm id: o título é o valor.
	return listOf(response, 'workflows').map((row) => ({
		name: String(row.title),
		value: String(row.title),
	}));
}

// Menu das etapas do workflow escolhido.
export async function getWorkflowStages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const chosen = this.getCurrentNodeParameter('additionalFields.workflow') as string | undefined;
	if (!chosen) return [];
	const response = await conversasRequest.call(this, 'GET', '/v2/workflows');
	const workflow = listOf(response, 'workflows').find((row) => row.title === chosen);
	const stages = (workflow?.stages as string[] | undefined) ?? [];
	return stages.map((stage) => ({ name: stage, value: stage }));
}

// Menu das carteiras.
export async function getWallets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = (await conversasRequest.call(this, 'GET', '/v2/wallets')) as IDataObject;
	const names = Array.isArray(response?.wallets) ? (response.wallets as string[]) : [];
	return names.map((name) => ({ name, value: name }));
}

// Menu dos atendentes.
export async function getEmployees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await conversasRequest.call(this, 'GET', '/v2/employees');
	return listOf(response, 'employees').map((row) => ({
		name: String(row.name),
		value: String(row.id),
	}));
}

/**
 * Departamentos: junta os `departments` de `GET /v1/employees/{id}` dos primeiros 50
 * atendentes, sem repetir `key`. O valor é o `key` (suposição do plano, NÃO CONFIRMADA na doc).
 */
export async function getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const employees = listOf(
		await conversasRequest.call(this, 'GET', '/v2/employees'),
		'employees',
	).slice(0, DEPARTMENT_EMPLOYEE_LIMIT);

	const byKey = new Map<string, string>();
	for (let start = 0; start < employees.length; start += DEPARTMENT_BATCH) {
		const batch = employees.slice(start, start + DEPARTMENT_BATCH);
		const details = await Promise.all(
			batch.map((employee) =>
				conversasRequest.call(this, 'GET', `/v1/employees/${String(employee.id)}`),
			),
		);
		for (const detail of details) {
			for (const department of listOf(detail, 'departments')) {
				const key = String(department.key);
				if (!byKey.has(key)) byKey.set(key, String(department.name ?? key));
			}
		}
	}
	return [...byKey.entries()].map(([value, name]) => ({ name, value }));
}
