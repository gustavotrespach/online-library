import gsap from "gsap";

type Targets = Element[];

const select = (root: Element, selector: string): Targets => gsap.utils.toArray(root.querySelectorAll(selector));
const part = (root: Element, name: string) => select(root, `[data-reading=${name}]`);

// Timeline de entrada: criada pausada, já no estado inicial (oculto), e sem
// estilos inline depois de terminar, porque os dados podem mudar (um livro
// concluído) e o React volta a controlar tudo.
function entranceTimeline(targets: Targets, lines: Targets = []) {
  const timeline = gsap.timeline({
    paused: true,
    defaults: { ease: "power3.out" },
    onComplete: () => {
      if (targets.length > 0) gsap.set(targets, { clearProps: "opacity,transform" });
      if (lines.length > 0) gsap.set(lines, { clearProps: "strokeDasharray,strokeDashoffset" });
    },
  });
  const from = (items: Targets, vars: gsap.TweenVars, at: number) => {
    if (items.length > 0) timeline.from(items, vars, at);
  };
  return { timeline, from };
}

// Entrada do cabeçalho, quando a seção chega à tela: a luz ambiente, o
// rótulo e o título, o fio dourado, a frase e os números.
export function createHeadingEntrance(root: HTMLElement) {
  const q = (name: string) => part(root, name);
  const targets = [...q("ambient"), ...q("heading"), ...q("rule"), ...q("summary"), ...q("summary-rule")];
  const { timeline, from } = entranceTimeline(targets);

  from(q("ambient"), { opacity: 0, duration: 1.8, ease: "power1.out" }, 0);
  from(q("heading"), { opacity: 0, y: 16, duration: 1, stagger: 0.12 }, 0.1);
  from(q("rule"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.9, ease: "power2.inOut" }, 0.5);
  from(q("summary"), { opacity: 0, y: 12, duration: 0.9, stagger: 0.15 }, 0.6);
  from(q("summary-rule"), { scaleY: 0, duration: 0.9, ease: "power2.inOut" }, 0.7);

  return timeline;
}

// Entrada do gráfico (ou do estado sem gráfico), quando ele chega à tela: a
// base, os meses e os anos, a trajetória da referência, a linha do usuário
// desenhada da esquerda para a direita (cada ponto quando o traço chega
// nele), o dourado acima da referência, o destaque do mês atual e, por
// último, o livro.
export function createChartEntrance(root: HTMLElement) {
  const q = (name: string) => part(root, name);
  const lines = q("line");
  const points = q("point");
  const targets = [
    ...q("baseline"),
    ...q("month"),
    ...q("year"),
    ...q("stem"),
    ...q("reference"),
    ...q("reference-tag"),
    ...q("area"),
    ...points,
    ...q("gold"),
    ...q("current"),
    ...q("book"),
    ...q("message"),
    ...q("note"),
  ];
  const { timeline, from } = entranceTimeline(targets, lines);

  from(q("baseline"), { scaleX: 0, transformOrigin: "0% 50%", duration: 1.1, ease: "power2.inOut" }, 0);
  from(q("message"), { opacity: 0, y: 12, duration: 1, stagger: 0.15 }, 0.2);
  // Rótulos do eixo em cascata, com duração total limitada: uma série longa
  // não deixa a entrada mais lenta, e o eixo começa antes da referência.
  const labels = [...q("month"), ...q("year")];
  from(labels, { opacity: 0, y: 6, duration: 0.7, stagger: { amount: Math.min(0.3, 0.05 * (labels.length - 1)) } }, 0.2);
  from(q("reference"), { opacity: 0, duration: 1.1, ease: "power1.out" }, 0.6);
  from(q("reference-tag"), { opacity: 0, duration: 1.1, ease: "power1.out" }, 0.7);

  const lineStart = 0.9;
  const lineDuration = lines.length > 0 ? gsap.utils.clamp(1.1, 2.4, 0.6 + 0.3 * points.length) : 0;
  const lineEase = "power1.inOut";
  // Sem linha (estados sem gráfico): o resto entra logo depois da base.
  const lineEnd = lines.length > 0 ? lineStart + lineDuration : 0.6;

  if (lines.length > 0) {
    // pathLength="1" nos paths: o traço não depende do comprimento real. Sem
    // autoRound, que arredondaria o deslocamento (0–1) para 0 ou 1 px.
    timeline.fromTo(
      lines,
      { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: lineDuration, ease: lineEase, autoRound: false },
      lineStart,
    );
  }
  from(q("area"), { opacity: 0, duration: 1.4, ease: "power1.out" }, lineStart + lineDuration * 0.5);

  // Momento em que o traço chega a cada ponto (data-at: fração do
  // comprimento), invertendo a curva da linha.
  const eased = gsap.parseEase(lineEase);
  const reach = (fraction: number) => {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      if (eased(mid) < fraction) low = mid;
      else high = mid;
    }
    return lineStart + lineDuration * high;
  };

  points.forEach((point, index) => {
    const at = lines.length > 0 ? reach(Number(point.getAttribute("data-at") ?? 0)) : 0.5;
    from(select(root, `[data-reading=stem][data-index="${index}"]`), { opacity: 0, duration: 0.6, ease: "power1.out" }, at - 0.1);
    from([point], { opacity: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2)" }, at);
  });

  from(q("gold"), { opacity: 0, duration: 1.1, ease: "power1.inOut" }, lineEnd + 0.15);
  from(q("current"), { opacity: 0, scale: 0.4, transformOrigin: "50% 50%", duration: 0.8, ease: "back.out(1.6)" }, lineEnd + 0.5);
  // Haste do mês atual quando ele não tem ponto próprio (sem conclusões).
  from(select(root, "[data-reading=stem]:not([data-index])"), { opacity: 0, duration: 0.6, ease: "power1.out" }, lineEnd + 0.4);
  from(q("note"), { opacity: 0, duration: 0.9, ease: "power1.out" }, lineEnd + 0.4);
  from(q("book"), { opacity: 0, y: 8, duration: 1.2 }, lineEnd + 1);

  return timeline;
}

// Movimento contínuo, quase imperceptível: o livro respira e, de tempos em
// tempos, vira uma página; o halo do mês atual e a luz ambiente pulsam
// devagar. A linha, os pontos e os rótulos não se movem. Quem usa pausa a
// timeline fora da tela; com reduced motion ela não é criada.
export function createReadingIdle(root: HTMLElement) {
  const q = (name: string) => part(root, name);
  const timeline = gsap.timeline({ paused: true });
  const loop = { repeat: -1, yoyo: true, ease: "sine.inOut" };
  const add = (targets: Targets, vars: gsap.TweenVars) => {
    if (targets.length > 0) timeline.to(targets, { ...loop, ...vars }, 0);
  };

  add(q("ambient-light"), { opacity: 0.6, duration: 7 });
  add(q("halo"), { scale: 1.18, opacity: 0.5, transformOrigin: "50% 50%", duration: 3.2 });
  add(q("book-float"), { y: -1.5, duration: 3.6 });
  add(q("book-glow"), { opacity: 0.5, duration: 4.4 });

  // A página gira na lombada (borda esquerda da página da direita) e se
  // assenta sobre a página da esquerda.
  const pages = q("book-page");
  if (pages.length > 0) {
    const turn = gsap.timeline({ repeat: -1, repeatDelay: 9 });
    turn
      .set(pages, { opacity: 1, scaleX: 1, transformOrigin: "0% 50%" })
      .to(pages, { scaleX: -1, duration: 1.8, ease: "power2.inOut" })
      .to(pages, { opacity: 0, duration: 0.4, ease: "power1.out" });
    timeline.add(turn, 4);
  }

  return timeline;
}
