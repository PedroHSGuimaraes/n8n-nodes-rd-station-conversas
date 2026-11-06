/**
 * Recurso "Campaign": lista as campanhas (disparos em massa) e lê os detalhes de uma.
 */
import type { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { requireId, returnAllAndLimit } from '../helpers';
import { locator } from '../locators';
import { collectPages } from '../pagination';
import { conversasRequest } from '../transport';
import { type Handler, type ResourceModule, asList, asObject, operationProperty } from './types';

const RESOURCE = 'campaign';

const operations: INodePropertyOptions[] = [
	{
		name: 'Get',
		value: 'get',
		action: 'Get a campaign',
		description: 'Get the segmentation, template and statistics of a campaign',
	},
	{
		name: 'Get Many',
		value: 'getAll',
		action: 'Get many campaigns',
		description: 'List the campaigns',
	},
];

const properties: INodeProperties[] = [
	operationProperty(RESOURCE, operations, 'getAll'),
	locator({
		displayName: 'Campaign',
		name: 'campaign',
		searchMethod: 'searchCampaigns',
		resource: RESOURCE,
		operations: ['get'],
	}),
	...returnAllAndLimit(RESOURCE, ['getAll']),
];

const getAll: Handler = async function (i) {
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const pageSize = returnAll ? 100 : Math.min(limit, 100);
	return collectPages<IDataObject>(
		async (page) => {
			const response = asObject(
				await conversasRequest.call(this, 'GET', '/v1/campaigns', {
					qs: { page, limit: pageSize },
				}),
			);
			// A rota diz sozinha se há mais páginas.
			return { items: asList(response, 'campaigns'), last: response.has_more !== true };
		},
		returnAll,
		limit,
	);
};

const get: Handler = async function (i) {
	const id = requireId(this, 'campaign', 'Campaign', i);
	return asObject(await conversasRequest.call(this, 'GET', `/v1/campaigns/${id}`));
};

export const campaignResource: ResourceModule = {
	value: RESOURCE,
	name: 'Campaign',
	operations,
	properties,
	handlers: { getAll, get },
};
