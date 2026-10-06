import type { LibraryBook } from "@/types/book";

// Dados fictícios exclusivos da rota /preview/bookshelf, no mesmo formato dos
// livros reais (LibraryBook). Sem cover_url: as capas usam o fallback.

type MockBookData = Pick<LibraryBook["book"], "title" | "author" | "pages"> & {
  progress: number;
};

const INITIAL: MockBookData[] = [
  { title: "A Hora da Estrela", author: "Clarice Lispector", pages: 88, progress: 100 },
  { title: "Dom Casmurro", author: "Machado de Assis", pages: 256, progress: 64 },
  { title: "Grande Sertão: Veredas", author: "Guimarães Rosa", pages: 624, progress: 0 },
  { title: "Cem Anos de Solidão", author: "Gabriel García Márquez", pages: 448, progress: 22 },
  { title: "Guerra e Paz", author: "Liev Tolstói", pages: 1225, progress: 8 },
  { title: "Vidas Secas", author: "Graciliano Ramos", pages: 176, progress: 100 },
];

const EXTRA: MockBookData[] = [
  { title: "O Alienista", author: "Machado de Assis", pages: 96, progress: 0 },
  { title: "Crime e Castigo", author: "Fiódor Dostoiévski", pages: 592, progress: 47 },
  { title: "Orgulho e Preconceito", author: "Jane Austen", pages: 424, progress: 100 },
  { title: "Moby Dick", author: "Herman Melville", pages: 720, progress: 12 },
  // Sem número de páginas: largura padrão.
  { title: "O Cortiço", author: "Aluísio Azevedo", pages: null, progress: 0 },
  { title: "A Metamorfose", author: "Franz Kafka", pages: 96, progress: 80 },
  { title: "Os Sertões", author: "Euclides da Cunha", pages: 656, progress: 0 },
  { title: "Memórias Póstumas de Brás Cubas", author: "Machado de Assis", pages: 208, progress: 35 },
];

function toLibraryBook(data: MockBookData, id: string, bookId: string): LibraryBook {
  return {
    id,
    user_id: "preview",
    book_id: bookId,
    progress: data.progress,
    book: {
      title: data.title,
      author: data.author,
      pages: data.pages,
      cover_url: null,
      publication_year: null,
      isbn: null,
    },
  };
}

export const INITIAL_BOOKS: LibraryBook[] = INITIAL.map((data, index) =>
  toLibraryBook(data, `book-${index + 1}`, `initial-${index}`),
);

// Livros adicionados pelo controle do protótipo: percorre a lista extra com
// ids sempre novos (o mesmo título mantém a mesma capa).
export function createMockBook(sequence: number): LibraryBook {
  const index = sequence % EXTRA.length;
  return toLibraryBook(EXTRA[index], `added-${sequence + 1}`, `extra-${index}`);
}
