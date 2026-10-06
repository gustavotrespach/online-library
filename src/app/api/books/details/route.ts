import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getBookDetails } from "@/lib/books/book-sources";
import { BookSourceError } from "@/lib/books/normalize";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  provider: z.enum(["google_books", "open_library"]),
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
});

// GET /api/books/details?provider=…&id=…: dados completos da edição escolhida
// (páginas da edição, capa maior). Uma chamada por seleção, nunca na busca.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = paramsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!params.success) return NextResponse.json({ error: "invalid_params" }, { status: 400 });

  try {
    const details = await getBookDetails(params.data.provider, params.data.id);
    return NextResponse.json({ details });
  } catch (error) {
    if (error instanceof BookSourceError) {
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }
    throw error;
  }
}
