import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

// Cliente para Client Components. No navegador, o @supabase/ssr reutiliza a
// mesma instância entre chamadas e guarda a sessão em cookies.
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
