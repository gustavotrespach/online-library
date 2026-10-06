import { Hero } from "@/components/hero/Hero";
import { LibrarySection } from "@/components/library/LibrarySection";
import { MAIN_CONTENT_ID } from "@/components/navbar/Navbar";

export default function HomePage() {
  return (
    <main>
      <h1 className="sr-only">Online Library</h1>
      <Hero />

      <div id={MAIN_CONTENT_ID} className="relative bg-background">
        {/* O preto final do Hero continua aqui e chega a background na metade da tela. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-dvh bg-linear-to-b from-black to-background to-50%"
        />
        <LibrarySection />
      </div>
    </main>
  );
}
