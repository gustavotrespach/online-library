"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { FormAlert } from "@/components/auth/AuthFormControls";
import { getCatalogDetails, searchCatalog } from "@/lib/books/catalog";
import { addBookToLibrary } from "@/lib/books/user-books";
import { createClient } from "@/lib/supabase/client";
import { bookQuerySchema } from "@/lib/validation/book";
import type { BookMetadata, BookSearchResult, LibraryBook } from "@/types/book";
import { CoverThumbnail } from "./CoverThumbnail";
import { ManualBookForm } from "./ManualBookForm";
import { ModalDialog } from "./ModalDialog";

type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "results"; query: string; results: BookSearchResult[] }
  | { status: "empty"; query: string }
  | { status: "error"; query: string };

type View =
  | { kind: "search" }
  | { kind: "review"; result: BookSearchResult; loadingDetails: boolean }
  | { kind: "manual" };

type SaveState = "idle" | "saving" | "duplicate" | "error";

const SAVE_MESSAGES: Record<SaveState, string | null> = {
  idle: null,
  saving: null,
  duplicate: "Este livro já está na sua biblioteca.",
  error: "Não foi possível adicionar o livro. Tente novamente.",
};

interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: (book: LibraryBook) => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

// Fluxo de adição: busca (Google Books / Open Library pelos Route Handlers),
// escolha, revisão e gravação; ou entrada manual. O diálogo só fecha depois
// que o livro foi gravado.
export function AddBookDialog({ open, onClose, onAdded, fallbackFocusRef }: AddBookDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewTitleRef = useRef<HTMLParagraphElement>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const detailsAbort = useRef<AbortController | null>(null);
  // Trava contra duplo envio, além do botão desabilitado.
  const savingRef = useRef(false);

  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [view, setView] = useState<View>({ kind: "search" });
  const [save, setSave] = useState<SaveState>("idle");

  // A cada etapa, o foco vai para o início dela (o que também a traz para a
  // área visível do diálogo). A entrada manual foca o título (autoFocus).
  useEffect(() => {
    if (view.kind === "review") reviewTitleRef.current?.focus();
    if (view.kind === "search") inputRef.current?.focus();
  }, [view.kind]);

  // Requisições pendentes são canceladas ao desmontar.
  useEffect(
    () => () => {
      searchAbort.current?.abort();
      detailsAbort.current?.abort();
    },
    [],
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = bookQuerySchema.safeParse(query);
    if (!parsed.success) {
      setQueryError(parsed.error.issues[0]?.message ?? "Busca inválida.");
      inputRef.current?.focus();
      return;
    }

    setQueryError(null);
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearch({ status: "loading", query: parsed.data });

    try {
      const results = await searchCatalog(parsed.data, controller.signal);
      setSearch(
        results.length > 0
          ? { status: "results", query: parsed.data, results }
          : { status: "empty", query: parsed.data },
      );
    } catch {
      if (!controller.signal.aborted) setSearch({ status: "error", query: parsed.data });
    }
  }

  async function select(result: BookSearchResult) {
    setSave("idle");
    setView({ kind: "review", result, loadingDetails: true });
    detailsAbort.current?.abort();
    const controller = new AbortController();
    detailsAbort.current = controller;

    try {
      const complete = await getCatalogDetails(result, controller.signal);
      setView({ kind: "review", result: complete, loadingDetails: false });
    } catch {
      // Cancelado: outra seleção ou o diálogo fechou.
    }
  }

  async function addBook(metadata: BookMetadata) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSave("saving");

    try {
      const result = await addBookToLibrary(createClient(), metadata);
      if (result.status === "already_in_library") {
        setSave("duplicate");
      } else {
        setSave("idle");
        onAdded(result.book);
        onClose();
      }
    } catch {
      setSave("error");
    } finally {
      savingRef.current = false;
    }
  }

  function backToSearch() {
    detailsAbort.current?.abort();
    setSave("idle");
    setView({ kind: "search" });
  }

  const saving = save === "saving";

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={view.kind === "manual" ? "Adicionar manualmente" : "Adicionar livro"}
      initialFocusRef={inputRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      {view.kind === "search" && (
        <div className="flex flex-col gap-6">
          <form role="search" noValidate onSubmit={handleSearch} className="flex flex-col gap-2">
            <label htmlFor="book-search" className="text-sm font-medium">
              Título, autor ou ISBN
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="book-search"
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                enterKeyHint="search"
                aria-invalid={queryError ? true : undefined}
                aria-describedby={queryError ? "book-search-error" : undefined}
                className="h-12 min-w-0 flex-1 rounded-md border bg-surface px-4 text-base transition-colors placeholder:text-foreground-subtle hover:border-foreground-subtle"
              />
              <button
                type="submit"
                disabled={search.status === "loading"}
                className="h-12 shrink-0 rounded-sm bg-paper px-5 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                Buscar
              </button>
            </div>
            {queryError && (
              <p id="book-search-error" className="text-sm text-foreground">
                {queryError}
              </p>
            )}
          </form>

          <SearchStatus search={search} />

          {search.status === "results" && (
            <ul aria-label="Resultados da busca" className="-my-3 divide-y">
              {search.results.map((result) => (
                <li key={`${result.provider}:${result.externalId}`} className="flex items-center gap-4 py-3">
                  <CoverThumbnail url={result.coverUrl} title={result.title} width={44} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{result.title}</p>
                    <p className="truncate text-sm text-foreground-muted">{result.author}</p>
                    <BookFacts book={result} className="text-sm text-foreground-muted" />
                  </div>
                  <button
                    type="button"
                    onClick={() => void select(result)}
                    aria-label={`Selecionar ${result.title}`}
                    className="h-11 shrink-0 rounded-sm border px-4 text-sm font-medium transition-colors hover:border-foreground-subtle"
                  >
                    Selecionar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm text-foreground-muted">
            {search.status === "empty" || search.status === "error"
              ? "Você pode cadastrar o livro com os dados que tiver."
              : "Não encontrou o livro?"}{" "}
            <button
              type="button"
              onClick={() => {
                setSave("idle");
                setView({ kind: "manual" });
              }}
              className="inline-flex min-h-11 items-center font-medium text-foreground underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent"
            >
              Adicionar manualmente
            </button>
          </p>
        </div>
      )}

      {view.kind === "review" && (
        <div className="flex flex-col gap-6">
          <div className="flex gap-5">
            <CoverThumbnail url={view.result.coverUrl} title={view.result.title} width={96} />
            <div className="min-w-0">
              <p ref={reviewTitleRef} tabIndex={-1} className="font-serif text-2xl leading-tight">
                {view.result.title}
              </p>
              <p className="mt-1 text-foreground-muted">{view.result.author}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <Fact label="Páginas" value={view.result.pages} />
                <Fact label="Ano" value={view.result.publicationYear} />
                <Fact label="ISBN" value={view.result.isbn} />
              </dl>
            </div>
          </div>

          <p role="status" className="min-h-6 text-sm text-foreground-muted">
            {view.loadingDetails ? "Carregando os detalhes da edição…" : null}
          </p>

          <FormAlert message={SAVE_MESSAGES[save]} />
          <button
            type="button"
            disabled={saving || view.loadingDetails}
            onClick={() => {
              const { provider, externalId, ...book } = view.result;
              void addBook({ ...book, source: { provider, externalId } });
            }}
            className="flex h-12 w-full items-center justify-center rounded-sm bg-paper text-base font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Adicionando…" : "Adicionar à biblioteca"}
          </button>
          <button
            type="button"
            onClick={backToSearch}
            className="-mt-3 h-12 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            Voltar aos resultados
          </button>
        </div>
      )}

      {view.kind === "manual" && (
        <ManualBookForm
          saving={saving}
          message={SAVE_MESSAGES[save]}
          onSubmit={addBook}
          onBack={backToSearch}
        />
      )}
    </ModalDialog>
  );
}

function SearchStatus({ search }: { search: SearchState }) {
  let message: string | null = null;
  if (search.status === "loading") message = "Buscando…";
  if (search.status === "results") {
    const count = search.results.length;
    message = `${count} ${count === 1 ? "resultado" : "resultados"} para “${search.query}”.`;
  }
  if (search.status === "empty") message = `Nenhum livro encontrado para “${search.query}”.`;
  if (search.status === "error") message = "A busca de livros está indisponível no momento.";

  // Região sempre presente, para que leitores de tela anunciem cada mudança.
  return (
    <p role="status" className={message ? "text-sm text-foreground-muted" : "sr-only"}>
      {message}
    </p>
  );
}

function BookFacts({ book, className }: { book: BookSearchResult; className: string }) {
  const facts = [book.pages ? `${book.pages} páginas` : null, book.publicationYear].filter(Boolean);
  return facts.length > 0 ? <p className={className}>{facts.join(" · ")}</p> : null;
}

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <>
      <dt className="text-foreground-muted">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  );
}
