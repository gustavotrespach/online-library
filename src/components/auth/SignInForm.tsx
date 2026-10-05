"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getFieldErrors,
  signInSchema,
  type FieldErrors,
  type SignInInput,
} from "@/lib/validation/auth";
import { AuthField } from "./AuthField";
import { FormAlert, SubmitButton } from "./AuthFormControls";
import { getAuthErrorMessage } from "./authErrorMessage";

export function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Bloqueia envios repetidos antes de o estado re-renderizar o botão.
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignInInput>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = signInSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    setFormError(null);

    if (!result.success) {
      const errors = getFieldErrors(result.error);
      setFieldErrors(errors);
      const firstInvalid = Object.keys(errors)[0];
      if (firstInvalid) (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    setPending(true);

    try {
      const { error } = await createClient().auth.signInWithPassword(result.data);

      if (error) {
        setFormError(getAuthErrorMessage(error));
        submittingRef.current = false;
        setPending(false);
        return;
      }

      // O botão continua em carregamento até a navegação terminar.
      router.replace("/");
      router.refresh();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      submittingRef.current = false;
      setPending(false);
    }
  }

  function clearFieldError(name: string) {
    setFieldErrors((errors) => ({ ...errors, [name]: undefined }));
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onInput={(event) => clearFieldError((event.target as HTMLInputElement).name)}
      aria-busy={pending}
      className="flex flex-col gap-6"
    >
      <FormAlert message={formError} />

      <AuthField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={fieldErrors.email}
      />
      <AuthField
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        error={fieldErrors.password}
      />

      <SubmitButton pending={pending} label="Entrar" pendingLabel="Entrando…" />
    </form>
  );
}
