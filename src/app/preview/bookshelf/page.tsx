import type { Metadata } from "next";
import { BookshelfPreview } from "@/components/bookshelf/BookshelfPreview";
import { MAIN_CONTENT_ID } from "@/components/navbar/Navbar";

// Rota temporária, sem link na navegação: a estante real (o mesmo componente
// da Home) com dados fictícios, para avaliação visual sem login. Remover
// quando a estante real for validada.
export const metadata: Metadata = {
  title: "Estante (protótipo) | Online Library",
  robots: { index: false, follow: false },
};

export default function BookshelfPreviewPage() {
  return (
    <main id={MAIN_CONTENT_ID} className="pt-28 pb-24 md:pt-32 md:pb-32">
      <section aria-labelledby="bookshelf-title" className="page-container">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">
            My Library
          </p>
          <h1 id="bookshelf-title" className="mt-4 text-4xl md:text-5xl">
            Sua estante
          </h1>
          <p className="mt-4 max-w-xl text-base text-foreground-muted">
            Os livros que você está lendo e os que já terminou. A cor da capa
            aparece conforme a leitura avança.
          </p>

          <BookshelfPreview />
        </div>
      </section>
    </main>
  );
}
