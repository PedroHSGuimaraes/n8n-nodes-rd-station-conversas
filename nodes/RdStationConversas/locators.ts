/**
 * Fábrica dos campos de ID "guiados" (Resource Locator): a pessoa escolhe numa lista
 * pesquisável, cola o ID, ou, no caso do contato, digita o telefone. Um construtor só
 * garante o mesmo comportamento em todos os recursos (lista é o modo padrão).
 */
import type { INodeProperties, INodePropertyMode } from 'n8n-workflow';

import { showFor } from './helpers';

export interface LocatorSpec {
	displayName: string;
	name: string;
	// Método `listSearch` que alimenta o modo lista.
	searchMethod: string;
	resource: string;
	// Operações em que o campo aparece (vazio = o recurso inteiro).
	operations?: string[];
	// Só o contato aceita telefone, e só nas rotas que pedem o `_id`.
	withPhone?: boolean;
	placeholder?: string;
	required?: boolean;
	description?: string;
}

export function locator(spec: LocatorSpec): INodeProperties {
	const modes: INodePropertyMode[] = [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select...',
			typeOptions: { searchListMethod: spec.searchMethod, searchable: true },
			default: '',
		} as INodePropertyMode,
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: spec.placeholder ?? 'e.g. 6650f2a1b2c3d4e5f6a7b8c9',
			// O lint do n8n exige `default` em campo string; o tipo do modo não o declara, daí a asserção.
			default: '',
		} as INodePropertyMode,
	];
	if (spec.withPhone) {
		modes.push({
			displayName: 'By Phone',
			name: 'phone',
			type: 'string',
			placeholder: 'e.g. 5511999998888',
			hint: 'International format, digits only, e.g. 5511999998888',
			default: '',
		} as INodePropertyMode);
	}
	return {
		displayName: spec.displayName,
		name: spec.name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: spec.required ?? true,
		displayOptions: showFor(spec.resource, spec.operations),
		modes,
		description: spec.description,
	};
}
