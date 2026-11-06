/**
 * Achado F4 da the-judge: nenhum ID pode entrar cru numa rota. O teste percorre as 42 operações
 * e as listas dinâmicas com um ID que tem `/` e `?` e confere cada URL gravada.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { RdStationConversas, makeContext, run } = require('./helpers.cjs');
const { OPERATIONS } = require('./sweep.test.cjs');

const EVIL = 'a/b?c=d';

// Troca todo ID simples dos parâmetros pelo ID malicioso.
const evilParams = (params) =>
	Object.fromEntries(
		Object.entries(params).map(([name, value]) => {
			if (value && typeof value === 'object' && value.mode === 'id')
				return [name, { mode: 'id', value: EVIL }];
			if (name === 'jobId') return [name, EVIL];
			return [name, value];
		}),
	);

describe('F4 IDs in routes', () => {
	it('C115: no recorded URL of any operation or dynamic list carries a raw / or ? from an ID', async () => {
		let encodedCount = 0;
		for (const [resource, operation, params] of OPERATIONS) {
			const context = makeContext({
				params: { resource, operation, ...evilParams(params) },
				credentials: { apiToken: 't', privateKeyJwk: '{}' },
				responder: () => ({}),
			});
			await run(context);
			for (const request of context.requests) {
				assert.equal(
					request.url.includes(EVIL),
					false,
					`${resource}.${operation} sent ${request.url}`,
				);
				assert.equal(request.url.includes('?'), false, `${resource}.${operation} has a raw ?`);
				// Só `%` e caracteres seguros: `/`, `=` ou `&` crus vindos do ID quebrariam a rota.
				assert.match(
					request.url.slice('https://api.tallos.com.br'.length),
					/^\/v\d\/[A-Za-z0-9\-_./%]*$/,
					request.url,
				);
				if (request.url.includes(encodeURIComponent(EVIL))) encodedCount += 1;
			}
		}
		// As rotas com ID no caminho usam a forma codificada exata (a%2Fb%3Fc%3Dd).
		assert.ok(encodedCount === 11, `only ${encodedCount} URLs carry the encoded id`);
		// Lista de departamentos: o ID do atendente vem da API e também entra na rota.
		const context = makeContext({
			responder: (options) =>
				options.url.endsWith('/v2/employees')
					? { employees: [{ id: EVIL, name: 'E' }] }
					: { departments: [] },
		});
		await new RdStationConversas().methods.loadOptions.getDepartments.call(context);
		for (const request of context.requests) {
			assert.equal(request.url.includes(EVIL), false, request.url);
		}
		assert.ok(context.requests.length === 2);
	});
});
