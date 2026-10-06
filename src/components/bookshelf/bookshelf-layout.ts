// Layout da estante: calcula onde cada livro fica. Funções puras e
// determinísticas, sem React nem GSAP (a animação é responsabilidade de
// bookshelf-motion.ts).

export interface ShelfBook {
  id: string;
  // Opcional nos dados reais: sem páginas, o livro recebe a largura padrão.
  pages: number | null;
}

export interface ShelfMetrics {
  bookMinWidth: number;
  bookMaxWidth: number;
  // Altura da capa em relação à largura.
  coverRatio: number;
  gap: number;
  // Margem entre a ponta da prateleira e o primeiro/último livro.
  insetX: number;
  // Espaço livre acima do livro mais alto possível.
  clearance: number;
  plankThickness: number;
  // Distância vertical entre o topo de uma prateleira e o da seguinte.
  shelfPitch: number;
  minShelves: number;
}

export type OrnamentKind =
  | "plant"
  | "sculpture"
  | "vase"
  | "jar"
  | "bud-vases"
  | "candlestick"
  | "hourglass"
  | "globe"
  | "frame";

// Os ornamentos ficam em posições fixas por prateleira; a área deles é
// reservada para que os livros nunca os empurrem nem os cubram.
export interface OrnamentPlacement {
  id: string;
  kind: OrnamentKind;
  x: number;
  width: number;
  height: number;
  // Espelhado na horizontal, para variar objetos assimétricos.
  flipped: boolean;
}

export interface BookPlacement {
  id: string;
  shelf: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Trecho livre de uma prateleira, entre margens e áreas de ornamentos. Um
// livro só ocupa um intervalo se couber inteiro nele.
export interface ShelfInterval {
  start: number;
  end: number;
  width: number;
}

export interface BookshelfLayout {
  width: number;
  metrics: ShelfMetrics;
  placements: BookPlacement[];
  // Intervalos livres de cada prateleira em uso (índice = prateleira).
  intervals: ShelfInterval[][];
  // Ornamentos de cada prateleira em uso (índice = prateleira).
  ornaments: OrnamentPlacement[][];
  shelfCount: number;
  height: number;
}

type Breakpoint = "mobile" | "tablet" | "desktop";

// Faixas pela largura da própria estante (não do viewport).
function getBreakpoint(containerWidth: number): Breakpoint {
  if (containerWidth < 640) return "mobile";
  if (containerWidth < 920) return "tablet";
  return "desktop";
}

const BASE_METRICS: Record<Breakpoint, Omit<ShelfMetrics, "shelfPitch">> = {
  mobile: {
    bookMinWidth: 54,
    bookMaxWidth: 80,
    coverRatio: 1.5,
    gap: 8,
    insetX: 12,
    clearance: 28,
    plankThickness: 10,
    minShelves: 3,
  },
  tablet: {
    bookMinWidth: 66,
    bookMaxWidth: 100,
    coverRatio: 1.5,
    gap: 10,
    insetX: 20,
    clearance: 32,
    plankThickness: 11,
    minShelves: 3,
  },
  desktop: {
    bookMinWidth: 76,
    bookMaxWidth: 116,
    coverRatio: 1.5,
    gap: 12,
    insetX: 24,
    clearance: 40,
    plankThickness: 12,
    minShelves: 3,
  },
};

// Tamanho de referência no desktop: na escala dos livros (114–174px de
// altura), nunca maior que uma coleção. Objetos `small` podem acompanhar
// outro ornamento na mesma prateleira.
const ORNAMENTS: Record<OrnamentKind, { width: number; height: number; small?: boolean }> = {
  plant: { width: 84, height: 124 },
  sculpture: { width: 68, height: 104 },
  vase: { width: 60, height: 90 },
  jar: { width: 58, height: 78, small: true },
  "bud-vases": { width: 58, height: 70, small: true },
  candlestick: { width: 28, height: 108, small: true },
  hourglass: { width: 38, height: 66, small: true },
  globe: { width: 64, height: 94 },
  frame: { width: 70, height: 88 },
};

const ORNAMENT_KINDS = Object.keys(ORNAMENTS) as OrnamentKind[];

// Composição por faixa: escala dos objetos, fração de prateleiras decoradas,
// chance de um par e de um ornamento mais ao centro. No mobile há menos
// ornamentos, sem pares nem centro, para sobrar espaço aos livros.
const DECOR: Record<Breakpoint, { scale: number; frequency: number; pairs: number; center: number }> = {
  mobile: { scale: 0.64, frequency: 0.5, pairs: 0, center: 0 },
  tablet: { scale: 0.85, frequency: 0.62, pairs: 0.2, center: 0.22 },
  desktop: { scale: 1, frequency: 0.66, pairs: 0.25, center: 0.28 },
};

export function getShelfMetrics(containerWidth: number): ShelfMetrics {
  const base = BASE_METRICS[getBreakpoint(containerWidth)];
  const tallestBook = base.bookMaxWidth * base.coverRatio;

  return {
    ...base,
    shelfPitch: Math.round(tallestBook + base.clearance + base.plankThickness),
  };
}

const MIN_PAGES = 80;
const MAX_PAGES = 1000;
// Livro sem número de páginas (ou com valor inválido): largura intermediária.
const DEFAULT_PAGES = 250;

// Largura pela quantidade de páginas, em escala logarítmica e limitada:
// a diferença entre 100 e 300 páginas é visível, mas um livro de 1200
// páginas não fica desproporcionalmente largo.
export function getBookWidth(pages: number | null, metrics: ShelfMetrics): number {
  const known = pages !== null && Number.isFinite(pages) && pages > 0 ? pages : DEFAULT_PAGES;
  const clamped = Math.min(Math.max(known, MIN_PAGES), MAX_PAGES);
  const t = Math.log(clamped / MIN_PAGES) / Math.log(MAX_PAGES / MIN_PAGES);

  return Math.round(
    metrics.bookMinWidth + (metrics.bookMaxWidth - metrics.bookMinWidth) * t,
  );
}

export function getPlankY(shelf: number, metrics: ShelfMetrics): number {
  return shelf * metrics.shelfPitch + metrics.shelfPitch - metrics.plankThickness;
}

// Intervalos ocupáveis de uma prateleira: a largura útil (sem as margens)
// menos a área de cada ornamento, com dois gaps de folga de cada lado.
export function getShelfIntervals(
  ornaments: OrnamentPlacement[],
  containerWidth: number,
  metrics: ShelfMetrics,
): ShelfInterval[] {
  const reserved = ornaments
    .map((o) => ({ start: o.x - metrics.gap * 2, end: o.x + o.width + metrics.gap * 2 }))
    .sort((a, b) => a.start - b.start);
  const end = containerWidth - metrics.insetX;
  const intervals: ShelfInterval[] = [];
  let start = metrics.insetX;

  for (const range of reserved) {
    const limit = Math.min(range.start, end);
    if (limit > start) intervals.push({ start, end: limit, width: limit - start });
    start = Math.max(start, range.end);
  }
  if (end > start) intervals.push({ start, end, width: end - start });

  return intervals;
}

// Um livro cabe em x se ocupar o intervalo inteiro, sem tocar margens nem
// áreas de ornamentos. O gap mínimo entre livros fica no cursor do encaixe.
export function fitsInInterval(interval: ShelfInterval, x: number, width: number): boolean {
  return x >= interval.start && x + width <= interval.end;
}

// Ponto do encaixe: prateleira, intervalo e primeiro x livre nele.
interface PackCursor {
  shelf: number;
  interval: number;
  x: number;
}

const FIRST_CURSOR: PackCursor = { shelf: 0, interval: 0, x: -Infinity };

// Regra única de encaixe, usada pelo layout e pelo drag-and-drop: o livro vai
// para o primeiro trecho, a partir do cursor, em que cabe inteiro. Se não
// couber no espaço restante, tenta o próximo intervalo da mesma prateleira e
// depois a prateleira seguinte. Nunca é comprimido, nunca invade um ornamento
// e a ordem da coleção não muda; a sobra de um intervalo fica no fim dele,
// junto ao ornamento ou à ponta da prateleira, e nunca entre dois livros.
function packBook(
  cursor: PackCursor,
  width: number,
  intervalsOf: (shelf: number) => ShelfInterval[],
  metrics: ShelfMetrics,
): { shelf: number; x: number; next: PackCursor } {
  let { shelf, interval, x } = cursor;

  for (;;) {
    const intervals = intervalsOf(shelf);
    const emptyShelf = interval === 0 && x === -Infinity;

    for (; interval < intervals.length; interval += 1) {
      const start = Math.max(x, intervals[interval].start);
      if (fitsInInterval(intervals[interval], start, width)) {
        return { shelf, x: start, next: { shelf, interval, x: start + width + metrics.gap } };
      }
    }

    // Só acontece se a estante for mais estreita que o próprio livro: ele fica
    // no início da prateleira vazia em vez de procurar indefinidamente.
    if (emptyShelf) {
      const start = intervals[0]?.start ?? metrics.insetX;
      return { shelf, x: start, next: { shelf: shelf + 1, interval: 0, x: -Infinity } };
    }

    shelf += 1;
    interval = 0;
    x = -Infinity;
  }
}

// Ornamentos e intervalos comuns ao layout e à busca de posição do drag.
function createShelfContext(bookCount: number, containerWidth: number) {
  const metrics = getShelfMetrics(containerWidth);
  // Cada livro ocupa no máximo uma prateleira nova.
  const ornaments = getOrnaments(bookCount + metrics.minShelves, containerWidth);
  const intervals = ornaments.map((list) => getShelfIntervals(list, containerWidth, metrics));

  return {
    metrics,
    ornaments,
    intervals,
    intervalsOf: (shelf: number) => intervals[shelf] ?? [],
  };
}

// Distribui os livros na ordem da coleção, da esquerda para a direita e de
// cima para baixo, encaixando cada um nos intervalos livres (packBook).
export function layoutBookshelf(
  books: ShelfBook[],
  containerWidth: number,
): BookshelfLayout {
  const { metrics, ornaments, intervals, intervalsOf } = createShelfContext(
    books.length,
    containerWidth,
  );

  const placements: BookPlacement[] = [];
  let cursor = FIRST_CURSOR;

  for (const book of books) {
    const width = getBookWidth(book.pages, metrics);
    const height = Math.round(width * metrics.coverRatio);
    const fit = packBook(cursor, width, intervalsOf, metrics);

    placements.push({
      id: book.id,
      shelf: fit.shelf,
      x: fit.x,
      y: getPlankY(fit.shelf, metrics) - height,
      width,
      height,
    });
    cursor = fit.next;
  }

  const usedShelves = placements.length > 0 ? placements[placements.length - 1].shelf + 1 : 0;
  const shelfCount = Math.max(metrics.minShelves, usedShelves);

  return {
    width: containerWidth,
    metrics,
    placements,
    intervals: intervals.slice(0, shelfCount),
    ornaments: ornaments.slice(0, shelfCount),
    shelfCount,
    height: shelfCount * metrics.shelfPitch,
  };
}

export interface DropTarget {
  // Posição do livro na nova ordem.
  index: number;
  shelf: number;
  x: number;
}

// Posição válida mais próxima para um livro arrastado, cujo centro está em
// `center` (coordenadas da estante). Simula a inserção em cada posição da
// ordem com a mesma regra do layout e só aceita as que deixam o livro inteiro
// na prateleira apontada; sobre um ornamento ou num espaço curto demais,
// vence o encaixe válido mais próximo. Abaixo da última prateleira ocupada,
// a posição válida é o fim da coleção. Fora da estante: null.
export function findDropTarget(
  books: ShelfBook[],
  draggedId: string,
  center: { x: number; y: number },
  containerWidth: number,
  shelfCount: number,
): DropTarget | null {
  const dragged = books.find((b) => b.id === draggedId);
  if (!dragged) return null;

  const { metrics, intervalsOf } = createShelfContext(books.length, containerWidth);
  const width = getBookWidth(dragged.pages, metrics);
  const pitch = metrics.shelfPitch;

  const outside =
    center.x < -width ||
    center.x > containerWidth + width ||
    center.y < -pitch / 2 ||
    center.y > (shelfCount + 0.5) * pitch;
  if (outside) return null;

  const targetShelf = Math.min(Math.max(Math.floor(center.y / pitch), 0), shelfCount - 1);
  const others = books.filter((b) => b.id !== draggedId);
  let cursor = FIRST_CURSOR;
  let best: DropTarget | null = null;
  let bestDistance = Infinity;
  let end: DropTarget | null = null;

  for (let index = 0; index <= others.length; index += 1) {
    // Onde o livro ficaria se fosse inserido antes de others[index].
    const fit = packBook(cursor, width, intervalsOf, metrics);
    if (fit.shelf > targetShelf) break;

    if (fit.shelf === targetShelf) {
      const distance = Math.abs(fit.x + width / 2 - center.x);
      if (distance < bestDistance) {
        best = { index, shelf: fit.shelf, x: fit.x };
        bestDistance = distance;
      }
    }

    if (index === others.length) {
      end = { index, shelf: fit.shelf, x: fit.x };
    } else {
      cursor = packBook(cursor, getBookWidth(others[index].pages, metrics), intervalsOf, metrics).next;
    }
  }

  return best ?? end;
}

// Pseudoaleatório determinístico em [0, 1) para (índice, uso): a mesma
// estante tem sempre a mesma composição, sem Math.random().
const SEED = 78;

function noise(index: number, salt: number): number {
  let h = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + SEED, 0x85ebca6b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function shuffleKinds(cycle: number): OrnamentKind[] {
  const kinds = [...ORNAMENT_KINDS];
  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(noise(cycle, 100 + i) * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds;
}

// Os tipos se sucedem em ciclos embaralhados: todos aparecem antes de algum
// se repetir, e um ciclo nunca começa pelo tipo que encerrou o anterior.
function getKind(sequence: number): OrnamentKind {
  const count = ORNAMENT_KINDS.length;
  const cycle = Math.floor(sequence / count);
  const kinds = shuffleKinds(cycle);
  if (cycle > 0 && kinds[0] === shuffleKinds(cycle - 1)[count - 1]) {
    [kinds[0], kinds[1]] = [kinds[1], kinds[0]];
  }
  return kinds[sequence % count];
}

// Ornamentos das prateleiras 0 a shelfCount - 1. Algumas prateleiras ficam
// vazias, a maioria das decoradas tem um objeto e algumas têm um par (um
// objeto pequeno ao lado de outro), à esquerda, à direita ou, havendo
// espaço para livros dos dois lados, mais ao centro.
export function getOrnaments(shelfCount: number, containerWidth: number): OrnamentPlacement[][] {
  const metrics = getShelfMetrics(containerWidth);
  const decor = DECOR[getBreakpoint(containerWidth)];
  const shelves: OrnamentPlacement[][] = [];
  let sequence = 0;

  for (let shelf = 0; shelf < shelfCount; shelf += 1) {
    if (noise(shelf, 1) >= decor.frequency) {
      shelves.push([]);
      continue;
    }

    const kinds = [getKind(sequence)];
    sequence += 1;
    const companion = getKind(sequence);
    if (noise(shelf, 2) < decor.pairs && ORNAMENTS[companion].small) {
      kinds.push(companion);
      sequence += 1;
    }

    // O primeiro objeto fica do lado de fora (junto à ponta da prateleira).
    const items = kinds.map((kind, index) => {
      // Variação discreta de tamanho entre ocorrências do mesmo tipo.
      const scale = decor.scale * (0.92 + noise(shelf, 10 + index) * 0.14);
      return {
        id: `${shelf}-${kind}`,
        kind,
        width: Math.round(ORNAMENTS[kind].width * scale),
        height: Math.round(ORNAMENTS[kind].height * scale),
        flipped: noise(shelf, 20 + index) < 0.5,
      };
    });
    // Os desenhos já têm respiro lateral: um par fica mais próximo que os livros.
    const pairGap = Math.round(metrics.gap / 2);
    const groupWidth =
      items.reduce((sum, item) => sum + item.width, 0) + pairGap * (items.length - 1);

    const center = items.length === 1 && noise(shelf, 4) < decor.center
      ? getCenterStart(shelf, groupWidth, containerWidth, metrics)
      : null;
    const left = noise(shelf, 3) < 0.5;
    const ordered = center === null && !left ? [...items].reverse() : items;
    let x = center ?? (left ? metrics.insetX : containerWidth - metrics.insetX - groupWidth);

    shelves.push(
      ordered.map((item) => {
        const placement = { ...item, x };
        x += item.width + pairGap;
        return placement;
      }),
    );
  }

  return shelves;
}

// Posição mais central, somente se couberem dois livros largos de cada lado.
function getCenterStart(
  shelf: number,
  groupWidth: number,
  containerWidth: number,
  metrics: ShelfMetrics,
): number | null {
  const start = Math.round(containerWidth * (0.38 + noise(shelf, 5) * 0.24) - groupWidth / 2);
  const room = metrics.bookMaxWidth * 2 + metrics.gap;
  const leftRoom = start - metrics.gap * 2 - metrics.insetX;
  const rightRoom = containerWidth - metrics.insetX - (start + groupWidth + metrics.gap * 2);
  return leftRoom >= room && rightRoom >= room ? start : null;
}

export interface CobwebSlot {
  id: string;
  x: number;
  y: number;
  size: number;
  // Ponta da prateleira em que a teia está presa, sob a tábua.
  side: "left" | "right";
}

// Teias da estante vazia, presas sob as tábuas, perto das pontas. Cada
// prateleira tem nenhuma, uma pequena, uma maior ou uma maior e outra
// pequena na ponta oposta (nunca duas grandes). Uma teia que encostaria
// num ornamento da prateleira de baixo é descartada.
export function getCobwebSlots(layout: BookshelfLayout): CobwebSlot[] {
  const { metrics, ornaments, width } = layout;
  const base = metrics.bookMinWidth * 0.85;
  const small = Math.round(base * 0.7);
  const large = Math.round(base * 1.05);
  const edge = Math.round(metrics.insetX / 2);
  const slots: CobwebSlot[] = [];

  for (let shelf = 0; shelf < layout.shelfCount; shelf += 1) {
    const amount = noise(shelf, 30);
    if (amount < 0.25) continue;

    const side = noise(shelf, 31) < 0.5 ? "left" : "right";
    const opposite = side === "left" ? "right" : "left";
    const webs: { side: CobwebSlot["side"]; size: number }[] = [
      { side, size: amount < 0.65 ? small : large },
    ];
    if (noise(shelf, 32) < 0.3) webs.push({ side: opposite, size: small });

    const y = getPlankY(shelf, metrics) + metrics.plankThickness - 1;
    const nextPlank = getPlankY(shelf + 1, metrics);
    const below = ornaments[shelf + 1] ?? [];

    for (const web of webs) {
      const x = web.side === "left" ? edge : width - edge - web.size;
      const touches = below.some(
        (o) =>
          x < o.x + o.width + metrics.gap &&
          o.x - metrics.gap < x + web.size &&
          y + web.size + metrics.gap > nextPlank - o.height,
      );
      if (!touches) slots.push({ id: `${shelf}-${web.side}`, x, y, size: web.size, side: web.side });
    }
  }

  return slots;
}
