import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino fixo: nenhum parâmetro do link define para onde o usuário vai.
const INVALID_LINK_REDIRECT = "/entrar?erro=link-invalido";

// Link do e-mail de confirmação (decisions.md, 008):
// /auth/confirm?token_hash=...&type=email
// Funciona em qualquer navegador: não depende de cookies do cadastro.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    redirect(INVALID_LINK_REDIRECT);
  }

  const supabase = await createClient();
  // Em caso de sucesso, o server client grava a sessão nos cookies (setAll).
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  // Token inválido, expirado ou já usado: o Auth responde otp_expired.
  if (error) {
    redirect(INVALID_LINK_REDIRECT);
  }

  redirect("/");
}
