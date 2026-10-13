// Leitura de um livro da estante (decisions.md, 013). O banco aplica as mesmas
// regras no trigger sync_user_book_reading; aqui elas servem para mostrar a
// prévia antes de salvar.

export type ReadingStatus = "not_started" | "reading" | "finished";

// Progresso (0–100, inteiro) a partir das páginas lidas. 0 só sem nenhuma
// página e 100 só com todas: uma página lida já é "lendo", e faltando uma
// página o livro ainda não está concluído.
export function progressFromPages(pagesRead: number, pages: number): number {
  if (pagesRead <= 0) return 0;
  if (pagesRead >= pages) return 100;
  return Math.min(99, Math.max(1, Math.round((pagesRead * 100) / pages)));
}

// Páginas equivalentes a um progresso, para livros que ainda não têm páginas
// lidas registradas.
export function pagesFromProgress(progress: number, pages: number): number {
  return Math.round((pages * progress) / 100);
}

export function getReadingStatus(progress: number): ReadingStatus {
  if (progress <= 0) return "not_started";
  if (progress >= 100) return "finished";
  return "reading";
}

// Livro com número de páginas conhecido: o progresso é informado em páginas.
export function hasPageCount(pages: number | null): pages is number {
  return pages !== null && Number.isInteger(pages) && pages > 0;
}
