import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Cadastrar | Online Library",
};

export default function SignUpPage() {
  return (
    <>
      <p className="text-xs font-medium tracking-widest text-accent uppercase">
        Online Library
      </p>
      <h1 className="mt-4 text-4xl md:text-5xl">Comece sua biblioteca</h1>
      <p className="mt-4 text-base text-foreground-muted">
        Crie sua conta para guardar seus livros e acompanhar suas leituras.
      </p>

      <div className="mt-10">
        <SignUpForm />
      </div>

      <p className="mt-8 text-sm text-foreground-muted">
        Já tem conta?{" "}
        <Link
          href="/entrar"
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
