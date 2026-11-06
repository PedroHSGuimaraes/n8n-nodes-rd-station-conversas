/**
 * Listas pesquisáveis dos campos de ID (modo "From List"): contato, template, atendente,
 * fluxo, campanha e campo personalizado. Cada função chama a rota de listagem da API
 * e filtra o texto digitado aqui, porque a API não tem busca por nome (exceto o campo personalizado).
 */
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { conversasRequest } from '../transport';

// Compara sem diferenciar maiúscula nem acento: "ânia" acha "ANIA".
const fold = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const matches = (name: string, filter?: string): boolean =>
	!filter || fold(name).includes(fold(filter));

// Monta o resultado do n8n a partir de uma lista de objetos da API.
function toResults(
	rows: IDataObject[],
	nameKey: string,
	valueKey: string,
	filter?: string,
): INodeListSearchItems[] {
	return rows
		.filter((row) => matches(String(row[nameKey] ?? ''), filter))
		.map((row) => ({ name: String(row[nameKey]), value: String(row[valueKey]) }));
}

// Lê a lista que fica dentro de uma chave da resposta (`{ flows: [...] }`).
const listOf = (response: unknown, key: string): IDataObject[] => {
	const list = (response as IDataObject | undefined)?.[key];
	return Array.isArray(list) ? (list as IDataObject[]) : [];
};

/**
 * Contatos: a única listagem paginada. `paginationToken` é o número da próxima página;
 * uma página cheia (100) indica que pode haver mais.
 */
export async function searchContacts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const pageSize = 100;
	const response = await conversasRequest.call(this, 'GET', '/v2/customers', {
		qs: { page, limit: pageSize },
	});
	const rows = Array.isArray(response) ? (response as IDataObject[]) : [];
	return {
		results: toResults(rows, 'full_name', '_id', filter),
		paginationToken: rows.length === pageSize ? String(page + 1) : undefined,
	};
}

export async function searchTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await conversasRequest.call(this, 'GET', '/v2/template/all');
	return { results: toResults(listOf(response, 'templates'), 'title', 'id', filter) };
}

export async function searchEmployees(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await conversasRequest.call(this, 'GET', '/v2/employees');
	return { results: toResults(listOf(response, 'employees'), 'name', 'id', filter) };
}

export async function searchFlows(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await conversasRequest.call(this, 'GET', '/v2/flows');
	return { results: toResults(listOf(response, 'flows'), 'title', 'id', filter) };
}

export async function searchCampaigns(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const response = (await conversasRequest.call(this, 'GET', '/v1/campaigns', {
		qs: { page, limit: 100 },
	})) as IDataObject;
	return {
		results: toResults(listOf(response, 'campaigns'), 'title', 'id', filter),
		// A rota diz sozinha se há mais páginas.
		paginationToken: response?.has_more === true ? String(page + 1) : undefined,
	};
}

export async function searchCustomFields(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const pageSize = 100;
	// Esta rota tem busca própria por `label`, então o filtro vai na requisição.
	const qs: IDataObject = { page, limit: pageSize };
	if (filter) qs.label = filter;
	const response = (await conversasRequest.call(this, 'GET', '/v2/custom-fields', {
		qs,
	})) as IDataObject;
	return {
		results: toResults(listOf(response, 'data'), 'label', 'id'),
		paginationToken: page * pageSize < Number(response?.total ?? 0) ? String(page + 1) : undefined,
	};
}
