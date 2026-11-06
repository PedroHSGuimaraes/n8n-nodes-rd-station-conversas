/**
 * Credencial do RD Station Conversas (chat e WhatsApp, o antigo Tallos).
 *
 * O Conversas não tem OAuth, client id nem refresh: o token JWT é estático e a
 * pessoa gera no painel. Por isso a credencial é só um campo senha com o token.
 * A chave privada JWK é opcional e serve apenas para abrir o histórico de
 * mensagens, que a API devolve criptografado (JWE).
 */
import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RdStationConversasApi implements ICredentialType {
	// Nome gravado nos workflows salvos: não pode mudar depois (porta de mão única do plano).
	name = 'rdStationConversasApi';

	// Nome que a pessoa vê na lista de credenciais do n8n.
	displayName = 'RD Station Conversas API';

	// Ícones claro e escuro ao lado da credencial; o lint do n8n exige o ícone.
	icon = {
		light: 'file:rdStationConversas.svg',
		dark: 'file:rdStationConversas.dark.svg',
	} as const;

	// Página oficial de autenticação: é para onde o n8n leva quem clica em "ver documentação".
	documentationUrl = 'https://developers.rdstation.com/reference/conversas-v2-authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			// Senha: o n8n esconde o valor e não o mostra em logs.
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'JWT token generated in RD Station Conversas under Apps and Integrations, API',
		},
		{
			displayName: 'Private Key (JWK)',
			name: 'privateKeyJwk',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			// Opcional: só o histórico de mensagens precisa dela; as outras operações funcionam sem.
			required: false,
			description:
				'Only used to read the message history, which the API sends encrypted. Generate it in RD Station Conversas under Apps and Integrations, API, Generate Key, then paste the JWK JSON here. The key is exclusive to your account, so do not share it',
		},
	];

	// A API pede `Authorization: Bearer <token>` em toda chamada.
	// Não existe campo de URL base de propósito: a doc só documenta api.tallos.com.br.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	// Teste com um clique: lista os atendentes. 401 (token inválido) e 403 (sem permissão)
	// chegam à tela como falha, porque não ligamos `ignoreHttpStatusErrors`.
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.tallos.com.br', url: '/v2/employees', timeout: 30000 },
	};
}
