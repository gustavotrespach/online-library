import { z } from "zod";
import type { BookSearchResult } from "@/types/book";
import type { BookQuery } from "./book-search";
import { pickIsbn } from "./isbn";
import { cleanText, fetchJson, joinAuthors, toPages, toYear } from "./normalize";

// Open Library: fallback do Google Books (docs/integracoes.md). Sem chave; a
// política de uso pede baixo volume e um User-Agent que identifique o website.

const SEARCH_API = "https://openlibrary.org/search.json";
const EDITION_API = "https://openlibrary.org/books";
const MAX_RESULTS = 10;
// Obra (autores) + a edição mais relevante para a busca (título, ISBN, capa).
const SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "editions",
  "editions.key",
  "editions.title",
  "editions.isbn",
  "editions.cover_i",
  "editions.publish_year",
].join(",");

// Capa por id: o acesso por id não entra no limite de requisições por IP.
export function openLibraryCoverUrl(coverId: number | undefined | null): string | null {
  return coverId && coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

const editionDocSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  isbn: z.array(z.string()).optional(),
  cover_i: z.number().optional(),
  publish_year: z.array(z.number()).optional(),
});

const searchDocSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  author_name: z.array(z.string()).optional(),
  cover_i: z.number().optional(),
  editions: z.object({ docs: z.array(z.unknown()) }).optional(),
});

const lastSegment = (key: string) => key.split("/").filter(Boolean).at(-1) ?? key;

export function normalizeOpenLibraryDoc(input: unknown): BookSearchResult | null {
  const parsed = searchDocSchema.safeParse(input);
  if (!parsed.success) return null;
  const work = parsed.data;
  const edition = editionDocSchema.safeParse(work.editions?.docs[0]);
  const ed = edition.success ? edition.data : null;

  const title = cleanText(ed?.title) ?? cleanText(work.title);
  const author = joinAuthors(work.author_name);
  if (!title || !author) return null;

  return {
    provider: "open_library",
    // A edição (OL…M) quando existe; senão, a obra (OL…W).
    externalId: lastSegment(ed?.key ?? work.key),
    title,
    author,
    coverUrl: openLibraryCoverUrl(ed?.cover_i ?? work.cover_i),
    // A busca só traz a mediana de páginas da obra; o número da edição vem
    // dos detalhes (getOpenLibraryEdition), ao selecionar o livro.
    pages: null,
    publicationYear: toYear(ed?.publish_year?.find((year) => toYear(year) !== null)),
    isbn: pickIsbn(ed?.isbn ?? []),
  };
}

export function normalizeOpenLibrarySearch(input: unknown): BookSearchResult[] {
  const parsed = z.object({ docs: z.array(z.unknown()) }).safeParse(input);
  if (!parsed.success) return [];
  return parsed.data.docs.flatMap((doc) => normalizeOpenLibraryDoc(doc) ?? []);
}

const editionSchema = z.object({
  title: z.string().optional(),
  number_of_pages: z.number().optional(),
  publish_date: z.string().optional(),
  isbn_13: z.array(z.string()).optional(),
  isbn_10: z.array(z.string()).optional(),
  covers: z.array(z.number()).optional(),
});

// Detalhes de uma edição (OL…M). Os autores ficam na busca: a edição só
// traz as chaves deles.
export function normalizeOpenLibraryEdition(input: unknown): Partial<BookSearchResult> | null {
  const parsed = editionSchema.safeParse(input);
  if (!parsed.success) return null;
  const edition = parsed.data;

  return {
    title: cleanText(edition.title) ?? undefined,
    pages: toPages(edition.number_of_pages),
    publicationYear: toYear(edition.publish_date),
    isbn: pickIsbn([...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])]),
    coverUrl: openLibraryCoverUrl(edition.covers?.find((id) => id > 0)),
  };
}

export async function searchOpenLibrary(query: BookQuery, userAgent: string): Promise<BookSearchResult[]> {
  const url = new URL(SEARCH_API);
  if (query.kind === "isbn") url.searchParams.set("isbn", query.isbn);
  else url.searchParams.set("q", query.text);
  url.searchParams.set("fields", SEARCH_FIELDS);
  url.searchParams.set("limit", String(MAX_RESULTS));
  return normalizeOpenLibrarySearch(await fetchJson(url, { headers: { "User-Agent": userAgent } }));
}

export async function getOpenLibraryEdition(
  editionId: string,
  userAgent: string,
): Promise<Partial<BookSearchResult> | null> {
  const url = new URL(`${EDITION_API}/${encodeURIComponent(editionId)}.json`);
  return normalizeOpenLibraryEdition(await fetchJson(url, { headers: { "User-Agent": userAgent } }));
}
