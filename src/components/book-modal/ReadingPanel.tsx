"use client";

import { useEffect, useId, useRef, useState } from "react";
import { hasPageCount, pagesFromProgress, progressFromPages } from "@/lib/books/reading";
import { updateReading, type ReadingChanges } from "@/lib/books/user-books";
import { createClient } from "@/lib/supabase/client";
import {
  feedbackSchema,
  MAX_FEEDBACK_LENGTH,
  pagesReadSchema,
  progressPercentSchema,
} from "@/lib/validation/book";
import type { LibraryBook } from "@/types/book";

export type ReadingPart = "progress" | "feedback";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVED_MESSAGE_MS = 2500;

const MESSAGES: Record<ReadingPart, { saved: string; error: string }> = {
  progress: {
    saved: "Progresso salvo",
    error: "Não foi possível salvar o progresso. Tente novamente.",
  },
  feedback: {
    saved: "Feedback salvo",
    error: "Não foi possível salvar o feedback. Tente novamente.",
  },
};

// Rascunho da leitura no livro aberto: o que o usuário digitou, comparado com
// o que está salvo. Nada é gravado por tecla; cada parte tem o seu "Salvar", e
// "Salvar e fechar" grava as duas em uma única atualização.
export function useReadingDraft(book: LibraryBook, onSaved: (book: LibraryBook) => void) {
  const pages = hasPageCount(book.book.pages) ? book.book.pages : null;
  const savedAmount = String(
    pages === null ? book.progress : (book.pages_read ?? pagesFromProgress(book.progress, pages)),
  );
  const savedFeedback = book.feedback ?? "";

  const [amount, setAmount] = useState(savedAmount);
  const [feedback, setFeedback] = useState(savedFeedback);
  const [status, setStatus] = useState<Record<ReadingPart, SaveStatus>>({ progress: "idle", feedback: "idle" });
  const [errors, setErrors] = useState<Record<ReadingPart, string | null>>({ progress: null, feedback: null });
  // Trava contra duplo envio, além dos botões desabilitados.
  const savingRef = useRef(false);

  const dirty: Record<ReadingPart, boolean> = {
    progress: amount.trim() !== savedAmount,
    feedback: feedback.trim() !== savedFeedback,
  };

  // "Salvo" some sozinho depois de um tempo.
  useEffect(() => {
    if (status.progress !== "saved" && status.feedback !== "saved") return;
    const timer = window.setTimeout(
      () =>
        setStatus((current) => ({
          progress: current.progress === "saved" ? "idle" : current.progress,
          feedback: current.feedback === "saved" ? "idle" : current.feedback,
        })),
      SAVED_MESSAGE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  const amountResult = pages === null ? progressPercentSchema.safeParse(amount) : pagesReadSchema(pages).safeParse(amount);
  // Prévia do progresso com o que foi digitado (ou o salvo, se for inválido).
  const previewProgress = amountResult.success
    ? pages === null
      ? amountResult.data
      : progressFromPages(amountResult.data, pages)
    : book.progress;

  function edit(part: ReadingPart, value: string) {
    if (part === "progress") setAmount(value);
    else setFeedback(value);
    setErrors((current) => ({ ...current, [part]: null }));
    setStatus((current) => ({ ...current, [part]: current[part] === "saving" ? "saving" : "idle" }));
  }

  // Grava as partes pedidas que têm alterações. Devolve false se algo ficou
  // sem salvar (inválido ou erro de rede); o rascunho nunca é perdido.
  async function save(parts: ReadingPart[]): Promise<boolean> {
    const pending = parts.filter((part) => dirty[part]);
    if (pending.length === 0) return true;
    if (savingRef.current) return false;

    const changes: ReadingChanges = {};
    const nextErrors = { ...errors };
    for (const part of pending) {
      if (part === "progress") {
        if (!amountResult.success) {
          nextErrors.progress = amountResult.error.issues[0]?.message ?? "Valor inválido.";
          continue;
        }
        if (pages === null) changes.progress = amountResult.data;
        else changes.pages_read = amountResult.data;
      } else {
        const result = feedbackSchema.safeParse(feedback);
        if (!result.success) {
          nextErrors.feedback = result.error.issues[0]?.message ?? "Texto inválido.";
          continue;
        }
        changes.feedback = result.data;
      }
    }
    setErrors(nextErrors);
    if (pending.some((part) => nextErrors[part])) return false;

    const sentAmount = amount;
    const sentFeedback = feedback;
    savingRef.current = true;
    setStatus((current) => withParts(current, pending, "saving"));

    try {
      const updated = await updateReading(createClient(), book.id, changes);
      onSaved(updated);
      // O banco devolve os valores finais (feedback aparado, páginas). Texto
      // digitado durante a gravação não é sobrescrito.
      if (pending.includes("progress")) {
        const next = String(pages === null ? updated.progress : (updated.pages_read ?? 0));
        setAmount((current) => (current === sentAmount ? next : current));
      }
      if (pending.includes("feedback")) {
        setFeedback((current) => (current === sentFeedback ? (updated.feedback ?? "") : current));
      }
      setStatus((current) => withParts(current, pending, "saved"));
      return true;
    } catch {
      setStatus((current) => withParts(current, pending, "error"));
      return false;
    } finally {
      savingRef.current = false;
    }
  }

  return {
    pages,
    amount,
    feedback,
    dirty,
    status,
    errors,
    previewProgress,
    saving: status.progress === "saving" || status.feedback === "saving",
    edit,
    save,
  };
}

export type ReadingDraft = ReturnType<typeof useReadingDraft>;

function withParts(current: Record<ReadingPart, SaveStatus>, parts: ReadingPart[], value: SaveStatus) {
  const next = { ...current };
  for (const part of parts) next[part] = value;
  return next;
}

function statusMessage(draft: ReadingDraft, part: ReadingPart) {
  if (draft.errors[part]) return draft.errors[part];
  switch (draft.status[part]) {
    case "saving":
      return "Salvando…";
    case "saved":
      // Texto digitado durante a gravação ainda não foi salvo.
      return draft.dirty[part] ? "Alterações não salvas" : MESSAGES[part].saved;
    case "error":
      return MESSAGES[part].error;
    case "idle":
      return draft.dirty[part] ? "Alterações não salvas" : null;
  }
}

// Controles sobre papel: o foco usa a cor da tinta (o dourado não tem
// contraste suficiente no papel).
const FIELD =
  "rounded-sm border border-background/25 bg-paper text-base text-background transition-colors hover:border-background/45 focus-visible:outline-background";
const BUTTON =
  "h-11 shrink-0 rounded-sm bg-background px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-background disabled:cursor-not-allowed disabled:opacity-50";
const HEADING = "font-sans text-xs font-medium tracking-widest text-background/60 uppercase";

// Progresso e feedback, dentro da página do livro aberto (ou, em telas
// pequenas, no cartão de papel abaixo dele).
export function ReadingSections({ draft }: { draft: ReadingDraft }) {
  const id = useId();
  const progressMessage = statusMessage(draft, "progress");
  const feedbackMessage = statusMessage(draft, "feedback");
  const progressInvalid = draft.errors.progress !== null;
  const feedbackInvalid = draft.errors.feedback !== null;

  return (
    <>
      <section aria-labelledby={`${id}-progress`} className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id={`${id}-progress`} className={HEADING}>
            Progresso
          </h3>
          <p className="text-sm tabular-nums" aria-hidden>
            {draft.previewProgress}%
          </p>
        </div>
        <div aria-hidden className="h-0.5 bg-background/15">
          <div className="h-full bg-background/70 transition-[width]" style={{ width: `${draft.previewProgress}%` }} />
        </div>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void draft.save(["progress"]);
          }}
          className="flex flex-wrap items-end gap-x-3 gap-y-2"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-amount`} className="text-sm text-background/70">
              {draft.pages === null ? "Porcentagem lida" : "Páginas lidas"}
            </label>
            <div className="flex items-center gap-2 text-sm text-background/70">
              <input
                id={`${id}-amount`}
                type="number"
                inputMode="numeric"
                min={0}
                max={draft.pages ?? 100}
                step={1}
                value={draft.amount}
                onChange={(event) => draft.edit("progress", event.target.value)}
                aria-invalid={progressInvalid || undefined}
                aria-describedby={`${id}-progress-status`}
                className={`${FIELD} h-11 w-24 px-3 tabular-nums`}
              />
              <span>{draft.pages === null ? "%" : `de ${draft.pages}`}</span>
            </div>
          </div>
          <button type="submit" disabled={draft.saving || !draft.dirty.progress} className={BUTTON}>
            Salvar progresso
          </button>
        </form>
        <p
          id={`${id}-progress-status`}
          role="status"
          className={`min-h-5 text-sm ${progressInvalid || draft.status.progress === "error" ? "font-medium text-background" : "text-background/65"}`}
        >
          {progressMessage}
        </p>
      </section>

      <section aria-labelledby={`${id}-feedback`} className="flex flex-col gap-3">
        <h3 id={`${id}-feedback`} className={HEADING}>
          <label htmlFor={`${id}-feedback-text`}>Seu feedback</label>
        </h3>
        <textarea
          id={`${id}-feedback-text`}
          value={draft.feedback}
          onChange={(event) => draft.edit("feedback", event.target.value)}
          maxLength={MAX_FEEDBACK_LENGTH}
          rows={5}
          placeholder="Escreva o que você achou deste livro…"
          aria-invalid={feedbackInvalid || undefined}
          aria-describedby={`${id}-feedback-limit ${id}-feedback-status`}
          className={`${FIELD} min-h-32 w-full resize-y p-3 leading-relaxed placeholder:text-background/55`}
        />
        <div className="flex items-center justify-between gap-3">
          {/* O contador visível não é anunciado a cada tecla; o limite é
              descrito uma vez, no campo. */}
          <p className="text-sm tabular-nums text-background/65" aria-hidden>
            {draft.feedback.length} / {MAX_FEEDBACK_LENGTH}
          </p>
          <span id={`${id}-feedback-limit`} className="sr-only">
            Até {MAX_FEEDBACK_LENGTH} caracteres. Apague o texto e salve para remover o feedback.
          </span>
          <button
            type="button"
            onClick={() => void draft.save(["feedback"])}
            disabled={draft.saving || !draft.dirty.feedback}
            className={BUTTON}
          >
            Salvar feedback
          </button>
        </div>
        <p
          id={`${id}-feedback-status`}
          role="status"
          className={`min-h-5 text-sm ${feedbackInvalid || draft.status.feedback === "error" ? "font-medium text-background" : "text-background/65"}`}
        >
          {feedbackMessage}
        </p>
      </section>
    </>
  );
}
