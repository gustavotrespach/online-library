"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, type PointerEvent, type Ref } from "react";
import { isOptimizableCover } from "@/lib/books/cover-hosts";
import type { LibraryBook } from "@/types/book";
import type { BookPlacement } from "./bookshelf-layout";

// Faixa de transição entre a parte lida (colorida) e a não lida (cinza).
const FEATHER = 8;

// Tons de encadernação para livros sem capa (ou cuja capa não carregou). Como
// a arte de uma capa, representam o objeto livro, e não tokens da interface.
const FALLBACK_COVERS = [
  { background: "#7a3b2e", foreground: "#f1e8d7" },
  { background: "#24364f", foreground: "#f1e8d7" },
  { background: "#9a6b2f", foreground: "#1b1714" },
  { background: "#2f4b3c", foreground: "#efe6d2" },
  { background: "#4b2e45", foreground: "#efe6d2" },
  { background: "#d6c4a0", foreground: "#2a2420" },
  { background: "#2d5054", foreground: "#efe6d2" },
  { background: "#5e2420", foreground: "#efe6d2" },
  { background: "#6b5a2c", foreground: "#f1e8d7" },
  { background: "#3b3f47", foreground: "#efe6d2" },
];

interface BookProps {
  book: LibraryBook;
  placement: BookPlacement;
  ref?: Ref<HTMLLIElement>;
  // Livro saindo da estante: continua visível só durante a animação.
  exiting?: boolean;
  dragging?: boolean;
  // Com os handlers, o livro é um botão que pode ser reordenado e aberto.
  instructionsId?: string;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onClick?: () => void;
}

export function Book({
  book,
  placement,
  ref,
  exiting = false,
  dragging = false,
  instructionsId,
  onPointerDown,
  onKeyDown,
  onClick,
}: BookProps) {
  const progress = Math.min(Math.max(book.progress, 0), 100);
  const label = `${book.book.title}, de ${book.book.author} — ${getStatusLabel(progress)}`;
  const { x, y, width, height } = placement;
  const interactive = !exiting && onPointerDown !== undefined;

  const cover = <Cover book={book} width={width} progress={progress} />;

  return (
    <li
      ref={ref}
      aria-hidden={exiting || undefined}
      aria-label={exiting || interactive ? undefined : label}
      data-book={book.id}
      data-dragging={dragging || undefined}
      className="group absolute"
      style={{ left: x, top: y, width, height, zIndex: dragging ? 20 : undefined }}
    >
      {interactive ? (
        <button
          type="button"
          aria-label={label}
          aria-describedby={instructionsId}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          onClick={onClick}
          // Toque: rolagem vertical livre até a pressão longa pegar o livro.
          className="pointer-events-auto block size-full cursor-grab touch-pan-y select-none [-webkit-touch-callout:none] group-data-dragging:cursor-grabbing"
        >
          {cover}
        </button>
      ) : (
        cover
      )}
    </li>
  );
}

function Cover({ book, width, progress }: { book: LibraryBook; width: number; progress: number }) {
  const { title, author, cover_url: coverUrl } = book.book;
  // A capa que falhou é lembrada pela URL: uma URL nova tenta de novo.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = coverUrl !== null && coverUrl !== failedUrl;
  const fallback = FALLBACK_COVERS[hash(book.book_id) % FALLBACK_COVERS.length];
  const unread = 100 - progress;

  return (
    <div
      aria-hidden
      data-book-body
      className="relative flex size-full flex-col justify-between overflow-hidden px-[9%] pt-[12%] pb-[10%] shadow-[0_12px_18px_-12px_var(--color-black)] transition-shadow duration-300 group-data-dragging:shadow-[0_28px_32px_-14px_var(--color-black)]"
      style={showImage ? undefined : { backgroundColor: fallback.background, color: fallback.foreground }}
    >
      {showImage ? (
        // Capas do Google Books e do Open Library passam pela otimização do
        // Next.js; uma URL informada manualmente, de qualquer host, não pode
        // estar na lista de hosts permitidos e é exibida como está.
        <Image
          src={coverUrl}
          alt={`Capa de ${title}`}
          fill
          sizes={`${width}px`}
          unoptimized={!isOptimizableCover(coverUrl)}
          draggable={false}
          className="object-cover"
          onError={() => setFailedUrl(coverUrl)}
        />
      ) : (
        <>
          <p
            lang="pt-BR"
            className="font-serif leading-[1.05] font-medium hyphens-auto"
            style={{ fontSize: Math.round(width * 0.135) }}
          >
            {title}
          </p>
          <div>
            <span className="mb-[8%] block h-px w-1/3 bg-current opacity-40" />
            <p
              className="leading-tight tracking-wider uppercase opacity-80"
              style={{ fontSize: Math.max(6, Math.round(width * 0.07)) }}
            >
              {author}
            </p>
          </div>
        </>
      )}

      {/* Lombada: sombra discreta na borda esquerda. */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-linear-to-r from-black/35 to-transparent" />

      {/* Progresso: a parte ainda não lida fica em escala de cinza. */}
      {unread > 0 && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 backdrop-grayscale"
          style={{
            height: unread === 100 ? "100%" : `${unread + FEATHER}%`,
            maskImage:
              unread === 100
                ? undefined
                : `linear-gradient(to bottom, black calc(100% - ${FEATHER * 2}%), transparent)`,
          }}
        />
      )}
    </div>
  );
}

// Escolha estável do tom de fallback a partir do id do livro.
function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (Math.imul(h, 31) + value.charCodeAt(i)) >>> 0;
  return h;
}

function getStatusLabel(progress: number) {
  if (progress === 0) return "não iniciado";
  if (progress === 100) return "concluído";
  return `${progress}% lido`;
}
