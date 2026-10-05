import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

// Renova a sessão expirada e repassa os cookies atualizados ao navegador e
// aos Server Components do mesmo request. Não decide acesso a rotas: cada
// Server Function ou Route Handler verifica a autenticação por conta própria.
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Cabeçalhos que impedem o cache de respostas com cookies de sessão.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Valida o JWT e, se ele tiver expirado, usa o refresh token (o que chama
  // setAll). Nada deve rodar entre a criação do cliente e esta chamada.
  await supabase.auth.getClaims();

  return response;
}
