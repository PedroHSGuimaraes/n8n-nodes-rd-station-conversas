/**
 * Lista única dos recursos do node. A tela (propriedades) e o despacho do `execute`
 * leem esta mesma lista, então um recurso novo nunca aparece na tela sem executar,
 * nem executa sem aparecer.
 */
import { analyticsResource } from './resources/analytics';
import { campaignResource } from './resources/campaign';
import { contactResource } from './resources/contact';
import { customFieldResource } from './resources/customField';
import { employeeResource } from './resources/employee';
import { flowResource } from './resources/flow';
import { messageResource } from './resources/message';
import { reportResource } from './resources/report';
import {
	crmWorkflowResource,
	jobResource,
	templateResource,
	whatsappIntegrationResource,
} from './resources/simple';
import type { ResourceModule } from './resources/types';
import { walletResource } from './resources/wallet';

// Ordem alfabética pelo rótulo, como pede a UX guideline do n8n.
export const resources: ResourceModule[] = [
	analyticsResource,
	campaignResource,
	contactResource,
	crmWorkflowResource,
	customFieldResource,
	employeeResource,
	flowResource,
	jobResource,
	messageResource,
	reportResource,
	templateResource,
	walletResource,
	whatsappIntegrationResource,
].sort((a, b) => a.name.localeCompare(b.name));
