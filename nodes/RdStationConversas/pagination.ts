/**
 * Paginação por número de página (a API do Conversas não usa cursor).
 * A mesma função serve contatos, campos personalizados, campanhas e relatórios:
 * cada recurso só diz como pedir uma página e quando ela foi a última.
 */

// Trava de segurança: se a API ignorar o `page` e repetir a mesma página, o laço não roda para sempre.
const MAX_PAGES = 1000;

export interface PageResult<T> {
	items: T[];
	// Verdadeiro quando a API indicou que esta foi a última página.
	last: boolean;
}

/**
 * Pede páginas de 1 em diante. Com `returnAll` vai até a última página;
 * com limite, para assim que juntar itens suficientes e corta o excesso.
 */
export async function collectPages<T>(
	fetchPage: (page: number) => Promise<PageResult<T>>,
	returnAll: boolean,
	limit: number,
): Promise<T[]> {
	const all: T[] = [];
	for (let page = 1; page <= MAX_PAGES; page++) {
		const { items, last } = await fetchPage(page);
		all.push(...items);
		// Página vazia também encerra: evita laço infinito se a API não marcar a última.
		if (last || items.length === 0) break;
		if (!returnAll && all.length >= limit) break;
	}
	return returnAll ? all : all.slice(0, limit);
}
