/**
 * Achado F2 da the-judge: `report getAll` precisa de Return All e Limit e pagina por `page` e `limit`.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { RdStationConversas, makeContext, run } = require('./helpers.cjs');

const base = {
	resource: 'report',
	operation: 'getAll',
	startDate: '2026-10-01T00:00:00',
	endDate: '2026-10-31T00:00:00',
};
const docs = (n, from = 0) => Array.from({ length: n }, (_, k) => ({ id: `r${from + k}` }));

describe('F2 report getAll pagination', () => {
	it('C112: Return All walks two pages by page and limit', async () => {
		const context = makeContext({
			params: { ...base, returnAll: true },
			responder: (options) => ({ docs: options.qs.page === 1 ? docs(100) : docs(37, 100) }),
		});
		const out = await run(context);
		assert.deepEqual(
			context.requests.map((r) => r.qs.page),
			[1, 2],
		);
		assert.equal(context.requests[0].qs.limit, 100);
		assert.equal(out.length, 137);
	});

	it('C113: Limit stops early and the screen offers Return All and Limit for getAll', async () => {
		const context = makeContext({
			params: { ...base, returnAll: false, limit: 5 },
			responder: () => ({ docs: docs(100) }),
		});
		assert.equal((await run(context)).length, 5);
		assert.equal(context.requests.length, 1);
		const shown = (name) =>
			new RdStationConversas().description.properties.find(
				(p) =>
					p.name === name &&
					p.displayOptions.show.resource[0] === 'report' &&
					p.displayOptions.show.operation.includes('getAll'),
			);
		assert.ok(shown('returnAll'));
		assert.equal(shown('limit').typeOptions.minValue, 1);
	});
});
