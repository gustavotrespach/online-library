import type { BookProvider, BookSearchResult } from "@/types/book";
import { normalizeIsbn } from "./isbn";

// Busca com fallback entre fontes. Sem rede nem variáveis de ambiente: as
// fontes são recebidas prontas (book-sources.ts no servidor).

export type BookQuery = { kind: "isbn"; isbn: string } | { kind: "text"; text: string };

// Um ISBN válido vira busca por ISBN; o resto busca título e autor.
export function parseBookQuery(input: string): BookQuery {
  const text = input.replace(/\s+/g, " ").trim();
  const isbn = normalizeIsbn(text);
  return isbn ? { kind: "isbn", isbn } : { kind: "text", text };
}

export interface BookSearchSource {
  provider: BookProvider;
  search: (query: BookQuery) => Promise<BookSearchResult[]>;
}

export class BookSearchUnavailableError extends Error {
  constructor() {
    super("Nenhuma fonte de livros respondeu.");
    this.name = "BookSearchUnavailableError";
  }
}

// Fontes em ordem de prioridade. A primeira com resultados utilizáveis
// encerra a busca; erro ou lista vazia passa para a próxima. Se todas
// falharem, a busca é indisponível; se alguma respondeu vazia, não há
// resultados.
export async function searchBooks(
  query: BookQuery,
  sources: BookSearchSource[],
): Promise<BookSearchResult[]> {
  let failures = 0;

  for (const source of sources) {
    try {
      const results = await source.search(query);
      if (results.length > 0) return results;
    } catch {
      failures += 1;
    }
  }

  if (sources.length > 0 && failures === sources.length) throw new BookSearchUnavailableError();
  return [];
}

// Completa o resultado da busca com os detalhes da edição escolhida, sem
// apagar dados que os detalhes não trazem.
export function mergeBookDetails(
  result: BookSearchResult,
  details: Partial<BookSearchResult> | null,
): BookSearchResult {
  if (!details) return result;
  return {
    ...result,
    title: details.title || result.title,
    author: details.author || result.author,
    coverUrl: details.coverUrl ?? result.coverUrl,
    pages: details.pages ?? result.pages,
    publicationYear: details.publicationYear ?? result.publicationYear,
    isbn: details.isbn ?? result.isbn,
  };
}
