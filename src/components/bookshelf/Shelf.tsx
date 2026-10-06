import type { ReactNode, Ref } from "react";

interface ShelfProps {
  top: number;
  thickness: number;
  ref?: Ref<HTMLDivElement>;
  // Ornamentos apoiados sobre a tábua: entram e saem junto com ela.
  children?: ReactNode;
}

// Uma tábua flutuante: sem laterais nem fundo. A sombra sob a tábua dá peso
// à prateleira sem criar uma moldura.
export function Shelf({ top, thickness, ref, children }: ShelfProps) {
  return (
    <div
      ref={ref}
      aria-hidden
      data-shelf
      className="absolute inset-x-0 origin-center"
      style={{ top, height: thickness }}
    >
      <div className="absolute inset-x-[3%] top-full h-5 bg-linear-to-b from-black/35 to-transparent" />
      <div className="relative h-full border-t border-accent/25 bg-linear-to-b from-surface to-background-secondary" />
      {children}
    </div>
  );
}
