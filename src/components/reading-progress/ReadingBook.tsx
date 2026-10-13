// Pequeno livro aberto que marca o ponto atual da jornada no Reading
// Progress. Desenhado em torno de (0, 0), o pé da lombada: quem usa só
// posiciona o grupo (no gráfico, sobre o ponto do ano atual). As partes com
// data-reading são animadas por reading-progress-motion.ts.

// As páginas sobem da lombada para as bordas, como um livro aberto na mão;
// uma segunda camada atrás dá a espessura do miolo.
const page = (side: 1 | -1, lift = 0) =>
  `M0,0 C${side * 5},-2.2 ${side * 12},-4 ${side * (18 + lift)},${-5 - lift} ` +
  `L${side * (19 + lift)},${-19 - lift} C${side * 12},${-20.5 - lift} ${side * 5},-19 0,-14 Z`;
const LEFT_PAGE = page(-1);
const RIGHT_PAGE = page(1);
const LEFT_BEHIND = page(-1, 1.6);
const RIGHT_BEHIND = page(1, 1.6);
const COVER = "M-21,-5.2 C-13,-3.6 -5.5,-1.4 0,2.2 C5.5,-1.4 13,-3.6 21,-5.2";
// Linhas de texto que acompanham a curva das páginas.
const TEXT_LINES = [-15.2, -11.8, -8.4].flatMap((y) => [
  `M-16,${y - 1} Q-9.5,${y - 1.6} -3,${y + 1.8}`,
  `M16,${y - 1} Q9.5,${y - 1.6} 3,${y + 1.8}`,
]);

export function ReadingBook({ id, scale = 1 }: { id: string; scale?: number }) {
  return (
    <g data-reading="book">
      <g transform={`scale(${scale})`}>
        <defs>
          <radialGradient id={`${id}-book-glow`}>
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g data-reading="book-float">
          <ellipse data-reading="book-glow" cx="0" cy="-9" rx="36" ry="26" fill={`url(#${id}-book-glow)`} />
          <path d={COVER} fill="none" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={LEFT_BEHIND} className="fill-paper/55" />
          <path d={RIGHT_BEHIND} className="fill-paper/55" />
          <path d={LEFT_PAGE} className="fill-paper" />
          <path d={RIGHT_PAGE} className="fill-paper" />
          {TEXT_LINES.map((d) => (
            <path key={d} d={d} fill="none" className="stroke-background/25" strokeWidth="0.7" strokeLinecap="round" />
          ))}
          <path d="M0,-14 L0,0" className="stroke-accent/70" strokeWidth="0.8" />
          {/* Página que vira de tempos em tempos (só com movimento permitido). */}
          <path data-reading="book-page" d={RIGHT_PAGE} opacity="0" className="fill-paper stroke-accent/50" strokeWidth="0.6" />
        </g>
      </g>
    </g>
  );
}
