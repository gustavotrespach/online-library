import type { LibraryBook } from "@/types/book";

// Referência estatística do Reading Progress (plan.md, seção 28). Único lugar
// com o valor: a seção e, depois, o Footer leem daqui.
export const READING_REFERENCE = {
  // Média registrada pelo levantamento, entre o conjunto de entrevistados,
  // considerando livros lidos inteiros ou em parte.
  surveyAverage: 3.96,
  // Valor apresentado no rótulo do gráfico. A trajetória acumulada usa a
  // média (surveyAverage / 12 por mês).
  booksPerYear: 4,
  survey: "Retratos da Leitura no Brasil",
  publisher: "Instituto Pró-Livro",
  edition: 2024,
} as const;

// Um mês da série acumulada (decisions.md, 016).
export interface ReadingMonth {
  year: number;
  // 0 = janeiro, como em Date.
  month: number;
  // Concluídos neste mês.
  finished: number;
  // Concluídos com data até o fim deste mês: nunca diminui.
  total: number;
  // Trajetória da referência até o fim deste mês, contada a partir do
  // começo do primeiro mês da série (média anual / 12 por mês).
  reference: number;
  current: boolean;
  aboveReference: boolean;
}

export interface ReadingSummary {
  // Livros concluídos (progresso 100), com ou sem data.
  totalFinished: number;
  // Concluídos sem finished_at (antes da migration da Fase 09B): contam no
  // total, mas não pertencem a nenhum mês.
  undatedFinished: number;
  currentYear: number;
  currentYearCount: number;
  // Do mês do primeiro livro concluído até o mês atual, sem lacunas (um mês
  // sem livros repete o total anterior). Vazio quando nenhum livro
  // concluído tem data.
  months: ReadingMonth[];
}

// Total acumulado de livros concluídos mês a mês (decisions.md, 016). Só
// conta o que chegou a 100%; o mês é o de finished_at no fuso do navegador,
// o do usuário. A referência anual vira uma trajetória: annualReference / 12
// por mês.
export function summarizeReading(
  books: readonly Pick<LibraryBook, "progress" | "finished_at">[],
  now: Date,
  annualReference: number = READING_REFERENCE.surveyAverage,
): ReadingSummary {
  const currentYear = now.getFullYear();
  // Meses como um número contínuo (ano * 12 + mês), para atravessar anos.
  const currentKey = currentYear * 12 + now.getMonth();
  const counts = new Map<number, number>();
  let totalFinished = 0;
  let undatedFinished = 0;
  let currentYearCount = 0;

  for (const book of books) {
    if (book.progress < 100) continue;
    totalFinished += 1;
    const finishedAt = book.finished_at ? new Date(book.finished_at) : null;
    if (!finishedAt || Number.isNaN(finishedAt.getTime())) {
      undatedFinished += 1;
      continue;
    }
    const key = finishedAt.getFullYear() * 12 + finishedAt.getMonth();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (finishedAt.getFullYear() === currentYear) currentYearCount += 1;
  }

  const months: ReadingMonth[] = [];
  if (counts.size > 0) {
    const first = Math.min(...counts.keys());
    // Um relógio local atrasado não esconde um mês já registrado.
    const last = Math.max(currentKey, ...counts.keys());
    let total = 0;
    for (let key = first; key <= last; key++) {
      const finished = counts.get(key) ?? 0;
      total += finished;
      const reference = referenceAt(key - first + 1, annualReference);
      months.push({
        year: Math.floor(key / 12),
        month: key % 12,
        finished,
        total,
        reference,
        current: key === currentKey,
        aboveReference: total > reference,
      });
    }
  }

  return { totalFinished, undatedFinished, currentYear, currentYearCount, months };
}

// Trajetória da referência depois de `months` meses contados do começo do
// primeiro mês da série: annualReference / 12 por mês. Arredondada para não
// carregar o erro do ponto flutuante (3 × 0,33 = 0,9900000000000001).
export function referenceAt(months: number, annualReference: number = READING_REFERENCE.surveyAverage) {
  return Math.round((months * annualReference * 1e9) / 12) / 1e9;
}

export function booksLabel(count: number) {
  return count === 1 ? "1 livro" : `${count} livros`;
}
