import type { Ref } from "react";

interface CobwebProps {
  x: number;
  y: number;
  size: number;
  // Ponta da prateleira em que a teia está presa, sob a tábua.
  side: "left" | "right";
  ref?: Ref<HTMLDivElement>;
}

const THREADS = 6;
const RINGS = [0.32, 0.56, 0.8];
// Abertura menor que 90°: sem parede ao lado, a teia pende da tábua.
const SPREAD = Math.PI * 0.42;

// Fios radiais a partir do ponto preso sob a tábua (o primeiro corre rente à
// madeira) e anéis levemente caídos entre eles.
const radials = Array.from({ length: THREADS }, (_, i) => {
  const angle = SPREAD * (i / (THREADS - 1));
  return { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
});

const rings = RINGS.map((r) =>
  radials
    .map((p, i) => {
      if (i === 0) return `M ${p.x * r} ${p.y * r}`;
      const prev = radials[i - 1];
      const midX = ((p.x + prev.x) / 2) * r * 0.86;
      const midY = ((p.y + prev.y) / 2) * r * 0.86;
      return `Q ${midX} ${midY} ${p.x * r} ${p.y * r}`;
    })
    .join(" "),
);

export function Cobweb({ x, y, size, side, ref }: CobwebProps) {
  return (
    <div
      ref={ref}
      aria-hidden
      data-cobweb
      className="pointer-events-none absolute opacity-0"
      style={{ left: x, top: y, width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className={side === "right" ? "size-full -scale-x-100" : "size-full"}>
        <g className="stroke-paper/30" strokeWidth={1.4} fill="none">
          {radials.map((p, i) => (
            <line key={i} x1={0} y1={0} x2={p.x} y2={p.y} />
          ))}
          {rings.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  );
}
