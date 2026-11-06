/**
 * Ajudantes dos testes: um contexto falso do n8n que grava cada requisição HTTP.
 * Os testes rodam sobre o `dist` (como o pacote Vizard) e chamam o `execute` de verdade,
 * então cada teste prova o que o node envia, sem rede e sem credencial real.
 */
const { RdStationConversas } = require('../dist/nodes/RdStationConversas/RdStationConversas.node');

/**
 * Monta o contexto falso.
 * - params: objeto com os parâmetros, ou função (itemIndex) => objeto, para itens diferentes.
 * - responder: (options, n) => resposta ou lança erro; n é o número da chamada (0, 1, 2...).
 * - credentials: o que `getCredentials` devolve (padrão: só o token).
 * - items: quantos itens de entrada o node recebe (padrão 1).
 */
function makeContext({
	params = {},
	responder = () => ({}),
	credentials = { apiToken: 'tok' },
	items = 1,
	continueOnFail = false,
	binary = {},
} = {}) {
	const requests = [];
	const read = (i) => (typeof params === 'function' ? params(i) : params);
	const context = {
		requests,
		getInputData: () => Array.from({ length: items }, () => ({ json: {} })),
		getNode: () => ({ name: 'RD Station Conversas', type: 'rdStationConversas', typeVersion: 1 }),
		getNodeParameter: (name, i, fallback) => {
			const source = read(i);
			return Object.prototype.hasOwnProperty.call(source, name) ? source[name] : fallback;
		},
		getCurrentNodeParameter: (name) => read(0)[name],
		getCredentials: async () => credentials,
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async (credentialType, options) => {
				requests.push({ credentialType, ...options });
				return responder(options, requests.length - 1);
			},
			assertBinaryData: (_i, property) => {
				if (!binary[property]) throw new Error(`no binary ${property}`);
				return binary[property];
			},
			getBinaryDataBuffer: async (_i, property) => binary[property].buffer,
		},
	};
	return context;
}

/** Roda o `execute` do node e devolve só os `json` dos itens de saída. */
async function run(context) {
	const result = await new RdStationConversas().execute.call(context);
	return result[0].map((item) => item.json);
}

module.exports = { makeContext, run, RdStationConversas };
