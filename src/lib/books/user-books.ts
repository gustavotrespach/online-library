import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { BookMetadata, LibraryBook } from "@/types/book";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const LIBRARY_BOOK_COLUMNS =
  "id, user_id, book_id, progress, book:books(title, author, cover_url, pages, publication_year, isbn)";

// Livros da biblioteca do usuário autenticado, na ordem da estante
// (user_books.position; decisions.md, 011). O RLS de user_books só devolve as
// linhas do próprio usuário; nenhum filtro do navegador substitui essa regra.
export async function fetchLibraryBooks(supabase: Client): Promise<LibraryBook[]> {
  const { data, error } = await supabase
    .from("user_books")
    .select(LIBRARY_BOOK_COLUMNS)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return data;
}

async function fetchLibraryBook(supabase: Client, id: string): Promise<LibraryBook> {
  const { data, error } = await supabase
    .from("user_books")
    .select(LIBRARY_BOOK_COLUMNS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

const addResultSchema = z.object({
  user_book_id: z.uuid(),
  already_in_library: z.boolean(),
});

export type AddBookResult =
  | { status: "added"; book: LibraryBook }
  | { status: "already_in_library"; bookId: string };

// Adiciona o livro pelo único caminho de escrita em books: a função
// add_book_to_library, que valida de novo, reutiliza o livro do catálogo (por
// ISBN ou origem externa) e coloca o livro no fim da estante, com progresso 0.
export async function addBookToLibrary(supabase: Client, metadata: BookMetadata): Promise<AddBookResult> {
  const { data, error } = await supabase.rpc("add_book_to_library", {
    p_title: metadata.title,
    p_author: metadata.author,
    // Parâmetros omitidos usam o default null da função.
    p_cover_url: metadata.coverUrl ?? undefined,
    p_pages: metadata.pages ?? undefined,
    p_publication_year: metadata.publicationYear ?? undefined,
    p_isbn: metadata.isbn ?? undefined,
    p_source: metadata.source?.provider,
    p_source_id: metadata.source?.externalId,
  });
  if (error) throw error;

  const result = addResultSchema.parse(Array.isArray(data) ? data[0] : data);
  if (result.already_in_library) {
    return { status: "already_in_library", bookId: result.user_book_id };
  }
  return { status: "added", book: await fetchLibraryBook(supabase, result.user_book_id) };
}

// Remove o livro da estante. O livro continua no catálogo (books), que pode
// estar na estante de outras pessoas.
export async function removeLibraryBook(supabase: Client, id: string): Promise<void> {
  const { error, count } = await supabase.from("user_books").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (count === 0) throw new Error("Livro não encontrado na estante.");
}

// Grava a ordem da estante em uma única chamada (set_library_order).
export async function saveLibraryOrder(supabase: Client, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("set_library_order", { p_user_book_ids: ids });
  if (error) throw error;
}
