"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AddBookDialog } from "@/components/book-modal/AddBookDialog";
import { BookDetailsDialog } from "@/components/book-modal/BookDetailsDialog";
import { Bookshelf } from "@/components/bookshelf/Bookshelf";
import { moveToIndex } from "@/components/bookshelf/bookshelf-order";
import { ReadingProgressSection, type ReadingProgressState } from "@/components/reading-progress/ReadingProgressSection";
import { fetchLibraryBooks, removeLibraryBook, saveLibraryOrder } from "@/lib/books/user-books";
import { createClient } from "@/lib/supabase/client";
import type { LibraryBook } from "@/types/book";

export const LIBRARY_SECTION_ID = "my-library";

// Resultado de uma consulta, identificado pelo usuário e pela tentativa. A
// ordem da estante é a lista de ids, separada dos dados dos livros.
type ReadyData = { key: string; status: "ready"; books: LibraryBook[]; order: string[] };
type LibraryData = ReadyData | { key: string; status: "error" };

type LibraryStatus = "loading" | "guest" | "empty" | "ready" | "error";

const NO_BOOKS: LibraryBook[] = [];

// Ordem salva por último, ajustada aos livros que existem agora: os que
// saíram somem e os novos ficam no fim.
function reconcileOrder(saved: string[], current: string[]) {
  const present = new Set(current);
  const kept = saved.filter((id) => present.has(id));
  const keptSet = new Set(kept);
  return [...kept, ...current.filter((id) => !keptSet.has(id))];
}

// Seção My Library da Home, seguida do Reading Progress, que é derivado dos
// mesmos livros (decisions.md, 014). Visitantes não consultam nada; usuários
// autenticados carregam os próprios livros sob o RLS de user_books.
export function LibrarySection() {
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.userId : null;
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<LibraryData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addDialogKey, setAddDialogKey] = useState(0);
  // Livro aberto e o elemento dele na estante (origem da animação).
  const [opened, setOpened] = useState<{ id: string; origin: HTMLElement } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Última ordem confirmada pelo banco e fila de gravação (uma por vez).
  const savedOrder = useRef<string[]>([]);
  const pendingOrder = useRef<string[] | null>(null);
  const savingOrder = useRef(false);
  const requestKey = userId ? `${userId}:${attempt}` : null;

  useEffect(() => {
    if (!userId || !requestKey) return;
    let active = true;

    fetchLibraryBooks(createClient())
      .then((books) => {
        if (!active) return;
        const order = books.map((b) => b.id);
        savedOrder.current = order;
        setData({ key: requestKey, status: "ready", books, order });
      })
      .catch(() => {
        if (active) setData({ key: requestKey, status: "error" });
      });

    return () => {
      active = false;
    };
  }, [userId, requestKey]);

  // Dados de outro usuário ou de uma tentativa anterior não são exibidos.
  const current = data && data.key === requestKey ? data : null;
  const ready = current?.status === "ready" ? current : null;

  const books = useMemo(() => {
    if (!ready) return NO_BOOKS;
    const byId = new Map(ready.books.map((b) => [b.id, b]));
    return ready.order.flatMap((id) => byId.get(id) ?? []);
  }, [ready]);

  let status: LibraryStatus;
  if (auth.status === "guest") status = "guest";
  else if (!current) status = "loading";
  else if (current.status === "error") status = "error";
  else status = books.length === 0 ? "empty" : "ready";

  const openBook = opened ? (books.find((b) => b.id === opened.id) ?? null) : null;

  function updateReady(update: (previous: ReadyData) => ReadyData) {
    setData((previous) => (previous?.status === "ready" ? update(previous) : previous));
  }

  // Grava a ordem depois do drop (ou da tecla). Se a gravação falhar, a
  // estante volta à última ordem salva: a interface nunca fica divergente do
  // banco sem aviso.
  async function persistOrder(order: string[]) {
    pendingOrder.current = order;
    if (savingOrder.current) return;
    savingOrder.current = true;

    while (pendingOrder.current) {
      const next = pendingOrder.current;
      pendingOrder.current = null;
      try {
        await saveLibraryOrder(createClient(), next);
        savedOrder.current = next;
      } catch {
        pendingOrder.current = null;
        updateReady((previous) => ({ ...previous, order: reconcileOrder(savedOrder.current, previous.order) }));
        setNotice("Não foi possível salvar a nova ordem. A ordem anterior foi restaurada.");
      }
    }
    savingOrder.current = false;
  }

  function moveBook(bookId: string, toIndex: number) {
    if (!ready) return;
    const order = moveToIndex(ready.order, ready.order.indexOf(bookId), toIndex);
    setNotice(null);
    updateReady((previous) => ({ ...previous, order }));
    void persistOrder(order);
  }

  function addBook(book: LibraryBook) {
    // O banco colocou o livro no fim da estante.
    savedOrder.current = [...savedOrder.current, book.id];
    updateReady((previous) => ({
      ...previous,
      books: [...previous.books, book],
      order: [...previous.order, book.id],
    }));
    setNotice(`“${book.book.title}” foi adicionado à sua estante.`);
  }

  // Leitura salva no livro aberto: só os dados desse livro mudam; a ordem e
  // o layout da estante continuam os mesmos.
  function updateBook(book: LibraryBook) {
    updateReady((previous) => ({
      ...previous,
      books: previous.books.map((b) => (b.id === book.id ? book : b)),
    }));
  }

  // A estante anima a saída na hora; se o banco recusar, o livro volta.
  async function removeBook(book: LibraryBook) {
    if (!ready) return;
    const index = ready.order.indexOf(book.id);
    setOpened(null);
    setNotice(null);
    updateReady((previous) => ({ ...previous, order: previous.order.filter((id) => id !== book.id) }));

    try {
      await removeLibraryBook(createClient(), book.id);
      savedOrder.current = savedOrder.current.filter((id) => id !== book.id);
      setNotice(`“${book.book.title}” foi removido da sua estante.`);
    } catch {
      updateReady((previous) => {
        const order = [...previous.order];
        order.splice(Math.min(index, order.length), 0, book.id);
        return { ...previous, order };
      });
      setNotice("Não foi possível remover o livro. Ele voltou para a estante.");
    }
  }

  const canAdd = status === "ready" || status === "empty";
  const reading: ReadingProgressState =
    status === "ready" || status === "empty" ? { status: "ready", books } : { status };

  return (
    <>
      <section
        id={LIBRARY_SECTION_ID}
        aria-labelledby="my-library-title"
        aria-busy={status === "loading"}
        className="relative scroll-mt-16 pt-24 pb-24 md:scroll-mt-20 md:pt-32 md:pb-32"
      >
        <div className="page-container">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-medium tracking-widest text-accent uppercase">My Library</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <h2 id="my-library-title" className="text-4xl md:text-5xl">
                Sua estante
              </h2>
              {canAdd && (
                <button
                  ref={addButtonRef}
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    setAddDialogKey((key) => key + 1);
                    setAdding(true);
                  }}
                  className="flex h-12 items-center gap-2 rounded-sm border px-5 text-sm font-medium text-foreground transition-colors hover:border-foreground-subtle"
                >
                  <Plus size={16} strokeWidth={1.5} />
                  Adicionar livro
                </button>
              )}
            </div>
            {/* Altura mínima fixa: a troca de mensagem não desloca a estante. */}
            <div className="mt-4 min-h-14 max-w-xl text-base text-foreground-muted">
              <LibraryMessage status={status} onRetry={() => setAttempt((n) => n + 1)} />
              <p role="status" className={notice ? "mt-2 text-sm text-foreground" : "sr-only"}>
                {notice}
              </p>
            </div>

            <div className="mt-12 md:mt-16">
              <Bookshelf
                books={books}
                loaded={status !== "loading" && status !== "error"}
                onMove={status === "ready" ? moveBook : undefined}
                onOpen={status === "ready" ? (id, origin) => setOpened({ id, origin }) : undefined}
                openBookId={openBook?.id}
              />
            </div>
          </div>
        </div>

        {canAdd && (
          <AddBookDialog
            key={addDialogKey}
            open={adding}
            onClose={() => setAdding(false)}
            onAdded={addBook}
            fallbackFocusRef={addButtonRef}
          />
        )}
        <BookDetailsDialog
          book={openBook}
          origin={opened?.origin ?? null}
          onClose={() => setOpened(null)}
          onRemove={(book) => void removeBook(book)}
          onUpdate={updateBook}
          fallbackFocusRef={addButtonRef}
        />
      </section>
      <ReadingProgressSection state={reading} onRetry={() => setAttempt((n) => n + 1)} />
    </>
  );
}

function LibraryMessage({ status, onRetry }: { status: LibraryStatus; onRetry: () => void }) {
  switch (status) {
    case "loading":
      // Aparece com atraso: carregamentos rápidos não piscam a mensagem.
      return (
        <p role="status" className="transition-opacity delay-500 duration-500 starting:opacity-0">
          Carregando sua estante…
        </p>
      );
    case "guest":
      return (
        <p>
          <Link href="/entrar" className="text-foreground underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent">
            Entre
          </Link>{" "}
          ou{" "}
          <Link href="/cadastrar" className="text-foreground underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent">
            crie sua conta
          </Link>{" "}
          para começar sua biblioteca.
        </p>
      );
    case "empty":
      return <p>Sua estante ainda está vazia. Adicione o primeiro livro.</p>;
    case "error":
      return (
        <p role="alert">
          Não foi possível carregar sua estante.{" "}
          <button
            type="button"
            onClick={onRetry}
            className="text-foreground underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent"
          >
            Tentar novamente
          </button>
        </p>
      );
    case "ready":
      return (
        <p>
          Os livros que você está lendo e os que já terminou. A cor da capa
          aparece conforme a leitura avança.
        </p>
      );
  }
}
