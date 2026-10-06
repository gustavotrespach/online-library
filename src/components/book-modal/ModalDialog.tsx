"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  // Elemento que recebe o foco ao abrir (ex.: o campo de busca).
  initialFocusRef?: RefObject<HTMLElement | null>;
  // Destino do foco ao fechar se quem abriu o diálogo não existir mais (ex.:
  // o livro removido).
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

// <dialog> nativo com showModal() (decisions.md, 003): foco contido, fundo
// inerte e Esc vêm do navegador. Ao fechar, o foco volta a quem abriu.
export function ModalDialog({
  open,
  onClose,
  title,
  initialFocusRef,
  fallbackFocusRef,
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  function handleClose() {
    onClose();
    const opener = openerRef.current;
    (opener?.isConnected ? opener : fallbackFocusRef?.current)?.focus();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-lg border bg-background p-0 text-foreground opacity-0 transition-[opacity,display,overlay] transition-discrete duration-300 ease-smooth-in-out backdrop:bg-black/70 open:opacity-100 starting:open:opacity-0"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b py-3 pr-3 pl-5 md:pl-6">
          <h2 id={titleId} className="text-2xl">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => dialogRef.current?.close()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 md:px-6">{children}</div>
      </div>
    </dialog>
  );
}
