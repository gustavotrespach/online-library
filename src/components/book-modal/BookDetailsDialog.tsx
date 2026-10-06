"use client";

import { useState, type RefObject } from "react";
import type { LibraryBook } from "@/types/book";
import { CoverThumbnail } from "./CoverThumbnail";
import { ModalDialog } from "./ModalDialog";

interface BookDetailsDialogProps {
  book: LibraryBook | null;
  onClose: () => void;
  onRemove: (book: LibraryBook) => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

// Livro aberto a partir da estante: dados e remoção (com confirmação). A
// edição de progresso e de dados fica para outra etapa.
export function BookDetailsDialog({ book, onClose, onRemove, fallbackFocusRef }: BookDetailsDialogProps) {
  const [confirming, setConfirming] = useState(false);
  // Mantém o último livro durante a animação de fechamento.
  const [shown, setShown] = useState(book);
  // Cada abertura começa sem a confirmação de remoção, inclusive ao reabrir
  // o mesmo livro.
  const [openedWith, setOpenedWith] = useState(book);
  if (book !== openedWith) {
    setOpenedWith(book);
    if (book) {
      setShown(book);
      setConfirming(false);
    }
  }

  return (
    <ModalDialog
      open={book !== null}
      onClose={onClose}
      title="Livro"
      fallbackFocusRef={fallbackFocusRef}
    >
      {shown && (
        <div className="flex flex-col gap-6">
          <div className="flex gap-5">
            <CoverThumbnail url={shown.book.cover_url} title={shown.book.title} width={96} />
            <div className="min-w-0">
              <p className="font-serif text-2xl leading-tight">{shown.book.title}</p>
              <p className="mt-1 text-foreground-muted">{shown.book.author}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-foreground-muted">Leitura</dt>
                <dd>{getStatus(shown.progress)}</dd>
                <dt className="text-foreground-muted">Páginas</dt>
                <dd>{shown.book.pages ?? "—"}</dd>
                <dt className="text-foreground-muted">Ano</dt>
                <dd>{shown.book.publication_year ?? "—"}</dd>
                <dt className="text-foreground-muted">ISBN</dt>
                <dd>{shown.book.isbn ?? "—"}</dd>
              </dl>
            </div>
          </div>

          {confirming ? (
            <div role="group" aria-labelledby="remove-question" className="flex flex-col gap-3 rounded-md bg-surface p-4">
              <p id="remove-question" className="text-sm">
                Remover “{shown.book.title}” da sua estante?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => onRemove(shown)}
                  className="h-11 flex-1 rounded-sm bg-paper px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  Remover
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="h-11 flex-1 rounded-sm border px-4 text-sm font-medium transition-colors hover:border-foreground-subtle"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-11 self-start rounded-sm border px-4 text-sm font-medium text-foreground-muted transition-colors hover:border-foreground-subtle hover:text-foreground"
            >
              Remover da estante
            </button>
          )}
        </div>
      )}
    </ModalDialog>
  );
}

function getStatus(progress: number) {
  if (progress === 0) return "Não iniciado";
  if (progress === 100) return "Concluído";
  return `${progress}% lido`;
}
