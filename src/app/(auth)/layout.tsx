import { MAIN_CONTENT_ID } from "@/components/navbar/Navbar";

// Layout das páginas de Entrar e Cadastrar. O grupo (auth) não altera as URLs.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="flex min-h-dvh items-start pt-28 pb-24 md:items-center md:pt-32"
    >
      <div className="page-container">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
