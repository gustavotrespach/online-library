import { z } from "zod";
import { normalizeIsbn } from "@/lib/books/isbn";
import { latestPlausibleYear, MAX_PAGES, MAX_TEXT_LENGTH } from "@/lib/books/normalize";
import type { BookMetadata } from "@/types/book";

// Mesmos limites da função add_book_to_library no banco (decisions.md, 011).

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 200;

export const bookQuerySchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(MIN_QUERY_LENGTH, "Digite pelo menos 2 caracteres.")
      .max(MAX_QUERY_LENGTH, `Use no máximo ${MAX_QUERY_LENGTH} caracteres.`),
  );

const requiredText = (label: string) =>
  z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(1, `Informe o ${label}.`)
        .max(MAX_TEXT_LENGTH, `Use no máximo ${MAX_TEXT_LENGTH} caracteres.`),
    );

// Campo opcional de formulário: vazio vira null antes da validação; o resto
// segue aparado para o schema do campo, com a mensagem dele.
const optional = <T extends z.ZodType<unknown, string>>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, schema.nullable());

const integerField = (message: string, min: number, max: () => number) =>
  z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((n) => n >= min && n <= max(), message);

// Entrada manual: os campos chegam como texto do formulário.
export const manualBookSchema = z.object({
  title: requiredText("título"),
  author: requiredText("autor"),
  pages: optional(integerField(`Use um número entre 1 e ${MAX_PAGES}.`, 1, () => MAX_PAGES)),
  publicationYear: optional(
    integerField("Use um ano válido, como 1999.", 1, latestPlausibleYear),
  ),
  isbn: optional(
    z.string().transform((value, context) => {
      const isbn = normalizeIsbn(value);
      if (!isbn) {
        context.addIssue({ code: "custom", message: "Use um ISBN-10 ou ISBN-13 válido." });
        return z.NEVER;
      }
      return isbn;
    }),
  ),
  coverUrl: optional(
    z
      .url({ protocol: /^https$/, error: "Use um endereço de imagem que comece com https://." })
      .max(2000, "Endereço longo demais."),
  ),
});

export type ManualBookInput = z.input<typeof manualBookSchema>;

export function toManualMetadata(data: z.output<typeof manualBookSchema>): BookMetadata {
  return { ...data, source: null };
}

// Resultados que chegam do Route Handler: validados antes de chegar à interface.
export const bookSearchResultSchema = z.object({
  provider: z.enum(["google_books", "open_library"]),
  externalId: z.string().min(1).max(100),
  title: z.string().min(1).max(MAX_TEXT_LENGTH),
  author: z.string().min(1).max(MAX_TEXT_LENGTH),
  coverUrl: z.url({ protocol: /^https$/ }).max(2000).nullable(),
  pages: z.number().int().min(1).max(MAX_PAGES).nullable(),
  publicationYear: z.number().int().min(1).nullable(),
  isbn: z.string().regex(/^97[89]\d{10}$/).nullable(),
});
