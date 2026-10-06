"use client";

import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth/AuthField";
import { FormAlert, SubmitButton } from "@/components/auth/AuthFormControls";
import {
  getFieldErrors,
  type FieldErrors,
} from "@/lib/validation/auth";
import { manualBookSchema, toManualMetadata, type ManualBookInput } from "@/lib/validation/book";
import type { BookMetadata } from "@/types/book";

interface ManualBookFormProps {
  saving: boolean;
  message: string | null;
  onSubmit: (metadata: BookMetadata) => void;
  onBack: () => void;
}

// Entrada manual: título e autor obrigatórios; o resto é opcional. A capa é
// uma URL HTTPS ou o fallback da estante (upload fica para outra etapa).
export function ManualBookForm({ saving, message, onSubmit, onBack }: ManualBookFormProps) {
  const [errors, setErrors] = useState<FieldErrors<ManualBookInput>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(
      ["title", "author", "pages", "publicationYear", "isbn", "coverUrl"].map((name) => [
        name,
        String(new FormData(form).get(name) ?? ""),
      ]),
    );

    const parsed = manualBookSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = getFieldErrors(parsed.error);
      setErrors(fieldErrors);
      const first = Object.keys(fieldErrors)[0];
      if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setErrors({});
    onSubmit(toManualMetadata(parsed.data));
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <AuthField label="Título" name="title" required autoFocus autoComplete="off" error={errors.title} />
      <AuthField label="Autor" name="author" required autoComplete="off" error={errors.author} />
      <div className="grid gap-5 md:grid-cols-2">
        <AuthField label="Páginas (opcional)" name="pages" inputMode="numeric" autoComplete="off" error={errors.pages} />
        <AuthField
          label="Ano de publicação (opcional)"
          name="publicationYear"
          inputMode="numeric"
          autoComplete="off"
          error={errors.publicationYear}
        />
      </div>
      <AuthField label="ISBN (opcional)" name="isbn" autoComplete="off" error={errors.isbn} />
      <AuthField
        label="Endereço da capa (opcional)"
        name="coverUrl"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://"
        hint="Sem capa, o livro aparece com título e autor na estante."
        error={errors.coverUrl}
      />

      <FormAlert message={message} />
      <SubmitButton pending={saving} label="Adicionar à biblioteca" pendingLabel="Adicionando…" />
      <button
        type="button"
        onClick={onBack}
        className="h-12 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
      >
        Voltar à busca
      </button>
    </form>
  );
}
