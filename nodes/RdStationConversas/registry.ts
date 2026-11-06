/**
 * Lista única dos recursos do node. A tela (propriedades) e o despacho do `execute`
 * leem esta mesma lista, então um recurso novo nunca aparece na tela sem executar,
 * nem executa sem aparecer.
 */
import { contactResource } from './resources/contact';
import { customFieldResource } from './resources/customField';
import type { ResourceModule } from './resources/types';

// Ordem alfabética pelo rótulo, como pede a UX guideline do n8n.
export const resources: ResourceModule[] = [contactResource, customFieldResource].sort((a, b) =>
	a.name.localeCompare(b.name),
);
