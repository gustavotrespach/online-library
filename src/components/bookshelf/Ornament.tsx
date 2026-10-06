"use client";

import gsap from "gsap";
import { useEffect, useRef, type JSX } from "react";
import type { OrnamentKind } from "./bookshelf-layout";
import { animateOrnamentHover } from "./bookshelf-motion";

interface OrnamentProps {
  kind: OrnamentKind;
  x: number;
  width: number;
  height: number;
  flipped: boolean;
  reducedMotion: boolean;
}

// Ornamentos ficam em posições fixas (ver getOrnaments no layout) e não
// participam da distribuição dos livros. São renderizados dentro da
// prateleira, apoiados sobre a tábua.
export function Ornament({ kind, x, width, height, flipped, reducedMotion }: OrnamentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    return () => {
      if (element) gsap.killTweensOf(element);
    };
  }, []);

  function hover(active: boolean) {
    if (!reducedMotion && ref.current) animateOrnamentHover(ref.current, active);
  }

  const Drawing = DRAWINGS[kind];

  return (
    <div
      ref={ref}
      aria-hidden
      data-ornament={kind}
      className="absolute bottom-full"
      style={{ left: x, width, height }}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
    >
      <div className={flipped ? "size-full -scale-x-100" : "size-full"}>
        <Drawing />
      </div>
    </div>
  );
}

const svgProps = {
  className: "size-full overflow-visible",
  preserveAspectRatio: "xMidYMax meet",
} as const;

function Plant() {
  return (
    <svg viewBox="0 0 68 100" {...svgProps}>
      <g className="fill-foreground-muted/45 stroke-foreground-muted/60" strokeWidth={0.6}>
        <path d="M34 72 C31 50 30 26 35 4 C40 26 39 50 34 72 Z" />
        <path d="M34 72 C29 54 17 44 5 40 C14 54 23 64 34 72 Z" />
        <path d="M34 72 C38 52 50 42 63 37 C55 52 45 63 34 72 Z" />
        <path d="M34 72 C25 62 13 60 2 62 C12 69 23 72 34 72 Z" />
        <path d="M34 72 C43 62 55 60 66 60 C56 68 45 72 34 72 Z" />
      </g>
      <path d="M21 74 H47 L44 99 H24 Z" className="fill-surface stroke-accent/60" strokeWidth={1} />
      <rect x={18} y={69} width={32} height={6} rx={1} className="fill-surface stroke-accent/60" strokeWidth={1} />
    </svg>
  );
}

function Sculpture() {
  return (
    <svg viewBox="0 0 65 100" {...svgProps}>
      <rect x={11} y={82} width={43} height={18} className="fill-surface stroke-foreground-subtle" strokeWidth={1} />
      <path d="M15 82 C15 67 24 61 32.5 61 C41 61 50 67 50 82 Z" className="fill-paper/75" />
      <path d="M28 61 V54 H37 V61 Z" className="fill-paper/75" />
      <ellipse cx={32.5} cy={42} rx={11} ry={14} className="fill-paper/80" />
      <path d="M22 37 C24 25 41 25 43 37 C38 31 27 31 22 37 Z" className="fill-paper/60" />
    </svg>
  );
}

function Vase() {
  return (
    <svg viewBox="0 0 66 100" {...svgProps}>
      <g className="stroke-foreground-subtle" strokeWidth={1} fill="none">
        <path d="M33 30 C31 20 27 10 21 2" />
        <path d="M33 30 C35 18 40 10 47 5" />
        <path d="M33 30 C33 22 34 14 36 8" />
      </g>
      <path
        d="M24 31 C24 39 14 47 14 65 C14 85 22 99 33 99 C44 99 52 85 52 65 C52 47 42 39 42 31 Z"
        className="fill-accent/70"
      />
      <rect x={22} y={27} width={22} height={5} rx={1} className="fill-accent/80" />
      <path d="M21 60 C20 74 24 86 30 92" className="stroke-paper/30" strokeWidth={1.5} fill="none" />
    </svg>
  );
}

// Pote de porcelana com tampa.
function Jar() {
  return (
    <svg viewBox="0 0 74 100" {...svgProps}>
      <path d="M34 4 H40 V10 H34 Z" className="fill-accent/70" />
      <path d="M22 20 C22 13 29 9 37 9 C45 9 52 13 52 20 Z" className="fill-paper/70" />
      <rect x={20} y={19} width={34} height={4} rx={1} className="fill-paper/80" />
      <path
        d="M24 23 C10 28 4 44 6 62 C8 80 18 94 26 99 H48 C56 94 66 80 68 62 C70 44 64 28 50 23 Z"
        className="fill-paper/80"
      />
      <path d="M50 23 C64 28 70 44 68 62 C66 80 56 94 48 99 C57 88 62 75 62 61 C62 45 58 32 50 23 Z" className="fill-black/15" />
      <g className="stroke-accent/50" strokeWidth={1} fill="none">
        <path d="M9 38 Q37 44 65 38" />
        <path d="M14 86 Q37 91 60 86" />
      </g>
      <path d="M6 58 Q37 65 68 58 L68.4 64 Q37 71 5.6 64 Z" className="fill-accent/25" />
    </svg>
  );
}

// Dois pequenos vasos de alturas diferentes; o mais alto com um ramo seco.
function BudVases() {
  return (
    <svg viewBox="0 0 84 100" {...svgProps}>
      <g className="stroke-foreground-subtle" strokeWidth={1} fill="none">
        <path d="M26 30 C25 20 21 10 14 2" />
        <path d="M24 17 C28 13 31 12 35 12" />
      </g>
      <g className="fill-foreground-subtle/70">
        <ellipse cx={14} cy={3} rx={2} ry={3} transform="rotate(-35 14 3)" />
        <ellipse cx={35} cy={12} rx={2.5} ry={1.6} />
      </g>
      <path d="M22 31 H30 V41 C30 50 42 58 42 74 C42 90 34 99 26 99 C18 99 10 90 10 74 C10 58 22 50 22 41 Z" className="fill-surface stroke-accent/60" strokeWidth={1} />
      <rect x={20} y={28} width={12} height={3} rx={1} className="fill-surface stroke-accent/60" strokeWidth={1} />
      <path d="M57 70 H67 V73 C67 76 78 79 78 88 C78 95 72 99 62 99 C52 99 46 95 46 88 C46 79 57 76 57 73 Z" className="fill-paper/75" />
      <rect x={55} y={67} width={14} height={4} rx={1} className="fill-paper/85" />
      <path d="M51 86 C51 91 54 95 58 96" className="stroke-black/20" strokeWidth={1.5} fill="none" />
    </svg>
  );
}

// Castiçal de latão com vela apagada.
function Candlestick() {
  return (
    <svg viewBox="0 0 26 100" {...svgProps}>
      <path d="M13 3 V9" className="stroke-foreground-subtle" strokeWidth={1} />
      <path d="M9 10 Q13 7.5 17 10 V58 H9 Z" className="fill-paper/85" />
      <path d="M15 10 V58 H17 V10 Z" className="fill-black/10" />
      <path d="M4 58 H22 L20 62 H6 Z" className="fill-accent/80" />
      <path d="M11.5 62 H14.5 V70 C17 71 17 75 14.5 76 V88 H11.5 V76 C9 75 9 71 11.5 70 Z" className="fill-accent/70" />
      <path d="M5 97 C5 92 9 89 13 88 C17 89 21 92 21 97 Z" className="fill-accent/75" />
      <rect x={3} y={96} width={20} height={4} rx={1} className="fill-accent/80" />
    </svg>
  );
}

function Hourglass() {
  return (
    <svg viewBox="0 0 58 100" {...svgProps}>
      <g className="fill-accent/55">
        <rect x={8} y={8} width={3} height={84} />
        <rect x={47} y={8} width={3} height={84} />
      </g>
      <path
        d="M15 8 C15 30 27 42 27 50 C27 58 15 70 15 92 H43 C43 70 31 58 31 50 C31 42 43 30 43 8 Z"
        className="fill-paper/10 stroke-paper/40"
        strokeWidth={1}
      />
      <g className="fill-paper/55">
        <path d="M18 30 Q29 33 40 30 C37 38 31 44 29.6 49 H28.4 C27 44 21 38 18 30 Z" />
        <path d="M16 92 C18 82 24 78 29 76 C34 78 40 82 42 92 Z" />
      </g>
      <path d="M29 49 V77" className="stroke-paper/40" strokeWidth={0.8} />
      <g className="fill-accent/75">
        <rect x={4} y={2} width={50} height={6} rx={1} />
        <rect x={4} y={92} width={50} height={6} rx={1} />
        <rect x={6} y={98} width={5} height={2} />
        <rect x={47} y={98} width={5} height={2} />
      </g>
    </svg>
  );
}

// Pequeno globo com o eixo inclinado.
function Globe() {
  return (
    <svg viewBox="0 0 68 100" {...svgProps}>
      <path d="M18 99 C18 93 26 90 34 90 C42 90 50 93 50 99 Z" className="fill-accent/75" />
      <rect x={32.5} y={73} width={3} height={18} className="fill-accent/65" />
      <g transform="rotate(-18 34 42)">
        <circle cx={34} cy={42} r={26} className="fill-surface stroke-foreground-subtle/70" strokeWidth={1} />
        <g className="fill-accent/35">
          <path d="M22 26 C27 22 35 24 33 31 C31 37 26 39 24 45 C22 50 17 44 17 38 C17 33 19 29 22 26 Z" />
          <path d="M39 46 C43 44 49 46 48 52 C47 58 43 62 40 60 C38 56 37 50 39 46 Z" />
          <path d="M40 24 C44 22 50 25 52 30 C48 31 43 30 40 24 Z" />
        </g>
        <g className="stroke-paper/20" strokeWidth={0.8} fill="none">
          <ellipse cx={34} cy={42} rx={12} ry={26} />
          <path d="M10 32 Q34 37 58 32" />
          <path d="M8 42 H60" />
          <path d="M10 52 Q34 57 58 52" />
        </g>
        <path d="M34 11 A31 31 0 0 1 34 73" className="stroke-accent/70" strokeWidth={2} fill="none" />
      </g>
    </svg>
  );
}

// Porta-retrato com uma paisagem abstrata.
function Frame() {
  return (
    <svg viewBox="0 0 80 100" {...svgProps}>
      <rect x={2} y={3} width={76} height={97} className="fill-accent/70" />
      <rect x={7} y={8} width={66} height={87} className="fill-paper/80" />
      <rect x={17} y={18} width={46} height={58} className="fill-surface" />
      <circle cx={49} cy={33} r={5} className="fill-paper/35" />
      <path d="M17 60 C26 52 34 56 42 50 C50 44 56 48 63 46 V76 H17 Z" className="fill-foreground-subtle/40" />
      <path d="M17 68 C28 62 38 66 48 62 C54 60 59 61 63 60 V76 H17 Z" className="fill-foreground-subtle/60" />
    </svg>
  );
}

const DRAWINGS: Record<OrnamentKind, () => JSX.Element> = {
  plant: Plant,
  sculpture: Sculpture,
  vase: Vase,
  jar: Jar,
  "bud-vases": BudVases,
  candlestick: Candlestick,
  hourglass: Hourglass,
  globe: Globe,
  frame: Frame,
};
