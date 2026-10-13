import gsap from "gsap";

// Animações do livro aberto: sair da estante, vir para a frente, abrir e
// voltar ao lugar. O layout (CSS) deixa o livro aberto no centro da tela; as
// funções aqui só partem do livro da estante e chegam a esse estado, ou
// fazem o caminho inverso.

export interface OpenBookParts {
  // O livro inteiro, com as duas metades. Sem transform, aberto e centralizado.
  stage: HTMLElement;
  // Capa: gira na lombada e vira a página da esquerda.
  board: HTMLElement;
  // Página da direita.
  leaf: HTMLElement;
  // Sombra de elevação sob o livro fechado.
  shadow: HTMLElement;
  backdrop: HTMLElement;
  // Linhas de texto da página, que aparecem depois da abertura.
  content: HTMLElement[];
  // Fechar e remover.
  controls: HTMLElement[];
}

// Transform do palco que põe o livro fechado sobre o livro da estante.
export interface BookOrigin {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

// Quanto o livro sobe ao sair da prateleira e antes de assentar de volta.
const LIFT = 10;
const LIFT_SCALE = 1.05;
const TILT = -2;
const PERSPECTIVE = 2400;

// Livro fechado no centro: só a metade da direita tem conteúdo, então o palco
// recua meia página para a esquerda.
function closedX(stage: HTMLElement) {
  return -stage.offsetWidth / 4;
}

// Retângulo do palco sem o transform em curso.
function layoutRect(element: HTMLElement) {
  const transform = element.style.transform;
  element.style.transform = "none";
  const rect = element.getBoundingClientRect();
  element.style.transform = transform;
  return rect;
}

// Lido a cada abertura e a cada fechamento: a estante pode ter mudado de
// lugar no meio-tempo (resize). Sem o livro na estante, não há origem.
export function captureBookOrigin(stage: HTMLElement, origin: HTMLElement | null): BookOrigin | null {
  if (!origin?.isConnected) return null;
  const from = origin.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return null;

  const to = layoutRect(stage);
  return {
    x: closedX(stage) + from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    scaleX: from.width / (to.width / 2),
    scaleY: from.height / to.height,
  };
}

function lifted(origin: BookOrigin) {
  return {
    x: origin.x,
    y: origin.y - LIFT,
    scaleX: origin.scaleX * LIFT_SCALE,
    scaleY: origin.scaleY * LIFT_SCALE,
    rotation: TILT,
  };
}

function prepare(parts: OpenBookParts) {
  // A escala do livro parte do centro da metade da direita (o livro fechado).
  gsap.set(parts.stage, { transformOrigin: "75% 50%" });
  gsap.set([parts.board, parts.leaf], { transformOrigin: "0% 50%", transformPerspective: PERSPECTIVE });
}

// Etapa 1: o livro sobe um pouco, inclina e se descola da prateleira.
function animateBookOut(parts: OpenBookParts, origin: BookOrigin | null) {
  const timeline = gsap.timeline();
  if (!origin) return timeline.to(parts.stage, { opacity: 1, duration: 0.3, ease: "power1.out" });

  return timeline
    .to(parts.stage, { ...lifted(origin), duration: 0.3, ease: "power2.out" })
    .to(parts.shadow, { opacity: 0.45, duration: 0.3, ease: "power2.out" }, 0);
}

// Etapa 2: vem para a frente, devagar, e para no centro ainda fechado.
function animateBookForward(parts: OpenBookParts) {
  const { stage, shadow, backdrop } = parts;
  return gsap
    .timeline()
    .to(stage, { x: closedX(stage), y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.85, ease: "power3.inOut" })
    .to(backdrop, { opacity: 1, duration: 0.6, ease: "power1.out" }, 0)
    .to(shadow, { opacity: 1, duration: 0.85, ease: "power2.inOut" }, 0);
}

// Etapa 3: a capa gira na lombada até a esquerda, a página da direita a
// acompanha um pouco e assenta, e o livro aberto se centraliza.
function animateBookOpen(parts: OpenBookParts) {
  const { stage, board, leaf, content, controls } = parts;
  return gsap
    .timeline()
    .to(board, { rotationY: -180, duration: 1, ease: "power2.inOut" })
    .to(stage, { x: 0, duration: 1, ease: "power2.inOut" }, 0)
    .to(leaf, { rotationY: -12, duration: 0.45, ease: "power2.out" }, 0.12)
    .to(leaf, { rotationY: 0, duration: 0.55, ease: "power2.inOut" }, ">")
    .to(content, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" }, 0.85)
    .to(controls, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0.95);
}

export function animateBookOpening(parts: OpenBookParts, origin: BookOrigin | null) {
  const { stage, board, leaf, shadow, backdrop, content, controls } = parts;
  prepare(parts);
  gsap.set(stage, origin ?? { x: closedX(stage), y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 0 });
  gsap.set(board, { rotationY: 0 });
  gsap.set(leaf, { rotationY: 0 });
  gsap.set([shadow, backdrop, ...controls], { opacity: 0 });
  gsap.set(content, { opacity: 0, y: 6 });

  return gsap
    .timeline()
    .add(animateBookOut(parts, origin))
    .add(animateBookForward(parts))
    .add(animateBookOpen(parts), "-=0.05");
}

// Reduced motion: direto ao livro aberto, sem trajeto.
export function showBookOpen(parts: OpenBookParts) {
  prepare(parts);
  gsap.set(parts.stage, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 });
  gsap.set(parts.board, { rotationY: -180 });
  gsap.set(parts.leaf, { rotationY: 0 });
  gsap.set([parts.shadow, parts.backdrop, ...parts.content, ...parts.controls], { opacity: 1, y: 0 });
}

// Caminho inverso, a partir de onde o livro estiver (inclusive no meio da
// abertura): fecha, volta à prateleira e assenta. Sem o livro na estante, o
// livro fechado some no lugar.
export function animateBookClose(parts: OpenBookParts, origin: BookOrigin | null, onComplete: () => void) {
  const { stage, board, leaf, shadow, backdrop, content, controls } = parts;
  gsap.killTweensOf([stage, board, leaf, shadow, backdrop, ...content, ...controls]);

  const timeline = gsap
    .timeline({ onComplete })
    .to([...content, ...controls], { opacity: 0, duration: 0.15, ease: "power1.in" });

  // Com a capa ainda fechada (fechamento no meio do trajeto), o livro volta
  // direto, sem passar pelo centro.
  if (Number(gsap.getProperty(board, "rotationY")) < -1) {
    timeline
      .to(leaf, { rotationY: 0, duration: 0.2, ease: "power1.out" }, 0)
      .to(board, { rotationY: 0, duration: 0.6, ease: "power2.inOut" }, 0.06)
      .to(stage, { x: closedX(stage), y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.6, ease: "power2.inOut" }, 0.06);
  }

  if (!origin) {
    return timeline.to([stage, backdrop], { opacity: 0, duration: 0.35, ease: "power1.in" });
  }

  return timeline
    .to(stage, { ...lifted(origin), duration: 0.65, ease: "power3.inOut" })
    .to(backdrop, { opacity: 0, duration: 0.55, ease: "power1.inOut" }, "<")
    .to(shadow, { opacity: 0.45, duration: 0.65, ease: "power2.inOut" }, "<")
    .to(stage, { ...origin, rotation: 0, duration: 0.25, ease: "power2.inOut" })
    .to(shadow, { opacity: 0, duration: 0.25, ease: "power2.in" }, "<");
}
