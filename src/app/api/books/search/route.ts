import { NextResponse, type NextRequest } from "next/server";
import { BookSearchUnavailableError, parseBookQuery, searchBooks } from "@/lib/books/book-search";
import { getBookSearchSources } from "@/lib/books/book-sources";
import { createClient } from "@/lib/supabase/server";
import { bookQuerySchema } from "@/lib/validation/book";

// GET /api/books/search?q=…: busca nas fontes externas (Google Books, depois
// Open Library). Só para usuários autenticados: a busca existe para adicionar
// livros à estante, e as cotas das APIs são do website.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = bookQuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  try {
    const results = await searchBooks(parseBookQuery(query.data), getBookSearchSources());
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof BookSearchUnavailableError) {
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }
    throw error;
  }
}
