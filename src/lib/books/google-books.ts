import { z } from "zod";
import type { BookSearchResult } from "@/types/book";
import type { BookQuery } from "./book-search";
import { pickIsbn } from "./isbn";
import { cleanText, fetchJson, joinAuthors, toHttpsUrl, toPages, toYear } from "./normalize";

// Google Books: fonte principal (docs/integracoes.md). Exige chave de API.

const API = "https://www.googleapis.com/books/v1/volumes";
const MAX_RESULTS = 10;
const VOLUME_FIELDS =
  "id,volumeInfo(title,authors,publishedDate,pageCount,industryIdentifiers,imageLinks)";

// Somente os campos usados. Tudo opcional: a API omite o que não conhece.
const volumeSchema = z.object({
  id: z.string().min(1),
  volumeInfo: z.object({
    title: z.string().optional(),
    authors: z.array(z.string()).optional(),
    publishedDate: z.string().optional(),
    pageCount: z.number().optional(),
    industryIdentifiers: z
      .array(z.object({ type: z.string(), identifier: z.string() }))
      .optional(),
    imageLinks: z.record(z.string(), z.string()).optional(),
  }),
});

type GoogleVolume = z.infer<typeof volumeSchema>;

// Da maior para a menor; a busca costuma trazer só as duas últimas.
const IMAGE_SIZES = ["extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"];

function pickCover(links: Record<string, string> | undefined): string | null {
  const best = IMAGE_SIZES.map((size) => links?.[size]).find(Boolean);
  const url = toHttpsUrl(best);
  if (!url) return null;
  // edge=curl desenha uma "página dobrada" sobre a capa.
  const parsed = new URL(url);
  parsed.searchParams.delete("edge");
  return parsed.toString();
}

export function normalizeGoogleVolume(input: unknown): BookSearchResult | null {
  const parsed = volumeSchema.safeParse(input);
  if (!parsed.success) return null;
  const { id, volumeInfo: info }: GoogleVolume = parsed.data;

  const title = cleanText(info.title);
  const author = joinAuthors(info.authors);
  // Sem título ou autor o livro não pode ser gravado: o resultado é descartado.
  if (!title || !author) return null;

  const identifiers = info.industryIdentifiers ?? [];
  const byType = (type: string) => identifiers.filter((i) => i.type === type).map((i) => i.identifier);

  return {
    provider: "google_books",
    externalId: id,
    title,
    author,
    coverUrl: pickCover(info.imageLinks),
    pages: toPages(info.pageCount),
    publicationYear: toYear(info.publishedDate),
    isbn: pickIsbn([...byType("ISBN_13"), ...byType("ISBN_10")]),
  };
}

export function normalizeGoogleSearch(input: unknown): BookSearchResult[] {
  const parsed = z.object({ items: z.array(z.unknown()).optional() }).safeParse(input);
  if (!parsed.success) return [];
  return (parsed.data.items ?? []).flatMap((item) => normalizeGoogleVolume(item) ?? []);
}

export async function searchGoogleBooks(query: BookQuery, apiKey: string): Promise<BookSearchResult[]> {
  const url = new URL(API);
  url.searchParams.set("q", query.kind === "isbn" ? `isbn:${query.isbn}` : query.text);
  url.searchParams.set("maxResults", String(MAX_RESULTS));
  url.searchParams.set("printType", "books");
  url.searchParams.set("fields", `items(${VOLUME_FIELDS})`);
  url.searchParams.set("key", apiKey);
  return normalizeGoogleSearch(await fetchJson(url));
}

// Dados completos do volume escolhido (capas maiores costumam vir só aqui).
export async function getGoogleVolume(id: string, apiKey: string): Promise<BookSearchResult | null> {
  const url = new URL(`${API}/${encodeURIComponent(id)}`);
  url.searchParams.set("fields", VOLUME_FIELDS);
  url.searchParams.set("key", apiKey);
  return normalizeGoogleVolume(await fetchJson(url));
}
