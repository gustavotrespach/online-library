"use client";

import { useState } from "react";
import type { LibraryBook } from "@/types/book";
import { Bookshelf } from "./Bookshelf";
import { createMockBook, INITIAL_BOOKS } from "./bookshelf-mock-data";
import { moveToIndex } from "./bookshelf-order";

// Estante real com dados fictícios e controles de demonstração, para
// avaliação visual sem login. Os controles não fazem parte da estante final.
export function BookshelfPreview() {
  const [books, setBooks] = useState<LibraryBook[]>(INITIAL_BOOKS);
  // Quantos livros já foram adicionados: define os próximos ids e títulos.
  const [addedCount, setAddedCount] = useState(0);

  function addBooks(count: number) {
    const added = Array.from({ length: count }, (_, i) => createMockBook(addedCount + i));
    setAddedCount(addedCount + count);
    setBooks((current) => [...current, ...added]);
  }

  // Remove o livro do meio, para que os seguintes deslizem até o espaço.
  function removeBook() {
    setBooks((current) =>
      current.filter((_, index) => index !== Math.floor((current.length - 1) / 2)),
    );
  }

  // O último livro passa a ser o primeiro: todos os outros avançam uma posição.
  function reorder() {
    setBooks((current) => [current[current.length - 1], ...current.slice(0, -1)]);
  }

  function moveBook(bookId: string, toIndex: number) {
    setBooks((current) =>
      moveToIndex(current, current.findIndex((b) => b.id === bookId), toIndex),
    );
  }

  function reset() {
    setAddedCount(0);
    setBooks(INITIAL_BOOKS);
  }

  const controls = [
    { label: "Adicionar livro", action: () => addBooks(1), disabled: false },
    { label: "Adicionar 5", action: () => addBooks(5), disabled: false },
    { label: "Remover livro", action: removeBook, disabled: books.length === 0 },
    { label: "Reordenar", action: reorder, disabled: books.length < 2 },
    { label: "Mostrar vazio", action: () => setBooks([]), disabled: books.length === 0 },
    { label: "Resetar", action: reset, disabled: false },
  ];

  return (
    <>
      <div className="mt-10 rounded-md border border-dashed border-foreground-subtle/50 p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-medium tracking-widest text-foreground-muted uppercase">
            Controles do protótipo
          </p>
          <p aria-live="polite" className="text-sm text-foreground-muted">
            {books.length === 1 ? "1 livro" : `${books.length} livros`}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {controls.map(({ label, action, disabled }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              disabled={disabled}
              className="h-10 rounded-sm border px-4 text-sm font-medium text-foreground-muted transition-colors enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-16 md:mt-20">
        <Bookshelf books={books} onMove={moveBook} />
      </div>
    </>
  );
}
