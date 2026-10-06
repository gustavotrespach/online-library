import gsap from "gsap";
import type { BookPlacement, DropTarget } from "./bookshelf-layout";
import { liftBook, settleBook } from "./bookshelf-motion";

// Drag-and-drop dos livros com Pointer Events. O controlador só move o livro
// segurado (GSAP, fora do React) e avisa a estante quando a posição de
// destino muda; a estante decide a nova ordem e o layout.

// Mouse e caneta: o drag começa depois de um pequeno movimento, para não
// confundir com um clique.
const DRAG_THRESHOLD = 4;
// Toque: o livro é pego com uma pressão longa. Mover o dedo antes disso é
// rolagem da página, que continua livre.
const LONG_PRESS_MS = 320;
const TOUCH_SLOP = 10;
// Rolagem automática perto das bordas da janela, para alcançar prateleiras
// fora da tela.
const SCROLL_EDGE = 72;
const SCROLL_MAX_SPEED = 14;

export interface BookDragOptions {
  container: HTMLElement;
  reducedMotion: boolean;
  getElement: (id: string) => HTMLElement | undefined;
  // Posição do livro no layout exibido, que muda junto com o destino.
  getPlacement: (id: string) => BookPlacement | undefined;
  findTarget: (id: string, center: { x: number; y: number }) => DropTarget | null;
  onStart: (id: string) => void;
  onTargetChange: (id: string, target: DropTarget | null) => void;
  // target null: solto fora de uma posição válida ou cancelado.
  onDrop: (id: string, target: DropTarget | null) => void;
}

interface Session {
  id: string;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  active: boolean;
  // Ponto do livro em que ele foi pego.
  grabX: number;
  grabY: number;
  target: DropTarget | null;
  timer: number;
  frame: number;
}

export interface BookDrag {
  start: (event: PointerEvent, id: string) => void;
  // Reposiciona o livro segurado depois que o layout mudou.
  reposition: () => void;
  // "dragging" enquanto segurado; "settling" enquanto assenta depois do drop.
  stateOf: (id: string) => "dragging" | "settling" | null;
  destroy: () => void;
}

export function createBookDrag(getOptions: () => BookDragOptions): BookDrag {
  let session: Session | null = null;
  const settling = new Set<string>();

  const bodyOf = (element: HTMLElement) =>
    element.querySelector<HTMLElement>("[data-book-body]") ?? element;

  function start(event: PointerEvent, id: string) {
    if (session || !event.isPrimary || event.button !== 0) return;

    session = {
      id,
      pointerId: event.pointerId,
      touch: event.pointerType === "touch",
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      active: false,
      grabX: 0,
      grabY: 0,
      target: null,
      timer: 0,
      frame: 0,
    };
    if (session.touch) session.timer = window.setTimeout(activate, LONG_PRESS_MS);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("blur", handleCancel);
    window.addEventListener("contextmenu", blockWhileHeld);
    // Não passivo: com o livro segurado, o toque não rola a página.
    document.addEventListener("touchmove", blockWhileHeld, { passive: false });
  }

  function activate() {
    if (!session || session.active) return;
    const options = getOptions();
    const element = options.getElement(session.id);
    if (!element || !options.getPlacement(session.id)) return finish(false);

    gsap.killTweensOf(element);
    gsap.set(element, { rotation: 0, opacity: 1 });
    settling.delete(session.id);

    const rect = element.getBoundingClientRect();
    session.grabX = session.clientX - rect.left;
    session.grabY = session.clientY - rect.top;
    session.active = true;

    options.onStart(session.id);
    liftBook(bodyOf(element), options.reducedMotion);
    update();
  }

  function handleMove(event: PointerEvent) {
    if (!session || event.pointerId !== session.pointerId) return;
    session.clientX = event.clientX;
    session.clientY = event.clientY;

    if (!session.active) {
      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (session.touch && distance > TOUCH_SLOP) finish(false);
      else if (!session.touch && distance > DRAG_THRESHOLD) activate();
      return;
    }

    schedule();
  }

  function handleUp(event: PointerEvent) {
    if (session && event.pointerId === session.pointerId) finish(true);
  }

  function handleCancel() {
    finish(false);
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === "Escape" && session?.active) {
      event.preventDefault();
      finish(false);
    }
  }

  function blockWhileHeld(event: Event) {
    if (session?.active || (event.type === "contextmenu" && session?.touch)) {
      event.preventDefault();
    }
  }

  // Um cálculo por quadro, por mais eventos de ponteiro que cheguem.
  function schedule() {
    if (session && !session.frame) session.frame = requestAnimationFrame(update);
  }

  function update() {
    if (!session?.active) return;
    session.frame = 0;
    const center = position();
    if (!center) return;

    const options = getOptions();
    const target = options.findTarget(session.id, center);
    if (!sameTarget(target, session.target)) {
      session.target = target;
      options.onTargetChange(session.id, target);
    }

    const speed = edgeSpeed(session.clientY);
    if (speed !== 0) {
      window.scrollBy(0, speed);
      schedule();
    }
  }

  // Mantém o livro sob o ponteiro, a partir da posição atual no layout.
  function position() {
    if (!session?.active) return null;
    const options = getOptions();
    const element = options.getElement(session.id);
    const placement = options.getPlacement(session.id);
    if (!element || !placement) return null;

    const rect = options.container.getBoundingClientRect();
    const left = session.clientX - rect.left - session.grabX;
    const top = session.clientY - rect.top - session.grabY;
    gsap.set(element, { x: left - placement.x, y: top - placement.y });

    return { x: left + placement.width / 2, y: top + placement.height / 2 };
  }

  function finish(drop: boolean) {
    if (!session) return;
    const { id, active, target, timer, frame } = session;
    session = null;

    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleCancel);
    window.removeEventListener("keydown", handleKey);
    window.removeEventListener("blur", handleCancel);
    window.removeEventListener("contextmenu", blockWhileHeld);
    document.removeEventListener("touchmove", blockWhileHeld);

    if (!active) return;
    suppressNextClick();
    const options = getOptions();
    const element = options.getElement(id);
    settling.add(id);
    options.onDrop(id, drop ? target : null);

    if (!element) return settling.delete(id);
    settleBook(element, bodyOf(element), options.reducedMotion, () => settling.delete(id));
  }

  return {
    start,
    reposition: () => {
      position();
    },
    stateOf: (id) => {
      if (session?.active && session.id === id) return "dragging";
      return settling.has(id) ? "settling" : null;
    },
    destroy: () => finish(false),
  };
}

// O pointerup de um drag gera um click no livro solto; ele não deve abrir
// o livro.
function suppressNextClick() {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    window.removeEventListener("click", swallow, true);
  };
  window.addEventListener("click", swallow, true);
  window.setTimeout(() => window.removeEventListener("click", swallow, true), 400);
}

function sameTarget(a: DropTarget | null, b: DropTarget | null) {
  return a === b || (a !== null && b !== null && a.index === b.index && a.shelf === b.shelf && a.x === b.x);
}

function edgeSpeed(clientY: number) {
  const fromTop = Math.max(clientY, 0);
  const fromBottom = Math.max(window.innerHeight - clientY, 0);
  if (fromTop < SCROLL_EDGE) return -SCROLL_MAX_SPEED * (1 - fromTop / SCROLL_EDGE);
  if (fromBottom < SCROLL_EDGE) return SCROLL_MAX_SPEED * (1 - fromBottom / SCROLL_EDGE);
  return 0;
}
