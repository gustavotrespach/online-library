// Testes unitários da camada de livros (Fase 08): ISBN, normalizadores do
// Google Books e da Open Library, fallback da busca, validação e hosts de
// capa. Sem rede. Uso: npm run test:unit (CONTRIBUTING.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeIsbn, pickIsbn } from "@/lib/books/isbn";
import { normalizeGoogleSearch, normalizeGoogleVolume } from "@/lib/books/google-books";
import {
  normalizeOpenLibraryDoc,
  normalizeOpenLibraryEdition,
  normalizeOpenLibrarySearch,
} from "@/lib/books/open-library";
import {
  BookSearchUnavailableError,
  mergeBookDetails,
  parseBookQuery,
  searchBooks,
  type BookSearchSource,
} from "@/lib/books/book-search";
import { isOptimizableCover } from "@/lib/books/cover-hosts";
import { bookQuerySchema, bookSearchResultSchema, manualBookSchema } from "@/lib/validation/book";

const FIXTURES = new URL("./fixtures/open-library/", import.meta.url);
const fixture = (name: string) => JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));

// ---------------------------------------------------------------- ISBN
test("ISBN: forma canônica ISBN-13", () => {
  assert.equal(normalizeIsbn("978-0-14-044913-6"), "9780140449136");
  assert.equal(normalizeIsbn("0140449132"), "9780140449136", "ISBN-10 vira o ISBN-13 equivalente");
  assert.equal(normalizeIsbn("0 8044 2957 X"), "9780804429573", "dígito verificador X");
  assert.equal(normalizeIsbn("9780140449137"), null, "dígito verificador errado é descartado");
  assert.equal(normalizeIsbn("0140449133"), null);
  assert.equal(normalizeIsbn("abc"), null);
  assert.equal(normalizeIsbn(""), null);
  assert.equal(pickIsbn(["0520007905", "9780520007901"]), "9780520007901", "prefere ISBN-13");
  assert.equal(pickIsbn(["123", "8508145608"]), "9788508145607", "ignora inválidos");
  assert.equal(pickIsbn([]), null);
});

// ---------------------------------------------------------------- Google Books
// Fixtures sintéticas no formato documentado de volumes.list (a API exige chave).
const googleVolume = (volumeInfo: Record<string, unknown>, id = "zyTCAlFPjgYC") => ({ id, volumeInfo });

test("Google Books: resultado completo", () => {
  const result = normalizeGoogleVolume(
    googleVolume({
      title: "  Crime and Punishment ",
      authors: ["Fyodor Dostoyevsky"],
      publishedDate: "2003-01-30",
      pageCount: 671,
      industryIdentifiers: [
        { type: "ISBN_10", identifier: "0140449132" },
        { type: "ISBN_13", identifier: "9780140449136" },
      ],
      imageLinks: {
        smallThumbnail: "http://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api",
        thumbnail: "http://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      },
    }),
  );
  assert.deepEqual(result, {
    provider: "google_books",
    externalId: "zyTCAlFPjgYC",
    title: "Crime and Punishment",
    author: "Fyodor Dostoyevsky",
    coverUrl: "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    pages: 671,
    publicationYear: 2003,
    isbn: "9780140449136",
  });
  assert.ok(isOptimizableCover(result!.coverUrl!), "capa do Google é de host permitido");
});

test("Google Books: capa maior tem prioridade; sem capa, sem páginas, autores", () => {
  const large = normalizeGoogleVolume(
    googleVolume({ title: "T", authors: ["A"], imageLinks: { thumbnail: "http://books.google.com/books/content?id=1&zoom=1", large: "http://books.google.com/books/content?id=1&zoom=4" } }),
  );
  assert.match(large!.coverUrl!, /zoom=4/);
  const bare = normalizeGoogleVolume(googleVolume({ title: "Sem Capa", authors: ["A", "B", "A"] }));
  assert.equal(bare!.coverUrl, null);
  assert.equal(bare!.pages, null);
  assert.equal(bare!.isbn, null, "sem ISBN não inventa");
  assert.equal(bare!.author, "A, B", "múltiplos autores, sem repetição");
  assert.equal(normalizeGoogleVolume(googleVolume({ title: "T", authors: ["A"], pageCount: 0 }))!.pages, null);
});

test("Google Books: ISBN-10 sozinho, ISBN-13 sozinho, outros identificadores", () => {
  const only10 = normalizeGoogleVolume(googleVolume({ title: "T", authors: ["A"], industryIdentifiers: [{ type: "ISBN_10", identifier: "8508145608" }] }));
  assert.equal(only10!.isbn, "9788508145607");
  const only13 = normalizeGoogleVolume(googleVolume({ title: "T", authors: ["A"], industryIdentifiers: [{ type: "ISBN_13", identifier: "9788508145607" }] }));
  assert.equal(only13!.isbn, "9788508145607");
  const other = normalizeGoogleVolume(googleVolume({ title: "T", authors: ["A"], industryIdentifiers: [{ type: "OTHER", identifier: "UOM:39015" }] }));
  assert.equal(other!.isbn, null);
});

test("Google Books: resultados sem dados mínimos ou malformados são descartados", () => {
  const results = normalizeGoogleSearch({
    items: [
      googleVolume({ title: "Sem autor" }),
      googleVolume({ authors: ["Sem título"] }),
      { id: 42 },
      "lixo",
      googleVolume({ title: "Bom", authors: ["Autor"], publishedDate: "1899" }, "ok"),
    ],
  });
  assert.deepEqual(results.map((r) => r.externalId), ["ok"]);
  assert.equal(results[0].publicationYear, 1899);
  assert.deepEqual(normalizeGoogleSearch({}), [], "busca sem items");
  assert.deepEqual(normalizeGoogleSearch(null), []);
});

// ---------------------------------------------------------------- Open Library
// Fixtures: respostas reais de search.json e /books/{id}.json capturadas em
// 2026-10-07, duas delas em recorte; procedência e limites em
// fixtures/open-library/README.md. ol-text.json tem 2 resultados (não 3).
test("Open Library: resultado completo (resposta real)", () => {
  const results = normalizeOpenLibrarySearch(fixture("./ol-text.json"));
  assert.ok(results.length >= 2);
  const first = results[0];
  assert.equal(first.provider, "open_library");
  assert.match(first.externalId, /^OL\d+M$/, "id da edição");
  assert.equal(first.title, "Dom Casmurro");
  assert.equal(first.author, "Machado de Assis");
  assert.equal(first.coverUrl, "https://covers.openlibrary.org/b/id/6491476-L.jpg", "capa da edição, por id");
  assert.equal(first.isbn, "9780520007901");
  assert.equal(first.publicationYear, 1966);
  assert.equal(first.pages, null, "a busca não traz as páginas da edição");
  assert.ok(isOptimizableCover(first.coverUrl!));
  for (const result of results) assert.ok(bookSearchResultSchema.safeParse(result).success, "formato aceito pelo cliente");
});

test("Open Library: busca por ISBN (resposta real) usa a edição", () => {
  const [result] = normalizeOpenLibrarySearch(fixture("./ol-isbn.json"));
  assert.equal(result.title, "Crime and Punishment (Penguin Classics)", "título da edição, não da obra");
  assert.equal(result.isbn, "9780140449136");
  assert.equal(result.externalId, "OL7355481M");
});

test("Open Library: detalhes da edição (resposta real) trazem páginas", () => {
  const details = normalizeOpenLibraryEdition(fixture("./ol-edition.json"));
  assert.equal(details!.pages, 232);
  assert.equal(details!.publicationYear, 2019, "ano extraído de '3 dezembro 2019'");
  assert.equal(details!.isbn, "9788508145607");
  assert.equal(details!.coverUrl, "https://covers.openlibrary.org/b/id/15231557-L.jpg");
});

test("Open Library: vazio, sem edição, sem capa, capa -1", () => {
  assert.deepEqual(normalizeOpenLibrarySearch({ numFound: 0, docs: [] }), []);
  assert.deepEqual(normalizeOpenLibrarySearch({ error: "x" }), []);
  const work = normalizeOpenLibraryDoc({ key: "/works/OL1W", title: "Obra", author_name: ["Autora"] });
  assert.equal(work!.externalId, "OL1W", "sem edição, usa a obra");
  assert.equal(work!.coverUrl, null);
  assert.equal(work!.isbn, null);
  assert.equal(normalizeOpenLibraryDoc({ key: "/works/OL1W", title: "Sem autor" }), null);
  assert.equal(normalizeOpenLibraryEdition({ covers: [-1] })!.coverUrl, null);
});

// ---------------------------------------------------------------- Fallback
const source = (provider: "google_books" | "open_library", impl: BookSearchSource["search"]): BookSearchSource => ({ provider, search: impl });
const one = { provider: "open_library" as const, externalId: "OL1M", title: "T", author: "A", coverUrl: null, pages: null, publicationYear: null, isbn: null };

test("Fallback: Google com resultados encerra a busca", async () => {
  let olCalls = 0;
  const results = await searchBooks(parseBookQuery("dom casmurro"), [
    source("google_books", async () => [{ ...one, provider: "google_books", externalId: "g" }]),
    source("open_library", async () => { olCalls += 1; return [one]; }),
  ]);
  assert.equal(results[0].provider, "google_books");
  assert.equal(olCalls, 0, "Open Library não é consultado");
});

test("Fallback: Google com erro ou vazio → Open Library", async () => {
  const failing = await searchBooks(parseBookQuery("x y"), [
    source("google_books", async () => { throw new Error("429"); }),
    source("open_library", async () => [one]),
  ]);
  assert.equal(failing[0].provider, "open_library");
  const empty = await searchBooks(parseBookQuery("x y"), [source("google_books", async () => []), source("open_library", async () => [one])]);
  assert.equal(empty[0].provider, "open_library");
});

test("Fallback: todas falham → indisponível; uma vazia e outra falha → sem resultados", async () => {
  await assert.rejects(
    searchBooks(parseBookQuery("x y"), [source("google_books", async () => { throw new Error(); }), source("open_library", async () => { throw new Error(); })]),
    BookSearchUnavailableError,
  );
  const results = await searchBooks(parseBookQuery("x y"), [source("google_books", async () => { throw new Error(); }), source("open_library", async () => [])]);
  assert.deepEqual(results, []);
});

test("Consulta: ISBN válido vira busca por ISBN; texto tem espaços normalizados", () => {
  assert.deepEqual(parseBookQuery(" 978-0-14-044913-6 "), { kind: "isbn", isbn: "9780140449136" });
  assert.deepEqual(parseBookQuery("  dom    casmurro "), { kind: "text", text: "dom casmurro" });
  assert.deepEqual(parseBookQuery("1234567890"), { kind: "text", text: "1234567890" }, "número que não é ISBN válido busca como texto");
});

test("Detalhes completam sem apagar dados da busca", () => {
  const merged = mergeBookDetails({ ...one, pages: null, isbn: "9780140449136" }, { pages: 232, isbn: null, title: undefined });
  assert.equal(merged.pages, 232);
  assert.equal(merged.isbn, "9780140449136");
  assert.equal(merged.title, "T");
  assert.equal(mergeBookDetails(one, null), one);
});

// ---------------------------------------------------------------- Validação
test("Busca: vazia, só espaços e curta são rejeitadas", () => {
  assert.equal(bookQuerySchema.safeParse("").success, false);
  assert.equal(bookQuerySchema.safeParse("    ").success, false);
  assert.equal(bookQuerySchema.safeParse("a").success, false);
  assert.equal(bookQuerySchema.parse("  dom   casmurro "), "dom casmurro");
  assert.equal(bookQuerySchema.safeParse("x".repeat(201)).success, false);
});

const manual = (overrides: Record<string, string>) =>
  manualBookSchema.safeParse({ title: "Livro", author: "Autor", pages: "", publicationYear: "", isbn: "", coverUrl: "", ...overrides });

test("Entrada manual: obrigatórios, opcionais vazios e normalização", () => {
  const ok = manual({ title: "  Meu   Livro ", isbn: "85-08-14560-8", pages: "232", publicationYear: "2019", coverUrl: "https://example.org/capa.jpg" });
  assert.ok(ok.success);
  assert.deepEqual(ok.data, { title: "Meu Livro", author: "Autor", pages: 232, publicationYear: 2019, isbn: "9788508145607", coverUrl: "https://example.org/capa.jpg" });
  const empty = manual({});
  assert.deepEqual(empty.data, { title: "Livro", author: "Autor", pages: null, publicationYear: null, isbn: null, coverUrl: null });
  assert.equal(manual({ title: "   " }).success, false, "título obrigatório");
  assert.equal(manual({ author: "" }).success, false, "autor obrigatório");
  assert.equal(manual({ title: "x".repeat(301) }).success, false);
});

test("Entrada manual: números, ano, ISBN e URL inválidos", () => {
  for (const pages of ["0", "-3", "2.5", "abc", "20001"]) assert.equal(manual({ pages }).success, false, `páginas ${pages}`);
  for (const year of ["0", "3000", "19x9"]) assert.equal(manual({ publicationYear: year }).success, false, `ano ${year}`);
  const badIsbn = manual({ isbn: "9780140449137" });
  assert.equal(badIsbn.success, false, "ISBN com dígito errado");
  assert.equal(badIsbn.error?.issues[0]?.message, "Use um ISBN-10 ou ISBN-13 válido.", "mensagem do campo, não a genérica");
  for (const coverUrl of ["javascript:alert(1)", "http://example.org/a.jpg", "data:image/png;base64,AAA", "ftp://x/y.jpg", "não é url"]) {
    assert.equal(manual({ coverUrl }).success, false, `capa ${coverUrl}`);
  }
});

test("Cliente: resultado com capa sem HTTPS ou ISBN fora da forma canônica é rejeitado", () => {
  assert.equal(bookSearchResultSchema.safeParse({ ...one, coverUrl: "http://x.org/a.jpg" }).success, false);
  assert.equal(bookSearchResultSchema.safeParse({ ...one, isbn: "0140449132" }).success, false);
  assert.equal(bookSearchResultSchema.safeParse({ ...one, provider: "amazon" }).success, false);
});

test("Hosts de capa: somente os configurados", () => {
  assert.ok(isOptimizableCover("https://covers.openlibrary.org/b/id/1-L.jpg"));
  assert.ok(isOptimizableCover("https://books.google.com/books/content?id=1"));
  assert.equal(isOptimizableCover("http://covers.openlibrary.org/b/id/1-L.jpg"), false);
  assert.equal(isOptimizableCover("https://evil.example/b/id/1.jpg"), false);
  assert.equal(isOptimizableCover("https://covers.openlibrary.org.evil.example/b/1.jpg"), false);
  assert.equal(isOptimizableCover("https://books.google.com/other"), false);
});
