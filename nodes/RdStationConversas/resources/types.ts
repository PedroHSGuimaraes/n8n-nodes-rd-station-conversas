/**
 * Formato comum dos módulos de recurso. Cada recurso (contato, mensagem, carteira...)
 * entrega as telas (`properties`), a lista de operações e a função de cada operação,
 * e o node só junta tudo. Assim, achar ou mudar uma operação é abrir um arquivo só.
 */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

// Função que executa uma operação para um item e devolve um ou vários itens de saída.
export type Handler = (
	this: IExecuteFunctions,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

export interface ResourceModule {
	// Valor gravado no workflow salvo: não pode mudar depois.
	value: string;
	// Rótulo da lista de recursos (Title Case, em inglês).
	name: string;
	operations: INodePropertyOptions[];
	properties: INodeProperties[];
	handlers: Record<string, Handler>;
}

/**
 * Monta a lista de operações de um recurso. O `action` é o texto que o n8n mostra
 * quando o node vira ferramenta de agente de IA.
 */
export function operationProperty(
	resource: string,
	operations: INodePropertyOptions[],
	defaultOperation: string,
): INodeProperties {
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: operations,
		default: defaultOperation,
	};
}

// Resposta vazia (204) ou texto: a exclusão devolve `{ "deleted": true }` (UX guideline).
export const DELETED: IDataObject = { deleted: true };

// Garante que a resposta é um objeto simples antes de virar item de saída.
export function asObject(response: unknown): IDataObject {
	if (response !== null && typeof response === 'object' && !Array.isArray(response)) {
		return response as IDataObject;
	}
	return {};
}

// Tira uma lista de objetos de dentro da resposta (`{ employees: [...] }` → `[...]`).
export function asList(response: unknown, key: string): IDataObject[] {
	const list = asObject(response)[key];
	return Array.isArray(list) ? (list as IDataObject[]) : [];
}

// A API quer datas no formato YYYY-MM-DD; o n8n entrega ISO completo, então cortamos os 10 primeiros.
export function toDay(value: unknown): string {
	return String(value ?? '').slice(0, 10);
}
