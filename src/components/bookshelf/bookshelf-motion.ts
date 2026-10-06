import gsap from "gsap";
import { useSyncExternalStore } from "react";

// Animações da estante: "como cada elemento chega à posição calculada pelo
// layout". Nenhuma função aqui decide posições.

const PLACE_EASE = "power3.out";
const MOVE_EASE = "power2.inOut";

// FLIP: o elemento já está na posição final (definida pelo React); parte do
// deslocamento até onde estava visualmente e anima até zero.
export function animateBookMove(element: HTMLElement, dx: number, dy: number) {
  gsap.killTweensOf(element, "x,y");
  return gsap.fromTo(
    element,
    { x: dx, y: dy },
    { x: 0, y: 0, duration: dy === 0 ? 0.6 : 0.8, ease: MOVE_EASE },
  );
}

// Um livro sendo colocado na prateleira: chega de cima, levemente inclinado.
export function animateBookEnter(element: HTMLElement, delay = 0) {
  return gsap.fromTo(
    element,
    { opacity: 0, y: -28, rotation: -4, transformOrigin: "50% 100%" },
    { opacity: 1, y: 0, rotation: 0, duration: 0.9, delay, ease: PLACE_EASE },
  );
}

export function animateBookExit(element: HTMLElement, onComplete: () => void) {
  return gsap.to(element, {
    opacity: 0,
    y: -16,
    rotation: 3,
    transformOrigin: "50% 100%",
    duration: 0.45,
    ease: "power2.in",
    onComplete,
  });
}

export function animateShelfIn(element: HTMLElement) {
  return gsap.fromTo(
    element,
    { opacity: 0, scaleX: 0.92, y: 8 },
    { opacity: 1, scaleX: 1, y: 0, duration: 0.7, ease: PLACE_EASE },
  );
}

export function animateShelfOut(element: HTMLElement, onComplete: () => void) {
  return gsap.to(element, {
    opacity: 0,
    scaleX: 0.96,
    duration: 0.5,
    ease: "power2.in",
    onComplete,
  });
}

export function animateHeight(element: HTMLElement, from: number, to: number) {
  return gsap.fromTo(
    element,
    { height: from },
    { height: to, duration: 0.7, ease: MOVE_EASE },
  );
}

export function setCobwebsVisible(
  elements: HTMLElement[],
  visible: boolean,
  animate: boolean,
) {
  const state = { opacity: visible ? 1 : 0, y: visible ? 0 : -6, scale: visible ? 1 : 0.94 };
  if (!animate) return gsap.set(elements, state);
  return gsap.to(elements, {
    ...state,
    duration: visible ? 1.2 : 0.6,
    ease: visible ? "power2.out" : "power2.in",
  });
}

// Livro pego da prateleira: sobe um pouco, inclina e cresce levemente. A
// sombra maior vem do CSS (data-dragging no Book).
export function liftBook(body: HTMLElement, reducedMotion: boolean) {
  const state = { y: -8, rotation: -2.5, scale: 1.04, transformOrigin: "50% 100%" };
  gsap.killTweensOf(body);
  if (reducedMotion) return gsap.set(body, state);
  return gsap.to(body, { ...state, duration: 0.35, ease: "power2.out" });
}

// Livro solto: assenta na posição do layout (x/y do item) e volta ao repouso.
export function settleBook(
  element: HTMLElement,
  body: HTMLElement,
  reducedMotion: boolean,
  onComplete: () => void,
) {
  gsap.killTweensOf(element, "x,y");
  gsap.killTweensOf(body);
  const rest = { y: 0, rotation: 0, scale: 1 };

  if (reducedMotion) {
    gsap.set(element, { x: 0, y: 0 });
    gsap.set(body, rest);
    onComplete();
    return;
  }

  gsap.to(body, { ...rest, duration: 0.45, ease: "power2.out" });
  gsap.to(element, { x: 0, y: 0, duration: 0.5, ease: "power3.out", onComplete });
}

// Microinteração dos ornamentos: um balanço lento e quase imperceptível.
export function animateOrnamentHover(element: HTMLElement, active: boolean) {
  return gsap.to(element, {
    rotation: active ? 1.5 : 0,
    y: active ? -2 : 0,
    transformOrigin: "50% 100%",
    duration: active ? 1.4 : 1.1,
    ease: "sine.inOut",
  });
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    // No servidor, sem preferência conhecida: o layout é o mesmo.
    () => false,
  );
}
