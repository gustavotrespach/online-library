"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Estado de Auth para a interface (Navbar). A sessão vem dos cookies e não é
// validada no navegador: nunca usar este estado para autorização.
export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | {
      status: "authenticated";
      userId: string;
      email: string | null;
      displayName: string | null;
    };

const AuthContext = createContext<AuthState>({ status: "loading" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let currentUserId: string | null = null;

    async function loadProfile(userId: string, email: string | null) {
      // profiles.display_name é a fonte de verdade do nome (decisions.md, 008).
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      // Ignora a resposta se o usuário mudou enquanto a consulta rodava.
      if (currentUserId !== userId) return;

      setState({
        status: "authenticated",
        userId,
        email,
        displayName: data?.display_name ?? null,
      });
    }

    // INITIAL_SESSION chega logo após a inscrição; SIGNED_IN e SIGNED_OUT
    // refletem login e logout, inclusive em outras abas.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (!user) {
        currentUserId = null;
        setState({ status: "guest" });
        return;
      }

      // TOKEN_REFRESHED e USER_UPDATED do mesmo usuário não mudam a interface.
      if (user.id === currentUserId) return;

      if (currentUserId !== null) setState({ status: "loading" });
      currentUserId = user.id;

      // Chamadas ao Supabase dentro do callback podem travar o lock da sessão.
      setTimeout(() => {
        void loadProfile(user.id, user.email ?? null);
      }, 0);
    });

    return () => {
      currentUserId = null;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
