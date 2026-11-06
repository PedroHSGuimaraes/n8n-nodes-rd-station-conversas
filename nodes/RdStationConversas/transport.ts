/**
 * Camada de rede do node: toda chamada à API do RD Station Conversas passa por
 * `conversasRequest`. Ter um ponto só garante a base fixa, o `timeout` explícito
 * e a conversão de erro HTTP em `NodeApiError` no mesmo formato em todas as operações.
 */
import {
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INode,
	type JsonObject,
	type NodeOperationError,
	NodeApiError,
} from 'n8n-workflow';

// A doc só documenta este servidor; por isso não existe campo de URL base na credencial.
export const BASE_URL = 'https://api.tallos.com.br';

// A doc não informa o tempo de resposta; 30 s cobre listas grandes (suposição do plano).
export const REQUEST_TIMEOUT_MS = 30000;

type Ctx = IExecuteFunctions | ILoadOptionsFunctions;

export interface RequestExtras {
	// Troca o erro da API por outro mais claro (ex.: 404 vira "contato não encontrado"); `undefined` mantém o original.
	mapError?: (error: NodeApiError) => NodeApiError | NodeOperationError | undefined;
	qs?: IDataObject;
	body?: IHttpRequestOptions['body'];
	headers?: IDataObject;
}

// Tira do erro o status HTTP e o corpo da API, qualquer que seja o formato que o n8n entregue.
function readHttpError(error: unknown): { status: string; body: IDataObject } {
	const raw = error as {
		httpCode?: string | number;
		statusCode?: string | number;
		response?: { status?: number; data?: unknown; body?: unknown };
		context?: { data?: unknown };
		cause?: { response?: { data?: unknown } };
	};
	const status = String(raw.httpCode ?? raw.statusCode ?? raw.response?.status ?? '');
	const candidate =
		raw.context?.data ?? raw.response?.data ?? raw.response?.body ?? raw.cause?.response?.data;
	const body =
		candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)
			? (candidate as IDataObject)
			: {};
	return { status, body };
}

/**
 * Monta o NodeApiError no formato da UX guideline: a mensagem é a `message` da API
 * e a descrição lista um `campo: mensagem` por linha do `errors[]`.
 */
export function buildApiError(node: INode, error: unknown): NodeApiError {
	const { status, body } = readHttpError(error);
	const apiMessage = typeof body.message === 'string' ? body.message : undefined;
	const fields = Array.isArray(body.errors)
		? (body.errors as IDataObject[])
				.map((entry) => `${String(entry.field ?? '')}: ${String(entry.message ?? '')}`.trim())
				.filter((line) => line !== ':')
		: [];
	const apiError = new NodeApiError(node, (body as JsonObject) ?? {}, {
		message: apiMessage ?? (error as Error).message ?? 'RD Station Conversas rejected the request',
		description: fields.length > 0 ? fields.join('\n') : undefined,
		httpCode: status === '' ? undefined : status,
	});
	// Guarda o corpo cru para quem quiser ler o `code` da API (ex.: 301 em "contato não existe").
	(apiError.context as IDataObject).data = body;
	return apiError;
}

/**
 * Faz uma chamada autenticada. Devolve o corpo da resposta (string vazia em `204`).
 * Qualquer falha vira `NodeApiError`; quem precisa de mensagem própria (404, 403)
 * captura e troca, sem refazer a leitura do corpo.
 */
export async function conversasRequest(
	this: Ctx,
	method: IHttpRequestMethods,
	path: string,
	extras: RequestExtras = {},
): Promise<unknown> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		json: true,
		timeout: REQUEST_TIMEOUT_MS,
	};
	if (extras.qs && Object.keys(extras.qs).length > 0) options.qs = extras.qs;
	if (extras.body !== undefined) options.body = extras.body;
	if (extras.headers) options.headers = extras.headers;

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'rdStationConversasApi',
			options,
		);
	} catch (error) {
		const apiError = buildApiError(this.getNode(), error);
		throw extras.mapError?.(apiError) ?? apiError;
	}
}
