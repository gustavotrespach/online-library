"use client";

import { X } from "lucide-react";
import Image from "next/image";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type RefObject,
} from "react";
import { BookCover } from "@/components/bookshelf/Book";
import { usePrefersReducedMotion } from "@/components/bookshelf/bookshelf-motion";
import { isOptimizableCover } from "@/lib/books/cover-hosts";
import { getReadingStatus } from "@/lib/books/reading";
import type { LibraryBook } from "@/types/book";
import { ReadingSections, useReadingDraft } from "./ReadingPanel";
import {
  animateBookClose,
  animateBookOpening,
  captureBookOrigin,
  showBookOpen,
  type OpenBookParts,
} from "./open-book-motion";

// Mesma proporção da capa na estante (bookshelf-layout).
const COVER_RATIO = 1.5;
const MAX_PAGE_WIDTH = 400;
const MIN_PAGE_WIDTH = 120;
// Abaixo desta largura de página, os controles de leitura não cabem na página
// com conforto (toque, texto de 16px) e vão para um cartão abaixo do livro.
const EDITOR_IN_PAGE_MIN_WIDTH = 300;

type CloseAction = "close" | "remove";

interface BookDetailsDialogProps {
  book: LibraryBook | null;
  // O livro na estante: o livro aberto sai dele e volta para ele.
  origin: HTMLElement | null;
  onClose: () => void;
  onRemove: (book: LibraryBook) => void;
  // Leitura salva (progresso, páginas lidas, feedback).
  onUpdate: (book: LibraryBook) => void;
  // Destino do foco ao fechar se o livro saiu da estante (removido).
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

// Livro aberto a partir da estante: o próprio livro sai da prateleira, vem
// para a frente e abre (capa à esquerda, dados à direita). Na página da
// direita, o usuário registra a leitura (progresso e feedback) e pode remover
// o livro. Os dados do catálogo (título, autor…) não são editáveis.
export function BookDetailsDialog({
  book,
  origin,
  onClose,
  onRemove,
  onUpdate,
  fallbackFocusRef,
}: BookDetailsDialogProps) {
  // undefined: nada a restaurar. null: o livro saiu da estante.
  const focusAfterClose = useRef<HTMLElement | null | undefined>(undefined);

  // O livro volta a aparecer na estante no mesmo commit em que o diálogo sai;
  // só então ele pode receber o foco.
  useLayoutEffect(() => {
    if (book || focusAfterClose.current === undefined) return;
    const target = focusAfterClose.current;
    focusAfterClose.current = undefined;
    (target?.isConnected ? target : fallbackFocusRef?.current)?.focus();
  }, [book, fallbackFocusRef]);

  if (!book) return null;

  return (
    <OpenBook
      key={book.id}
      book={book}
      origin={origin}
      onUpdate={onUpdate}
      onFinish={(action) => {
        if (action === "remove") {
          focusAfterClose.current = null;
          onRemove(book);
        } else {
          focusAfterClose.current = origin?.querySelector("button") ?? null;
          onClose();
        }
      }}
    />
  );
}

interface OpenBookProps {
  book: LibraryBook;
  origin: HTMLElement | null;
  onUpdate: (book: LibraryBook) => void;
  // Chamado quando o livro terminou de voltar à estante.
  onFinish: (action: CloseAction) => void;
}

// Confirmação mostrada abaixo do livro.
type Prompt = "none" | "remove" | "unsaved";

// <dialog> nativo com showModal() (decisions.md, 003): foco contido, estante
// inerte (sem drag nem clique) e Esc. O fechamento é animado: o Esc só pede o
// fechamento, e o diálogo sai quando o livro está de volta à estante.
function OpenBook({ book, origin, onUpdate, onFinish }: OpenBookProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<ReturnType<typeof animateBookOpening> | null>(null);
  const closingRef = useRef(false);
  const finishedRef = useRef(false);
  // Quem tinha o foco quando a confirmação abriu (volta a ele ao cancelar).
  const promptReturnRef = useRef<HTMLElement | null>(null);
  const cancelledRef = useRef(false);
  // O Esc já tratado no keydown não deve ser tratado de novo no cancel.
  const escapeHandledRef = useRef(false);
  const [prompt, setPrompt] = useState<Prompt>("none");
  // Largura do livro na estante: a capa provisória usa a mesma imagem, que já
  // está carregada.
  const [shelfWidth] = useState(() => origin?.getBoundingClientRect().width ?? 0);
  const reducedMotion = usePrefersReducedMotion();
  const viewport = useViewportSize();
  const draft = useReadingDraft(book, onUpdate);
  const titleId = useId();

  const pageWidth = getPageWidth(viewport.width, viewport.height);
  const pageHeight = Math.round(pageWidth * COVER_RATIO);
  const editorInPage = pageWidth >= EDITOR_IN_PAGE_MIN_WIDTH;
  const progress = Math.min(Math.max(book.progress, 0), 100);
  const { title, author, pages, publication_year: year, isbn } = book.book;
  const dirty = draft.dirty.progress || draft.dirty.feedback;

  // Cada montagem (inclusive a repetida do StrictMode) recomeça do livro na
  // estante.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const parts = dialog && collectParts(dialog);
    if (!dialog || !parts) return;

    if (!dialog.open) dialog.showModal();
    titleRef.current?.focus({ preventScroll: true });
    closingRef.current = false;
    if (reducedMotion) showBookOpen(parts);
    else timelineRef.current = animateBookOpening(parts, captureBookOrigin(parts.stage, origin));

    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, [origin, reducedMotion]);

  // Cancelar uma confirmação devolve o foco a quem a abriu.
  useEffect(() => {
    if (prompt !== "none" || !cancelledRef.current) return;
    cancelledRef.current = false;
    const target = promptReturnRef.current;
    (target?.isConnected ? target : removeButtonRef.current)?.focus();
  }, [prompt]);

  function finish(action: CloseAction) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(action);
  }

  function openPrompt(next: Exclude<Prompt, "none">) {
    const active = document.activeElement;
    promptReturnRef.current = active instanceof HTMLElement && dialogRef.current?.contains(active) ? active : null;
    setPrompt(next);
  }

  function cancelPrompt() {
    cancelledRef.current = true;
    setPrompt("none");
  }

  // Interrompe a abertura, se ainda estiver em curso, e devolve o livro. Com
  // alterações não salvas, pergunta antes (a não ser que o usuário já tenha
  // escolhido descartar ou remover).
  function requestClose(action: CloseAction, force = false) {
    const dialog = dialogRef.current;
    const parts = dialog && collectParts(dialog);
    if (closingRef.current || !parts) return;
    if (action === "close" && !force && dirty) return openPrompt("unsaved");
    closingRef.current = true;
    timelineRef.current?.kill();

    if (reducedMotion) return finish(action);
    timelineRef.current = animateBookClose(parts, captureBookOrigin(parts.stage, origin), () => finish(action));
  }

  // Esc: com uma confirmação aberta, cancela a confirmação; senão, pede o
  // fechamento.
  function handleEscape() {
    if (prompt !== "none") cancelPrompt();
    else requestClose("close");
  }

  async function saveAndClose() {
    if (await draft.save(["progress", "feedback"])) requestClose("close", true);
    else setPrompt("none");
  }

  // Clique no fundo (fora do livro e dos controles).
  function handleBackdropClick(event: MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) requestClose("close");
  }

  const facts = [
    { label: "Páginas", value: pages },
    { label: "Publicação", value: year },
    { label: "ISBN", value: isbn },
  ].filter((fact) => fact.value !== null);

  const actions = (
    <div
      data-control
      className={
        editorInPage
          ? "pointer-events-auto absolute inset-x-0 top-full mt-5 flex justify-center"
          : "mt-5 flex justify-center"
      }
    >
      {prompt === "remove" && (
        <div
          role="group"
          aria-labelledby="remove-question"
          className="flex flex-col items-center gap-3 rounded-md bg-background px-4 py-3 sm:flex-row sm:gap-4"
        >
          <p id="remove-question" className="text-center text-sm">
            Remover “{title}” da sua estante?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => requestClose("remove")}
              className="h-11 rounded-sm bg-paper px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Remover
            </button>
            <button type="button" onClick={cancelPrompt} className={SECONDARY_BUTTON}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {prompt === "unsaved" && (
        <div
          role="group"
          aria-labelledby="unsaved-question"
          className="flex flex-col items-center gap-3 rounded-md bg-background px-4 py-3 md:flex-row md:gap-4"
        >
          <p id="unsaved-question" className="text-center text-sm">
            Você tem alterações não salvas.
          </p>
          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            <button
              type="button"
              autoFocus
              disabled={draft.saving}
              onClick={() => void saveAndClose()}
              className="h-11 rounded-sm bg-paper px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {draft.saving ? "Salvando…" : "Salvar e fechar"}
            </button>
            <button
              type="button"
              disabled={draft.saving}
              onClick={() => requestClose("close", true)}
              className={SECONDARY_BUTTON}
            >
              Descartar
            </button>
            <button type="button" onClick={cancelPrompt} className={SECONDARY_BUTTON}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {prompt === "none" && (
        <button
          ref={removeButtonRef}
          type="button"
          onClick={() => openPrompt("remove")}
          className="h-11 rounded-sm border bg-background/70 px-4 text-sm font-medium text-foreground-muted transition-colors hover:border-foreground-subtle hover:text-foreground"
        >
          Remover da estante
        </button>
      )}
    </div>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // O Esc é tratado no keydown: cancelado ali, o navegador não chega a
      // pedir o fechamento, nem a fechar o diálogo à força num segundo Esc
      // (o que descartaria alterações sem perguntar).
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        escapeHandledRef.current = true;
        handleEscape();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (escapeHandledRef.current) escapeHandledRef.current = false;
        else handleEscape();
      }}
      // Fechamento imposto pelo navegador: o livro volta à estante sem animar.
      onClose={() => {
        timelineRef.current?.kill();
        finish("close");
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent"
    >
      {/* Escurecimento discreto: a estante continua visível atrás do livro. */}
      <div data-part="backdrop" aria-hidden className="pointer-events-none absolute inset-0 bg-black/60" />

      {/* Em telas pequenas, o cartão de leitura fica abaixo do livro e a
          coluna rola; em telas maiores, tudo cabe e o livro fica no centro. */}
      <div onClick={handleBackdropClick} className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div
          onClick={handleBackdropClick}
          className="flex min-h-full flex-col items-center justify-center px-3 pt-28 pb-16 md:py-16"
        >
          <div className="relative shrink-0" style={{ width: pageWidth * 2, height: pageHeight }}>
            <div data-part="stage" className="absolute inset-0">
              {/* Miolo: bloco de páginas e a página da direita. */}
              <div className="absolute inset-y-0 right-0 w-1/2">
                <div
                  data-part="shadow"
                  aria-hidden
                  className="absolute inset-0 shadow-[0_44px_70px_-24px_var(--color-black)]"
                />
                <div
                  aria-hidden
                  className="absolute top-0.5 -right-1 -bottom-1 left-0 bg-[repeating-linear-gradient(to_right,var(--color-paper)_0_1px,color-mix(in_oklab,var(--color-paper)_72%,var(--color-black))_1px_2px)] shadow-[0_12px_18px_-12px_var(--color-black)]"
                />
                <div data-part="leaf" className="absolute inset-0 overflow-hidden bg-paper text-background">
                  {/* Dobra central. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[14%] bg-linear-to-r from-black/25 via-black/5 to-transparent"
                  />
                  <div
                    data-page-content
                    className={`@container relative flex h-full flex-col px-[11%] pt-[12%] pb-[10%] ${editorInPage ? "overflow-y-auto overscroll-contain" : ""}`}
                  >
                    <h2
                      ref={titleRef}
                      id={titleId}
                      tabIndex={-1}
                      data-reveal
                      className="line-clamp-3 shrink-0 font-serif text-[clamp(1.0625rem,10cqi,2.125rem)] leading-[1.08] outline-none"
                    >
                      {title}
                    </h2>
                    <p
                      data-reveal
                      className="mt-[0.5em] line-clamp-2 shrink-0 text-[clamp(0.75rem,5cqi,1.0625rem)] leading-snug text-background/70"
                    >
                      {author}
                    </p>
                    <span data-reveal aria-hidden className="mt-[9%] mb-[7%] block h-px w-[18%] shrink-0 bg-accent" />
                    {facts.length > 0 && !editorInPage && (
                      // Página estreita: os dados em duas linhas compactas, para
                      // o ISBN caber inteiro.
                      <div
                        data-reveal
                        className="shrink-0 text-[clamp(0.75rem,4.4cqi,0.9375rem)] leading-relaxed tabular-nums"
                      >
                        {(pages !== null || year !== null) && (
                          <p>{[pages !== null ? `${pages} páginas` : null, year].filter(Boolean).join(" · ")}</p>
                        )}
                        {isbn !== null && (
                          <p>
                            <span className="text-background/60">ISBN</span> {isbn}
                          </p>
                        )}
                      </div>
                    )}
                    {facts.length > 0 && editorInPage && (
                      <dl
                        data-reveal
                        className="grid shrink-0 grid-cols-[auto_1fr] gap-x-[1.2em] gap-y-[0.3em] text-[clamp(0.75rem,4.4cqi,0.9375rem)]"
                      >
                        {facts.map((fact) => (
                          <div key={fact.label} className="contents">
                            <dt className="text-background/60">{fact.label}</dt>
                            <dd className="tabular-nums">{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {editorInPage ? (
                      <div data-reveal className="mt-[9%] flex shrink-0 flex-col gap-6">
                        <ReadingSections draft={draft} />
                      </div>
                    ) : (
                      <div data-reveal className="mt-auto pt-[6%] text-[clamp(0.75rem,4.4cqi,0.9375rem)]">
                        <p className="flex items-baseline justify-between gap-3">
                          <span className="text-background/60">Leitura</span>
                          <span>{getStatus(progress)}</span>
                        </p>
                        <div aria-hidden className="mt-[0.6em] h-0.5 bg-background/15">
                          <div className="h-full bg-background/70" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Capa: por fora, a capa da estante; aberta, a página da esquerda. */}
              <div data-part="board" aria-hidden className="absolute inset-y-0 right-0 w-1/2 transform-3d">
                <CoverFace book={book} pageWidth={pageWidth} shelfWidth={shelfWidth} progress={progress} />
                <CoverFace book={book} pageWidth={pageWidth} shelfWidth={shelfWidth} progress={progress} inside />
              </div>
            </div>

            <button
              data-control
              type="button"
              aria-label="Fechar o livro"
              onClick={() => requestClose("close")}
              className="absolute right-0 bottom-full mb-2 flex size-12 items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground md:-right-3"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            {editorInPage && actions}
          </div>

          {!editorInPage && (
            <>
              {/* Uma folha de papel com a leitura, como uma anotação guardada
                  no livro. */}
              <div
                data-reveal
                className="mt-6 flex shrink-0 flex-col gap-6 bg-paper p-5 text-background shadow-[0_24px_40px_-20px_var(--color-black)]"
                style={{ width: pageWidth * 2 }}
              >
                <ReadingSections draft={draft} />
              </div>
              {actions}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

const SECONDARY_BUTTON =
  "h-11 rounded-sm border px-4 text-sm font-medium transition-colors hover:border-foreground-subtle disabled:opacity-60";

interface CoverFaceProps {
  book: LibraryBook;
  pageWidth: number;
  shelfWidth: number;
  progress: number;
  // Face interna da capa: vira a página da esquerda com o livro aberto.
  inside?: boolean;
}

function CoverFace({ book, pageWidth, shelfWidth, progress, inside = false }: CoverFaceProps) {
  const url = book.book.cover_url;
  return (
    <div
      className={`absolute inset-0 backface-hidden ${inside ? "rotate-y-180 shadow-[0_44px_70px_-24px_var(--color-black)]" : ""}`}
    >
      {url && shelfWidth > 0 && (
        // A imagem da estante (já carregada) aparece na hora, enquanto a
        // versão maior carrega por cima dela.
        <Image
          src={url}
          alt=""
          fill
          sizes={`${shelfWidth}px`}
          unoptimized={!isOptimizableCover(url)}
          draggable={false}
          className="object-cover"
        />
      )}
      <BookCover book={book} width={pageWidth} progress={progress} />
      {inside && (
        <span className="pointer-events-none absolute inset-y-0 right-0 w-[10%] bg-linear-to-l from-black/35 to-transparent" />
      )}
    </div>
  );
}

function collectParts(dialog: HTMLDialogElement): OpenBookParts | null {
  const part = (name: string) => dialog.querySelector<HTMLElement>(`[data-part="${name}"]`);
  const stage = part("stage");
  const board = part("board");
  const leaf = part("leaf");
  const shadow = part("shadow");
  const backdrop = part("backdrop");
  if (!stage || !board || !leaf || !shadow || !backdrop) return null;

  return {
    stage,
    board,
    leaf,
    shadow,
    backdrop,
    content: [...dialog.querySelectorAll<HTMLElement>("[data-reveal]")],
    controls: [...dialog.querySelectorAll<HTMLElement>("[data-control]")],
  };
}

// Uma página do livro aberto: o maior tamanho que deixa o livro inteiro na
// tela, com espaço para fechar (em cima) e remover (embaixo).
function getPageWidth(viewportWidth: number, viewportHeight: number) {
  const compact = viewportWidth < 768;
  const sides = compact ? 24 : 64;
  const vertical = compact ? 240 : 224;
  const width = Math.min(
    MAX_PAGE_WIDTH,
    (viewportWidth - sides) / 2,
    (viewportHeight - vertical) / COVER_RATIO,
  );
  return Math.max(MIN_PAGE_WIDTH, Math.floor(width));
}

// O livro aberto acompanha o tamanho da janela; o listener só existe enquanto
// um livro está aberto.
function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function useViewportSize() {
  const width = useSyncExternalStore(subscribeToResize, () => window.innerWidth, () => 0);
  const height = useSyncExternalStore(subscribeToResize, () => window.innerHeight, () => 0);
  return { width, height };
}

function getStatus(progress: number) {
  switch (getReadingStatus(progress)) {
    case "not_started":
      return "Não iniciado";
    case "finished":
      return "Concluído";
    case "reading":
      return `${progress}% lido`;
  }
}
