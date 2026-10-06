// ISBN: validação e forma canônica. O catálogo guarda sempre o ISBN-13, só
// com dígitos; um ISBN-10 é convertido para o ISBN-13 equivalente (prefixo
// 978), que identifica a mesma edição. Nenhum ISBN é inventado: entradas com
// dígito verificador errado são descartadas.

function compact(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

function isValidIsbn10(value: string) {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  const sum = [...value].reduce(
    (total, char, index) => total + (char === "X" ? 10 : Number(char)) * (10 - index),
    0,
  );
  return sum % 11 === 0;
}

function isbn13CheckDigit(first12: string) {
  const sum = [...first12].reduce(
    (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return String((10 - (sum % 10)) % 10);
}

function isValidIsbn13(value: string) {
  return /^97[89]\d{10}$/.test(value) && isbn13CheckDigit(value.slice(0, 12)) === value[12];
}

// ISBN-10 ou ISBN-13 válido (com ou sem hífens e espaços) → ISBN-13.
export function normalizeIsbn(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = compact(value);

  if (isValidIsbn13(digits)) return digits;
  if (isValidIsbn10(digits)) {
    const first12 = `978${digits.slice(0, 9)}`;
    return first12 + isbn13CheckDigit(first12);
  }
  return null;
}

// Primeiro ISBN válido de uma lista, preferindo os de 13 dígitos.
export function pickIsbn(candidates: (string | null | undefined)[]): string | null {
  const values = candidates.flatMap((value) => (value ? [compact(value)] : []));
  const ordered = [...values.filter((v) => v.length === 13), ...values.filter((v) => v.length !== 13)];

  for (const value of ordered) {
    const isbn = normalizeIsbn(value);
    if (isbn) return isbn;
  }
  return null;
}
