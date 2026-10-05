"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getFieldErrors,
  MIN_PASSWORD_LENGTH,
  signUpSchema,
  type FieldErrors,
  type SignUpInput,
} from "@/lib/validation/auth";
import { AuthField } from "./AuthField";
import { FormAlert, SubmitButton } from "./AuthFormControls";
import { getAuthErrorMessage } from "./authErrorMessage";

export function SignUpForm() {
  const [pending, setPending] = useState(false);
  // Bloqueia envios repetidos antes de o estado re-renderizar o botão.
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignUpInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (confirmationEmail) confirmationHeadingRef.current?.focus();
  }, [confirmationEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = signUpSchema.safeParse({
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
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

    const { displayName, email, password } = result.data;

    try {
      // O nome segue na metadata apenas para o trigger criar o profile
      // (decisions.md, 008). Com a confirmação de e-mail ativa, não há sessão.
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });

      if (error) {
        setFormError(getAuthErrorMessage(error));
        return;
      }

      setConfirmationEmail(email);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  function clearFieldError(name: string) {
    setFieldErrors((errors) => ({ ...errors, [name]: undefined }));
  }

  if (confirmationEmail) {
    return (
      <div className="flex flex-col gap-6">
        <h2
          ref={confirmationHeadingRef}
          tabIndex={-1}
          className="text-3xl md:text-4xl"
        >
          Confirme seu e-mail
        </h2>
        <p className="text-base text-foreground-muted">
          Enviamos um link de confirmação para{" "}
          <strong className="font-medium wrap-anywhere text-foreground">
            {confirmationEmail}
          </strong>
          . Abra-o para ativar sua conta — pode ser em outro dispositivo.
        </p>
        <p className="text-sm text-foreground-muted">
          Não encontrou a mensagem? Verifique a caixa de spam.
        </p>
      </div>
    );
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
        label="Nome"
        name="displayName"
        autoComplete="name"
        error={fieldErrors.displayName}
      />
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
        autoComplete="new-password"
        hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`}
        error={fieldErrors.password}
      />
      <AuthField
        label="Confirmar senha"
        name="passwordConfirmation"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.passwordConfirmation}
      />

      <SubmitButton pending={pending} label="Criar conta" pendingLabel="Criando conta…" />
    </form>
  );
}
