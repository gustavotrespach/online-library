import type { Tables } from "./database";

// Um livro na biblioteca do usuário: a entrada de user_books (progresso) com
// os dados do livro relacionado. O status de leitura é derivado de progress
// (docs/banco-de-dados.md).
export type LibraryBook = Pick<Tables<"user_books">, "id" | "user_id" | "book_id" | "progress"> & {
  book: Pick<
    Tables<"books">,
    "title" | "author" | "cover_url" | "pages" | "publication_year" | "isbn"
  >;
};

// Fontes externas de descoberta de livros (books.source).
export type BookProvider = "google_books" | "open_library";

// Livro de uma fonte externa, já normalizado (docs/integracoes.md). A
// interface nunca recebe o formato bruto das APIs.
export interface BookSearchResult {
  provider: BookProvider;
  externalId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  pages: number | null;
  publicationYear: number | null;
  // Sempre ISBN-13, só dígitos.
  isbn: string | null;
}

// Livro que será gravado no catálogo: vindo de uma busca (com origem) ou
// digitado na entrada manual (sem origem).
export type BookMetadata = Omit<BookSearchResult, "provider" | "externalId"> & {
  source: Pick<BookSearchResult, "provider" | "externalId"> | null;
};
