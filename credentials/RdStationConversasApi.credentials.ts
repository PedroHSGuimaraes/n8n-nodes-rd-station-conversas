/**
 * Credencial do RD Station Conversas.
 * Esqueleto da fatia S1: só o nome e o nome de exibição; os campos e o teste
 * entram na fatia S2, escritos depois dos testes que os exigem (TDD).
 */
import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class RdStationConversasApi implements ICredentialType {
	// Nome gravado nos workflows salvos: não pode mudar depois (porta de mão única do plano).
	name = 'rdStationConversasApi';

	// Nome que a pessoa vê na lista de credenciais do n8n.
	displayName = 'RD Station Conversas API';

	// O lint do n8n exige ícone, link de documentação e teste já no esqueleto;
	// o link e o ícone são os definitivos, o teste é um marcador trocado na fatia S2.
	icon = {
		light: 'file:../nodes/RdStationConversas/rdStationConversas.svg',
		dark: 'file:../nodes/RdStationConversas/rdStationConversas.dark.svg',
	} as const;

	documentationUrl = 'https://developers.rdstation.com/reference/conversas-v2-authentication';

	// Sem campos ainda: a fatia S2 adiciona token e chave.
	properties: INodeProperties[] = [];

	// Marcador: a rota real (`GET /v2/employees`) entra na S2.
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.tallos.com.br', url: '/v2/placeholder' },
	};
}
