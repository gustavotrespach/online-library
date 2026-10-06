// Regras comuns de normalização dos dados das fontes externas.

export const MAX_PAGES = 20000;
export const MAX_TEXT_LENGTH = 300;

export function latestPlausibleYear() {
  return new Date().getFullYear() + 1;
}

// Espaços repetidos e nas extremidades removidos; vazio vira null.
export function cleanText(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, MAX_TEXT_LENGTH) : null;
}

// Autores únicos, na ordem recebida.
export function joinAuthors(names: (string | null | undefined)[] | undefined): string | null {
  const unique = [...new Set((names ?? []).flatMap((name) => cleanText(name) ?? []))];
  return cleanText(unique.join(", "));
}

export function toPages(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isInteger(value) && value > 0 && value <= MAX_PAGES
    ? value
    : null;
}

export function toYear(value: number | string | null | undefined): number | null {
  const year = typeof value === "string" ? Number(value.match(/\b(\d{4})\b/)?.[1]) : value;
  return year !== null && year !== undefined && Number.isInteger(year) && year >= 1 && year <= latestPlausibleYear()
    ? year
    : null;
}

// Capas sempre por HTTPS (o website não carrega conteúdo misto).
export function toHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.replace(/^http:\/\//i, "https://"));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export class BookSourceError extends Error {
  constructor(
    readonly reason: "unavailable" | "rate_limited" | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "BookSourceError";
  }
}

// GET com tempo limite. Erros de rede, HTTP e JSON viram BookSourceError.
export async function fetchJson(url: URL, init: { headers?: Record<string, string> } = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(6000),
      // Cache simples do Next.js: a mesma busca não volta à API por um dia.
      next: { revalidate: 86400 },
    });
  } catch {
    throw new BookSourceError("unavailable", `Falha de rede: ${url.hostname}`);
  }

  if (response.status === 429) throw new BookSourceError("rate_limited", `Limite de uso: ${url.hostname}`);
  if (!response.ok) throw new BookSourceError("unavailable", `HTTP ${response.status}: ${url.hostname}`);

  try {
    return await response.json();
  } catch {
    throw new BookSourceError("invalid_response", `Resposta inválida: ${url.hostname}`);
  }
}
