"use client";

import gsap from "gsap";
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { LibraryBook } from "@/types/book";
import { Book } from "./Book";
import {
  findDropTarget,
  getCobwebSlots,
  getOrnaments,
  getPlankY,
  layoutBookshelf,
  type BookPlacement,
  type BookshelfLayout,
  type DropTarget,
} from "./bookshelf-layout";
import {
  animateBookEnter,
  animateBookExit,
  animateBookMove,
  animateHeight,
  animateShelfIn,
  animateShelfOut,
  setCobwebsVisible,
  usePrefersReducedMotion,
} from "./bookshelf-motion";
import { moveToIndex } from "./bookshelf-order";
import { Cobweb } from "./Cobweb";
import { createBookDrag, type BookDrag, type BookDragOptions } from "./createBookDrag";
import { Ornament } from "./Ornament";
import { Shelf } from "./Shelf";

interface ExitingBook {
  book: LibraryBook;
  placement: BookPlacement;
}

// Estado do último layout já animado, usado pelo FLIP.
interface Snapshot {
  width: number;
  placements: Map<string, BookPlacement>;
  shelfCount: number;
  height: number;
}

// Livro segurado e posição em que entraria se fosse solto agora.
interface DragState {
  id: string;
  target: DropTarget | null;
}

interface BookshelfProps {
  // Livros na ordem da coleção.
  books: LibraryBook[];
  // false enquanto os livros não são conhecidos (carregando ou erro): a
  // estante não está vazia, então não mostra teias.
  loaded?: boolean;
  // Nova posição de um livro na ordem (drag-and-drop ou teclado). Sem ela, os
  // livros não podem ser reordenados.
  onMove?: (bookId: string, toIndex: number) => void;
  // Clique (ou Enter) em um livro.
  onOpen?: (bookId: string) => void;
}

// React decide onde cada livro fica (layoutBookshelf); os effects abaixo só
// animam a transição entre o layout anterior e o atual (bookshelf-motion). O
// drag muda a ordem exibida, e o layout segue a mesma regra de sempre.
export function Bookshelf({ books, loaded = true, onMove, onOpen }: BookshelfProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);
  const bookRefs = useRef(new Map<string, HTMLLIElement>());
  const exitRefs = useRef(new Map<string, HTMLLIElement>());
  const shelfRefs = useRef(new Map<number, HTMLDivElement>());
  const cobwebRefs = useRef(new Map<string, HTMLDivElement>());
  const snapshotRef = useRef<Snapshot | null>(null);
  const animatingExits = useRef(new Set<string>());
  const animatingShelfExits = useRef(new Set<number>());
  const cobwebsVisibleRef = useRef<boolean | null>(null);
  const syncedCobwebs = useRef(new WeakSet<HTMLElement>());
  const dragRef = useRef<BookDrag | null>(null);
  const dragOptionsRef = useRef<BookDragOptions | null>(null);
  const instructionsId = useId();

  const reducedMotion = usePrefersReducedMotion();
  const [width, setWidth] = useState<number | null>(null);
  const [exiting, setExiting] = useState<ExitingBook[]>([]);
  const [shelvesShown, setShelvesShown] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Durante o drag, o livro segurado já aparece na posição de destino e os
  // outros abrem espaço para ele. A ordem da coleção só muda ao soltar.
  const displayed = useMemo(() => {
    if (!drag?.target) return books;
    const from = books.findIndex((b) => b.id === drag.id);
    return moveToIndex(books, from, drag.target.index);
  }, [books, drag]);

  const shelfBooks = useMemo(
    () => books.map((b) => ({ id: b.id, pages: b.book.pages })),
    [books],
  );
  const layout = useMemo(
    () =>
      width === null
        ? null
        : layoutBookshelf(displayed.map((b) => ({ id: b.id, pages: b.book.pages })), width),
    [displayed, width],
  );
  const booksById = useMemo(() => new Map(displayed.map((b) => [b.id, b])), [displayed]);
  const cobwebs = useMemo(() => (layout ? getCobwebSlots(layout) : []), [layout]);
  const showCobwebs = books.length === 0 && loaded;

  // Ajusta o estado quando o layout muda (padrão do React para estado
  // derivado de renderizações anteriores, sem effects).
  const [previous, setPrevious] = useState<{
    layout: BookshelfLayout | null;
    books: LibraryBook[];
    width: number | null;
  }>({ layout: null, books: displayed, width: null });

  if (previous.layout !== layout) {
    setPrevious({ layout, books: displayed, width });

    if (layout) {
      const animate = !reducedMotion && previous.layout !== null && previous.width === width;
      const current = new Set(layout.placements.map((p) => p.id));
      const previousBooks = new Map(previous.books.map((b) => [b.id, b]));
      const removed = animate && previous.layout
        ? previous.layout.placements.filter((p) => !current.has(p.id))
        : [];

      setExiting((list) => [
        ...(animate ? list : []).filter((e) => !current.has(e.book.id)),
        ...removed.flatMap((placement) => {
          const book = previousBooks.get(placement.id);
          return book ? [{ book, placement }] : [];
        }),
      ]);

      if (layout.shelfCount > shelvesShown || (!animate && layout.shelfCount < shelvesShown)) {
        setShelvesShown(layout.shelfCount);
      }
    }
  }

  const visibleShelves = Math.max(layout?.shelfCount ?? 0, shelvesShown);
  // Inclui as prateleiras que ainda estão saindo: os ornamentos somem com elas.
  const ornaments = useMemo(
    () => (width === null ? [] : getOrnaments(visibleShelves, width)),
    [visibleShelves, width],
  );
  const dropPlacement = drag?.target
    ? layout?.placements.find((p) => p.id === drag.id)
    : undefined;

  // Largura disponível + contexto GSAP desfeito ao desmontar.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    contextRef.current = gsap.context(() => {}, element);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      contextRef.current?.revert();
      contextRef.current = null;
    };
  }, []);

  // O controlador do drag lê sempre o layout e os livros mais recentes.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !layout || width === null) return;

    dragOptionsRef.current = {
      container,
      reducedMotion,
      getElement: (id) => bookRefs.current.get(id),
      getPlacement: (id) => layout.placements.find((p) => p.id === id),
      findTarget: (id, center) =>
        findDropTarget(shelfBooks, id, center, width, layout.shelfCount),
      onStart: (id) => setDrag({ id, target: null }),
      onTargetChange: (id, target) => setDrag({ id, target }),
      onDrop: (id, target) => {
        setDrag(null);
        const from = books.findIndex((b) => b.id === id);
        if (!onMove || !target || target.index === from) return;
        onMove(id, target.index);
        announceMove(books[from], target.index, books.length);
      },
    };
  });

  useLayoutEffect(() => {
    const controller = createBookDrag(() => {
      const options = dragOptionsRef.current;
      if (!options) throw new Error("Estante sem layout durante o drag.");
      return options;
    });
    dragRef.current = controller;
    return () => {
      controller.destroy();
      dragRef.current = null;
    };
  }, []);

  // Livros, prateleiras e altura: do layout anterior para o atual.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const context = contextRef.current;
    if (!layout || width === null || !container || !context) return;

    const before = snapshotRef.current;
    // Sem animação na primeira renderização, ao mudar a largura e com
    // reduced motion: tudo vai direto à posição final.
    const animate = !reducedMotion && before !== null && before.width === width;

    context.add(() => {
      let entering = 0;

      for (const placement of layout.placements) {
        const element = bookRefs.current.get(placement.id);
        if (!element) continue;

        // O livro segurado segue o ponteiro a partir da nova posição no layout.
        const dragState = dragRef.current?.stateOf(placement.id) ?? null;
        if (dragState === "dragging") {
          dragRef.current?.reposition();
          continue;
        }

        if (!animate) {
          gsap.killTweensOf(element);
          gsap.set(element, { x: 0, y: 0, opacity: 1, rotation: 0 });
          continue;
        }

        const from = before.placements.get(placement.id);
        if (from) {
          // Um livro que está assentando depois do drop já vai para o lugar certo.
          if (dragState === "settling" && from.x === placement.x && from.y === placement.y) continue;
          // Posição visual anterior = posição do layout + transform em curso.
          const dx = from.x + Number(gsap.getProperty(element, "x")) - placement.x;
          const dy = from.y + Number(gsap.getProperty(element, "y")) - placement.y;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) animateBookMove(element, dx, dy);
        } else {
          // Muitos livros de uma vez (ex.: carregamento) não esperam demais.
          animateBookEnter(element, Math.min(entering * 0.08, 0.8));
          entering += 1;
        }
      }

      if (animate && layout.shelfCount > before.shelfCount) {
        for (let index = before.shelfCount; index < layout.shelfCount; index += 1) {
          const shelf = shelfRefs.current.get(index);
          if (!shelf) continue;
          gsap.killTweensOf(shelf);
          animatingShelfExits.current.delete(index);
          animateShelfIn(shelf);
        }
      }

      gsap.killTweensOf(container, "height");
      if (animate && before.height !== layout.height) {
        animateHeight(container, before.height, layout.height);
      } else {
        gsap.set(container, { height: layout.height });
      }
    });

    snapshotRef.current = {
      width,
      placements: new Map(layout.placements.map((p) => [p.id, p])),
      shelfCount: layout.shelfCount,
      height: layout.height,
    };
  }, [layout, width, reducedMotion]);

  // Prateleiras que deixaram de ser necessárias saem antes de serem removidas.
  useLayoutEffect(() => {
    const context = contextRef.current;
    if (!layout || !context || layout.shelfCount >= shelvesShown) return;

    for (let index = layout.shelfCount; index < shelvesShown; index += 1) {
      const shelf = shelfRefs.current.get(index);
      if (!shelf || animatingShelfExits.current.has(index)) continue;

      animatingShelfExits.current.add(index);
      const target = layout.shelfCount;
      context.add(() =>
        animateShelfOut(shelf, () => {
          animatingShelfExits.current.clear();
          setShelvesShown(target);
        }),
      );
    }
  }, [layout, shelvesShown]);

  // Livros removidos: animam a saída e só então deixam o DOM.
  useLayoutEffect(() => {
    const context = contextRef.current;
    if (!context) return;

    for (const { book } of exiting) {
      const element = exitRefs.current.get(book.id);
      if (!element || animatingExits.current.has(book.id)) continue;

      animatingExits.current.add(book.id);
      context.add(() =>
        animateBookExit(element, () => {
          animatingExits.current.delete(book.id);
          setExiting((list) => list.filter((e) => e.book.id !== book.id));
        }),
      );
    }
  }, [exiting]);

  // Teias: visíveis somente com a estante vazia. Teias montadas depois (ex.:
  // outra composição ao mudar de breakpoint) assumem o estado atual sem animar.
  useLayoutEffect(() => {
    const context = contextRef.current;
    if (!context) return;

    const previous = cobwebsVisibleRef.current;
    const synced = syncedCobwebs.current;
    const elements = [...cobwebRefs.current.values()].filter(
      (element) => previous !== showCobwebs || !synced.has(element),
    );
    cobwebsVisibleRef.current = showCobwebs;
    if (elements.length === 0) return;

    const animate = !reducedMotion && previous !== null && previous !== showCobwebs;
    context.add(() => setCobwebsVisible(elements, showCobwebs, animate));
    for (const element of elements) synced.add(element);
  }, [cobwebs, showCobwebs, reducedMotion]);

  function announceMove(book: LibraryBook, index: number, total: number) {
    setAnnouncement(`${book.book.title} movido para a posição ${index + 1} de ${total}.`);
  }

  // Alternativa ao drag: as setas movem o livro uma posição na ordem.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, bookId: string) {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (step === 0 || !onMove) return;
    event.preventDefault();

    const from = books.findIndex((b) => b.id === bookId);
    const to = from + step;
    if (from === -1 || to < 0 || to >= books.length) return;
    onMove(bookId, to);
    announceMove(books[from], to, books.length);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {layout && (
        <>
          {Array.from({ length: visibleShelves }, (_, index) => (
            <Shelf
              key={index}
              ref={mapRef(shelfRefs, index)}
              top={getPlankY(index, layout.metrics)}
              thickness={layout.metrics.plankThickness}
            >
              {ornaments[index]?.map((ornament) => (
                <Ornament
                  key={ornament.id}
                  kind={ornament.kind}
                  x={ornament.x}
                  width={ornament.width}
                  height={ornament.height}
                  flipped={ornament.flipped}
                  reducedMotion={reducedMotion}
                />
              ))}
            </Shelf>
          ))}

          {cobwebs.map((cobweb) => (
            <Cobweb key={cobweb.id} ref={mapRef(cobwebRefs, cobweb.id)} {...cobweb} />
          ))}

          {/* Marca discreta na tábua onde o livro segurado vai assentar. */}
          {dropPlacement && (
            <div
              aria-hidden
              data-drop-indicator
              className="pointer-events-none absolute h-0.5 rounded-full bg-accent/50"
              style={{
                left: dropPlacement.x,
                top: getPlankY(dropPlacement.shelf, layout.metrics) - 1,
                width: dropPlacement.width,
              }}
            />
          )}

          {/* Só os livros recebem eventos; o espaço entre eles deixa o hover
              chegar aos ornamentos. */}
          <ul aria-label="Livros na estante" className="pointer-events-none absolute inset-0">
            {layout.placements.map((placement) => {
              const book = booksById.get(placement.id);
              return book ? (
                <Book
                  key={book.id}
                  ref={mapRef(bookRefs, book.id)}
                  book={book}
                  placement={placement}
                  dragging={drag?.id === book.id}
                  instructionsId={onMove ? instructionsId : undefined}
                  onPointerDown={
                    onMove ? (event) => dragRef.current?.start(event.nativeEvent, book.id) : undefined
                  }
                  onKeyDown={onMove ? (event) => handleKeyDown(event, book.id) : undefined}
                  onClick={onOpen ? () => onOpen(book.id) : undefined}
                />
              ) : null;
            })}
            {exiting.map(({ book, placement }) => (
              <Book
                key={`exit-${book.id}`}
                ref={mapRef(exitRefs, book.id)}
                book={book}
                placement={placement}
                exiting
              />
            ))}
          </ul>
        </>
      )}

      {onMove && (
        <p id={instructionsId} className="sr-only">
          Para reordenar, arraste o livro ou use as setas para a esquerda e para a direita.
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

// Ref de callback que mantém um Map de elementos por chave.
function mapRef<K, T>(refs: RefObject<Map<K, T>>, key: K) {
  return (element: T | null) => {
    if (element) refs.current.set(key, element);
    else refs.current.delete(key);
  };
}
