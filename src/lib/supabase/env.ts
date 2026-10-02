// Somente valores públicos, que podem chegar ao navegador. Chaves secretas
// (secret key, service_role) nunca devem ser lidas aqui.
export function getSupabaseEnv() {
  // Acesso literal: o Next.js só embute NEXT_PUBLIC_* no bundle do navegador
  // quando a variável é referenciada desta forma.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example).",
    );
  }

  return { url, publishableKey };
}
