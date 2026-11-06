/**
 * Node RD Station Conversas (chat e WhatsApp).
 * Esqueleto da fatia S1: registra o node e o ícone para o build e o lint passarem;
 * recursos e operações entram fatia por fatia, sempre depois do teste que os exige.
 */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { resources } from './registry';

export class RdStationConversas implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RD Station Conversas',
		// Nome gravado nos workflows salvos: não pode mudar depois.
		name: 'rdStationConversas',
		icon: { light: 'file:rdStationConversas.svg', dark: 'file:rdStationConversas.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Work with RD Station Conversas contacts, messages and reports',
		// Mostra no canvas qual operação e qual recurso o node executa.
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: { name: 'RD Station Conversas' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'rdStationConversasApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: resources.map((resource) => ({ name: resource.name, value: resource.value })),
				default: 'contact',
			},
			...resources.flatMap((resource) => resource.properties),
		],
	};

	/**
	 * Roda cada item de entrada: lê recurso e operação, chama a função da operação
	 * e transforma o resultado em itens de saída ligados ao item de origem (`pairedItem`).
	 * Com "Continue On Fail" ligado, o erro de um item vira `{ error }` e os outros seguem.
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const handler = resources.find((entry) => entry.value === resource)?.handlers[operation];
				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation '${operation}' is not available for '${resource}' [item ${itemIndex}]`,
						{ itemIndex },
					);
				}
				const result = await handler.call(this, itemIndex);
				// Listas viram um item por registro; objeto simples vira um item só.
				for (const json of Array.isArray(result) ? result : [result]) {
					returnData.push({ json: json as IDataObject, pairedItem: { item: itemIndex } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				// Os erros chegam aqui já como NodeApiError ou NodeOperationError (com item e descrição).
				// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
				throw error;
			}
		}
		return [returnData];
	}
}
