import { Hero } from "@/components/hero/Hero";
import { MAIN_CONTENT_ID } from "@/components/navbar/Navbar";

export default function HomePage() {
  return (
    <main>
      <Hero />

      {/* Seção provisória: valida a passagem do preto final do Hero. */}
      <section
        id={MAIN_CONTENT_ID}
        className="flex min-h-dvh items-center bg-linear-to-b from-black to-background to-50%"
      >
        <div className="page-container py-24">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">
            Em construção
          </p>
          <h1 className="mt-6 text-display">Online Library</h1>
          <p className="mt-6 max-w-xl text-base text-foreground-muted md:text-lg">
            Sua biblioteca pessoal online: organize seus livros e acompanhe seu
            progresso de leitura.
          </p>
        </div>
      </section>
    </main>
  );
}
