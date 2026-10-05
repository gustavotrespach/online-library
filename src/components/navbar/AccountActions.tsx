"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { NavigationItem } from "./navigation";
import { NavigationLink } from "./NavigationLink";

const signInItem: NavigationItem = { label: "Entrar", href: "/entrar" };
const signUpItem: NavigationItem = { label: "Cadastrar", href: "/cadastrar" };

const layoutStyles = {
  inline: {
    container: "flex items-center gap-6",
    placeholder: "h-10 w-48",
    signIn: "text-sm font-medium",
    signUp: "rounded-sm border px-4 py-2 text-sm font-medium",
    account: "flex items-center gap-6",
    identity: "flex items-center gap-3",
    name: "max-w-40 truncate text-sm font-medium",
    signOut:
      "py-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground disabled:cursor-wait",
  },
  stacked: {
    container: "flex flex-col gap-3",
    placeholder: "h-27",
    signIn: "flex h-12 items-center justify-center text-base font-medium",
    signUp:
      "flex h-12 items-center justify-center rounded-sm border text-base font-medium",
    account: "flex flex-col gap-3",
    identity: "flex h-12 items-center gap-3",
    name: "truncate text-base font-medium",
    signOut:
      "flex h-12 items-center justify-center rounded-sm border text-base font-medium text-foreground-muted transition-colors hover:text-foreground disabled:cursor-wait",
  },
};

interface AccountActionsProps {
  layout: keyof typeof layoutStyles;
  className?: string;
  // Chamado ao navegar ou sair (ex.: fechar o menu mobile).
  onNavigate?: () => void;
}

export function AccountActions({ layout, className = "", onNavigate }: AccountActionsProps) {
  const auth = useAuth();
  const styles = layoutStyles[layout];

  // Espaço reservado enquanto a sessão é lida, para não exibir "Entrar" a
  // quem já está autenticado.
  if (auth.status === "loading") {
    return <div aria-hidden className={`${styles.placeholder} ${className}`} />;
  }

  if (auth.status === "guest") {
    return (
      <div className={`${styles.container} ${className}`}>
        <NavigationLink item={signInItem} onClick={onNavigate} className={styles.signIn} />
        <NavigationLink item={signUpItem} onClick={onNavigate} className={styles.signUp} />
      </div>
    );
  }

  return (
    <div className={`${styles.account} ${className}`}>
      <p className={styles.identity}>
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium text-foreground"
        >
          {getInitials(auth.displayName, auth.email)}
        </span>
        <span className={styles.name}>
          <span className="sr-only">Conectado como </span>
          {auth.displayName ?? auth.email ?? "Minha conta"}
        </span>
      </p>
      <SignOutButton className={styles.signOut} onSignedOut={onNavigate} />
    </div>
  );
}

function SignOutButton({
  className,
  onSignedOut,
}: {
  className: string;
  onSignedOut?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    setPending(true);
    setFailed(false);

    // "local" encerra apenas a sessão deste navegador. O evento SIGNED_OUT
    // devolve a Navbar ao estado de visitante.
    const { error } = await createClient().auth.signOut({ scope: "local" });

    if (error) {
      setFailed(true);
      setPending(false);
      return;
    }

    onSignedOut?.();
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={handleSignOut} disabled={pending} className={className}>
        {pending ? "Saindo…" : "Sair"}
      </button>
      <span role="alert" className="text-xs text-foreground-muted empty:hidden">
        {failed ? "Não foi possível sair. Tente novamente." : ""}
      </span>
    </>
  );
}

function getInitials(displayName: string | null, email: string | null) {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length > 0) {
    // Array.from separa por caractere, sem partir emojis e acentos compostos.
    const first = Array.from(words[0])[0];
    const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
    return `${first}${last}`.toUpperCase();
  }

  return (Array.from(email ?? "")[0] ?? "?").toUpperCase();
}
