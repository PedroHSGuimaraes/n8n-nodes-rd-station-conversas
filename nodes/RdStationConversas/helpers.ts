/**
 * Funções pequenas e puras que todos os recursos do node usam: erros no formato
 * do n8n, telefone, CPF, localizador de ID e montagem de corpo sem campos vazios.
 * Ficam aqui, e não espalhadas por recurso, para ter uma única regra de cada coisa
 * (por exemplo, um único jeito de validar telefone).
 */
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { conversasRequest } from './transport';

// Contexto que as funções aceitam: execução normal ou carga de listas no editor.
export type Ctx = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Lança o erro no padrão da UX guideline do n8n: mensagem com o `[item N]` no fim
 * e descrição que diz como sair do problema. `never` avisa o compilador que não volta.
 */
export function fail(ctx: Ctx, message: string, description: string, itemIndex: number): never {
	throw new NodeOperationError(ctx.getNode(), `${message} [item ${itemIndex}]`, {
		description,
		itemIndex,
	});
}

// Só os dígitos de um texto: base de telefone e CPF digitados com máscara.
export function onlyDigits(value: string): string {
	return value.replace(/\D/g, '');
}

/**
 * Normaliza o telefone: tira `+`, espaços, hífen e parênteses e aceita de 8 a 15 dígitos (E.164).
 * Devolve `null` quando não serve, para o chamador decidir a mensagem.
 */
export function normalizePhone(raw: string): string | null {
	const digits = onlyDigits(String(raw ?? ''));
	return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

// Lê o telefone de um parâmetro e recusa o inválido antes de qualquer requisição.
export function requirePhone(ctx: Ctx, raw: string, label: string, itemIndex: number): string {
	const phone = normalizePhone(raw);
	if (phone === null) {
		fail(
			ctx,
			`The '${label}' parameter is invalid`,
			'Use the international format with country code, digits only, e.g. 5511999998888',
			itemIndex,
		);
	}
	return phone;
}

// Separa "vip, novo" em ["vip", "novo"], sem itens vazios.
export function splitList(value: unknown): string[] {
	return String(value ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

/**
 * Copia para o corpo só os campos preenchidos. A API trata campo vazio como "apagar",
 * então mandar `""` ou `undefined` sem querer limparia dados do contato.
 */
export function compact(source: IDataObject): IDataObject {
	const result: IDataObject = {};
	for (const [key, value] of Object.entries(source)) {
		const empty =
			value === undefined ||
			value === null ||
			value === '' ||
			(Array.isArray(value) && value.length === 0);
		if (!empty) result[key] = value;
	}
	return result;
}

/**
 * Lê um parâmetro Resource Locator. Aceita o objeto `{ mode, value }` do n8n
 * e também uma string solta (workflows antigos ou expressões), tratada como ID.
 */
export function readLocator(
	ctx: IExecuteFunctions,
	name: string,
	itemIndex: number,
): { mode: string; value: string } {
	const raw = ctx.getNodeParameter(name, itemIndex, '') as unknown;
	if (raw !== null && typeof raw === 'object') {
		const locator = raw as { mode?: string; value?: unknown };
		return { mode: locator.mode ?? 'id', value: String(locator.value ?? '').trim() };
	}
	return { mode: 'id', value: String(raw ?? '').trim() };
}

// Lê o ID de um localizador comum (modos lista e ID) e recusa o vazio.
export function requireId(
	ctx: IExecuteFunctions,
	name: string,
	label: string,
	itemIndex: number,
): string {
	const { value } = readLocator(ctx, name, itemIndex);
	if (value === '') {
		fail(ctx, `The '${label}' parameter is empty`, `Choose or enter the ${label} ID`, itemIndex);
	}
	return value;
}

/**
 * Descobre o `_id` do contato. Nos modos lista e ID o valor já é o `_id`.
 * No modo telefone, a API só aceita `_id` nas rotas de envio, então resolvemos o
 * telefone em `GET /v2/contacts/{telefone}/exists` (AD-005).
 */
export async function resolveContact(
	ctx: IExecuteFunctions,
	name: string,
	itemIndex: number,
): Promise<string> {
	const { mode, value } = readLocator(ctx, name, itemIndex);
	if (value === '') {
		fail(
			ctx,
			"The 'Contact' parameter is empty",
			'Choose a contact, or enter a phone or ID',
			itemIndex,
		);
	}
	if (mode !== 'phone') return value;

	const phone = requirePhone(ctx, value, 'Contact', itemIndex);
	try {
		const response = (await conversasRequest.call(ctx, 'GET', `/v2/contacts/${phone}/exists`, {
			qs: { channel: 'whatsapp' },
		})) as IDataObject;
		const id = (response.data as IDataObject | undefined)?._id;
		if (typeof id === 'string' && id !== '') return id;
	} catch (error) {
		// Só o 404 vira a mensagem de "contato não encontrado"; os demais erros seguem como vieram.
		// O erro já é um NodeApiError feito por `conversasRequest`; repassá-lo mantém a mensagem da API.
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
		if (!(error instanceof NodeApiError) || String(error.httpCode) !== '404') throw error;
	}
	return fail(
		ctx,
		"No contact found for the phone in the 'Contact' parameter",
		'Check the number or create the contact first',
		itemIndex,
	);
}

// Atalho para mostrar uma propriedade só em certas operações de um recurso.
export function showFor(
	resource: string,
	operations?: string[],
): INodeProperties['displayOptions'] {
	return operations
		? { show: { resource: [resource], operation: operations } }
		: { show: { resource: [resource] } };
}

// "Return All" e "Limit" padrão das listas paginadas (UX guideline do n8n).
export function returnAllAndLimit(resource: string, operations: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: showFor(resource, operations),
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: {
				show: { resource: [resource], operation: operations, returnAll: [false] },
			},
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
		},
	];
}
