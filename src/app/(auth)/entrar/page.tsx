import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Entrar | Online Library",
};

// Definido por /auth/confirm quando o link de confirmação não é aceito.
const INVALID_LINK_NOTICE =
  "Este link de confirmação é inválido ou expirou. Se você já confirmou seu e-mail, entre normalmente; caso contrário, cadastre-se de novo para receber um novo link.";

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { erro } = await searchParams;

  return (
    <>
      <p className="text-xs font-medium tracking-widest text-accent uppercase">
        Online Library
      </p>
      <h1 className="mt-4 text-4xl md:text-5xl">Continue sua leitura</h1>
      <p className="mt-4 text-base text-foreground-muted">
        Entre para voltar à sua biblioteca.
      </p>

      {erro === "link-invalido" && (
        <p role="status" className="mt-8 rounded-md bg-surface p-4 text-sm text-foreground">
          {INVALID_LINK_NOTICE}
        </p>
      )}

      <div className="mt-10">
        <SignInForm />
      </div>

      <p className="mt-8 text-sm text-foreground-muted">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastrar"
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
