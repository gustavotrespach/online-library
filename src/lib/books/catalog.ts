import { z } from "zod";
import type { BookSearchResult } from "@/types/book";
import { bookSearchResultSchema } from "@/lib/validation/book";
import { mergeBookDetails } from "./book-search";

// Busca de livros a partir do navegador, pelos Route Handlers do website
// (/api/books/*). Nenhuma API externa é chamada diretamente pela interface.

export class CatalogError extends Error {
  constructor(readonly reason: "unavailable" | "invalid_response") {
    super(reason);
    this.name = "CatalogError";
  }
}

const searchResponseSchema = z.object({ results: z.array(z.unknown()) });
const detailsResponseSchema = z.object({ details: z.unknown() });

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new CatalogError("unavailable");
  }
  if (!response.ok) throw new CatalogError("unavailable");
  try {
    return await response.json();
  } catch {
    throw new CatalogError("invalid_response");
  }
}

export async function searchCatalog(query: string, signal?: AbortSignal): Promise<BookSearchResult[]> {
  const parsed = searchResponseSchema.safeParse(
    await getJson(`/api/books/search?${new URLSearchParams({ q: query })}`, signal),
  );
  if (!parsed.success) throw new CatalogError("invalid_response");
  // Resultados inválidos são descartados um a um.
  return parsed.data.results.flatMap((item) => {
    const result = bookSearchResultSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

const detailsSchema = bookSearchResultSchema
  .omit({ provider: true, externalId: true })
  .partial()
  .nullable();

// Completa o resultado escolhido. Se os detalhes falharem, segue com os dados
// da busca, que já são suficientes para adicionar o livro.
export async function getCatalogDetails(
  result: BookSearchResult,
  signal?: AbortSignal,
): Promise<BookSearchResult> {
  try {
    const params = new URLSearchParams({ provider: result.provider, id: result.externalId });
    const body = detailsResponseSchema.safeParse(await getJson(`/api/books/details?${params}`, signal));
    const details = body.success ? detailsSchema.safeParse(body.data.details) : null;
    return mergeBookDetails(result, details?.success ? details.data : null);
  } catch (error) {
    if (signal?.aborted) throw error;
    return result;
  }
}
