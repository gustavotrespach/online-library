import "server-only";

import type { BookProvider, BookSearchResult } from "@/types/book";
import { type BookSearchSource } from "./book-search";
import { getGoogleVolume, searchGoogleBooks } from "./google-books";
import { getOpenLibraryEdition, searchOpenLibrary } from "./open-library";

// Configuração das fontes no servidor. A chave do Google Books nunca vai ao
// navegador (não é NEXT_PUBLIC_*).

function googleApiKey() {
  return process.env.GOOGLE_BOOKS_API_KEY || null;
}

// A política do Open Library pede um User-Agent com o nome do website e um
// contato; o contato é opcional e configurável (docs/integracoes.md).
function openLibraryUserAgent() {
  const contact = process.env.BOOKS_API_CONTACT;
  return contact ? `OnlineLibrary (${contact})` : "OnlineLibrary";
}

// Google Books primeiro, quando há chave: sem ela a API responde 429.
export function getBookSearchSources(): BookSearchSource[] {
  const key = googleApiKey();
  const userAgent = openLibraryUserAgent();
  const openLibrary: BookSearchSource = {
    provider: "open_library",
    search: (query) => searchOpenLibrary(query, userAgent),
  };

  return key
    ? [{ provider: "google_books", search: (query) => searchGoogleBooks(query, key) }, openLibrary]
    : [openLibrary];
}

export async function getBookDetails(
  provider: BookProvider,
  externalId: string,
): Promise<Partial<BookSearchResult> | null> {
  if (provider === "open_library") {
    // Só edições (OL…M) têm detalhes próprios.
    return /^OL\d+M$/.test(externalId)
      ? getOpenLibraryEdition(externalId, openLibraryUserAgent())
      : null;
  }

  const key = googleApiKey();
  return key ? getGoogleVolume(externalId, key) : null;
}
