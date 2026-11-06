/**
 * Node RD Station Conversas (chat e WhatsApp).
 * Esqueleto da fatia S1: registra o node e o ícone para o build e o lint passarem;
 * recursos e operações entram fatia por fatia, sempre depois do teste que os exige.
 */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

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
		properties: [],
	};

	// Sem operações ainda: devolve os itens de entrada sem alterar.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
