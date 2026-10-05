import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

export const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível concluir agora. Tente novamente em instantes.";

// Mensagens por código de erro do Supabase Auth (error.code), que é estável;
// o texto das mensagens do servidor não é usado.
const messagesByCode: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para concluir o cadastro.",
  user_already_exists: "Este e-mail já está cadastrado. Entre com sua senha.",
  email_exists: "Este e-mail já está cadastrado. Entre com sua senha.",
  weak_password: "Escolha uma senha mais forte.",
  email_address_invalid: "Informe um e-mail válido.",
  over_email_send_rate_limit:
    "Aguarde alguns minutos antes de pedir um novo e-mail.",
  over_request_rate_limit:
    "Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.",
  signup_disabled: "Novos cadastros estão indisponíveis no momento.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  if (isAuthError(error) && error.code) {
    return messagesByCode[error.code] ?? UNEXPECTED_ERROR_MESSAGE;
  }

  return UNEXPECTED_ERROR_MESSAGE;
}
