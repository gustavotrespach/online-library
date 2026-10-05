import { z } from "zod";

// Mesmo mínimo configurado no Supabase Auth (decisions.md, 008).
export const MIN_PASSWORD_LENGTH = 6;
// Mesmo limite aplicado pelo trigger que cria o profile.
export const MAX_DISPLAY_NAME_LENGTH = 80;

const email = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .pipe(z.email("Informe um e-mail válido."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Informe seu nome.")
      .max(
        MAX_DISPLAY_NAME_LENGTH,
        `Use no máximo ${MAX_DISPLAY_NAME_LENGTH} caracteres.`,
      ),
    email,
    password: z
      .string()
      .min(1, "Crie uma senha.")
      .min(
        MIN_PASSWORD_LENGTH,
        `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      ),
    passwordConfirmation: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    error: "As senhas não coincidem.",
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Primeira mensagem de cada campo, na ordem do schema.
export function getFieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const result: Record<string, string> = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[field] = messages[0];
  }

  return result as FieldErrors<T>;
}
