// Ordem da coleção: uma lista explícita, separada da posição física. O
// layout recebe os livros nessa ordem e calcula onde cada um fica; o
// drag-and-drop e o teclado só mudam a ordem.
export function moveToIndex<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= items.length || from === to) return next;

  const [item] = next.splice(from, 1);
  next.splice(Math.min(Math.max(to, 0), next.length), 0, item);
  return next;
}
