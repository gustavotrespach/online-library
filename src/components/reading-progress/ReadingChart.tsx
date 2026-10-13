"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { booksLabel, READING_REFERENCE, referenceAt, type ReadingMonth } from "@/lib/books/reading-progress";
import { ReadingBook } from "./ReadingBook";

// Espaço acima do ponto mais alto, para o livro do mês atual, e abaixo do
// zero: a linha no zero fica um pouco acima da base, sem ser encoberta.
const TOP_SPACE = 64;
const BOTTOM_SPACE = 14;
// Largura máxima de um mês: poucos meses ficam juntos no centro, em vez de
// espalhados pelas pontas.
const MAX_STEP = 140;
// Distância mínima entre dois rótulos de mês ("set", 12px) e entre o começo
// de dois anos ("2026", 14px, cerca de 34px), com respiro.
const MONTH_GAP = 34;
const YEAR_GAP = 42;
// Intervalos possíveis entre meses rotulados, alinhados ao calendário
// (a cada 3: jan, abr, jul, out).
const MONTH_STRIDES = [1, 2, 3, 6];
// Extensão mínima do eixo: com menos meses de histórico, a referência não
// teria espaço para mostrar o que é "4 livros por ano" (decisions.md, 017).
const MIN_AXIS_MONTHS = 12;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Rótulos dos meses que só completam o eixo: bem mais apagados que os do
// histórico (cor com transparência, não opacidade, para a entrada não
// precisar saber deles).
const FUTURE_TEXT = "text-foreground-muted/40";

// Dourado da linha: o accent clareado pelo papel, para ter presença sobre o
// quase preto sem virar neon.
const GOLD = "color-mix(in srgb, var(--color-accent) 80%, var(--color-paper))";

type Size = { width: number; height: number };

// Mede a área do gráfico: o SVG é desenhado em pixels reais (1 unidade = 1px),
// então linhas, pontos, livro e textos nunca deformam.
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

interface Geometry {
  // Borda de um mês: x(0) é o começo do primeiro mês (a origem, no zero) e
  // x(i + 1) o fim do mês i, onde fica o total acumulado dele.
  x: (edge: number) => number;
  y: (value: number) => number;
  step: number;
}

function getGeometry(count: number, width: number, height: number, top: number): Geometry {
  const inset = Math.min(Math.max(width * 0.06, 28), 72);
  const step = Math.min((width - 2 * inset) / count, MAX_STEP);
  const start = (width - step * count) / 2;
  return {
    x: (edge) => start + edge * step,
    y: (value) => height - BOTTOM_SPACE - (value / top) * (height - TOP_SPACE - BOTTOM_SPACE),
    step,
  };
}

// Um mês do eixo. Os do histórico vêm de summarizeReading; os seguintes
// (future) só existem no eixo, para completar 12 meses: não têm total, ponto
// ou linha do usuário, só a trajetória da referência.
interface AxisMonth {
  year: number;
  month: number;
  current: boolean;
  future: boolean;
}

function axisMonths(months: ReadingMonth[]): AxisMonth[] {
  const last = months[months.length - 1];
  const lastKey = last.year * 12 + last.month;
  const extension = Array.from({ length: Math.max(0, MIN_AXIS_MONTHS - months.length) }, (_, index) => {
    const key = lastKey + index + 1;
    return { year: Math.floor(key / 12), month: key % 12, current: false, future: true };
  });
  return [...months.map(({ year, month, current }) => ({ year, month, current, future: false })), ...extension];
}

// O maior total ou o fim da trajetória da referência no eixo, o que for maior.
const chartTop = (months: ReadingMonth[], axisLength: number) =>
  Math.max(referenceAt(axisLength), ...months.map((m) => m.total));

// Altura da área do gráfico por faixa; a base fica na borda de baixo.
const PLOT_HEIGHT = "h-64 md:h-72 lg:h-80";

interface ReadingChartProps {
  months: ReadingMonth[];
  // Avisado quando o gráfico já foi desenhado na largura real (a entrada só é
  // montada depois disso).
  onDrawn?: () => void;
}

export function ReadingChart({ months, onDrawn }: ReadingChartProps) {
  const id = useId();
  const [plotRef, size] = useSize<HTMLDivElement>();
  const reference = READING_REFERENCE.booksPerYear;
  const drawn = size !== null && size.width > 0;
  const first = months[0];
  const last = months[months.length - 1];
  const axis = axisMonths(months);
  const axisEnd = axis[axis.length - 1];

  useEffect(() => {
    if (drawn) onDrawn?.();
  }, [drawn, onDrawn]);

  // O rótulo da referência acompanha o fim da trajetória, no fim do eixo.
  const referenceY = size ? getGeometry(axis.length, size.width, size.height, chartTop(months, axis.length)).y(referenceAt(axis.length)) : null;

  return (
    <figure aria-labelledby={`${id}-caption`}>
      <figcaption id={`${id}-caption`} className="sr-only">
        Total acumulado de livros concluídos, mês a mês, de {monthName(first)} a {monthName(last)}, comparado à
        trajetória acumulada da referência de cerca de {reference} livros por ano.
        {axisEnd.future &&
          ` O eixo continua até ${monthName(axisEnd)} só para mostrar a trajetória da referência em 12 meses; esses meses ainda não aconteceram.`}
      </figcaption>

      {/* Telas menores: a referência é nomeada acima do gráfico. */}
      <p aria-hidden data-reading="reference-tag" className="mb-6 flex items-center justify-end gap-3 text-xs text-foreground-muted lg:hidden">
        <svg width="28" height="2" className="overflow-visible">
          <line x1="0" x2="28" y1="1" y2="1" strokeDasharray="3 5" className="stroke-paper/40" strokeWidth="1" />
        </svg>
        <span>
          Referência: <span className="text-accent">{booksLabel(reference)} por ano</span>
        </span>
      </p>

      <div className="relative lg:pr-48">
        <div ref={plotRef} className={`relative ${PLOT_HEIGHT}`}>
          {size && size.width > 0 && <Plot id={id} months={months} axis={axis} size={size} />}
        </div>

        {/* Desktop: a referência é nomeada à direita, na altura da linha. */}
        {referenceY !== null && (
          <div
            aria-hidden
            data-reading="reference-tag"
            className="absolute right-0 hidden w-40 -translate-y-1/2 lg:block"
            style={{ top: referenceY }}
          >
            <p className="text-xs font-medium tracking-widest text-foreground-muted uppercase">Referência</p>
            <p className="mt-1 text-lg text-accent">{booksLabel(reference)} por ano</p>
            <p className="mt-1 text-xs text-foreground-muted">
              ({READING_REFERENCE.publisher}, {READING_REFERENCE.edition})
            </p>
          </div>
        )}

        <AxisLabels axis={axis} width={size?.width ?? 0} />
      </div>

      {/* A série completa, inclusive os meses sem conclusões. */}
      <ul className="sr-only">
        {months.map((m) => (
          <li key={`${m.year}-${m.month}`}>
            {monthName(m)}
            {m.current ? " (mês atual)" : ""}: {booksLabel(m.total)} {m.total === 1 ? "concluído acumulado" : "concluídos acumulados"}
            {m.finished > 0 ? ` (${m.finished} no mês)` : ""}
            {m.aboveReference ? ", acima da referência" : ""}.
          </li>
        ))}
      </ul>
    </figure>
  );
}

const monthName = (m: { year: number; month: number }) => `${MONTH_NAMES[m.month]} de ${m.year}`;

// Quais rótulos aparecem, de forma determinística pela largura de um mês.
// Meses: o menor intervalo do calendário em que os rótulos não encostam
// (todos, a cada 2, 3 ou 6); estreito demais, nenhum. O mês atual sempre
// aparece, e os vizinhos que encostariam nele saem. Anos: na borda onde
// cada um começa (o primeiro, no começo da série); o ano atual e o primeiro
// têm prioridade, depois do mais recente ao mais antigo, sem encostar. A
// lista acessível tem a série completa.
function axisLabels(months: AxisMonth[], step: number) {
  const stride = MONTH_STRIDES.find((n) => n * step >= MONTH_GAP);
  const current = months.findIndex((m) => m.current);
  const monthIndexes = new Set<number>();
  months.forEach((m, index) => {
    const onStride = stride !== undefined && m.month % stride === 0;
    const clearOfCurrent = current < 0 || index === current || Math.abs(index - current) * step >= MONTH_GAP;
    if ((onStride && clearOfCurrent) || index === current) monthIndexes.add(index);
  });

  // Borda (em meses desde o começo) em que cada ano começa.
  const starts = months.flatMap((m, index) => (index === 0 || m.month === 0 ? [{ year: m.year, edge: index }] : []));
  const currentYear = starts.findIndex((start) => months.some((m) => m.current && m.year === start.year));
  const order = [currentYear, 0, ...starts.map((_, index) => starts.length - 1 - index)].filter((index) => index >= 0);
  const chosen: number[] = [];
  for (const index of order) {
    if (chosen.every((other) => Math.abs(starts[other].edge - starts[index].edge) * step >= YEAR_GAP)) chosen.push(index);
  }
  const years = starts.filter((_, index) => chosen.includes(index));

  return { monthIndexes, years };
}

// Abaixo da base: os meses (no meio de cada um) e, numa segunda linha, os
// anos, cada um na borda em que começa, com uma marca na base. Os meses que
// só completam o eixo ficam bem apagados: ainda não aconteceram. Sem tooltip.
function AxisLabels({ axis, width }: { axis: AxisMonth[]; width: number }) {
  if (width === 0) return <div className="mt-5 h-11" />;
  const { x, step } = getGeometry(axis.length, width, 1, 1);
  const { monthIndexes, years } = axisLabels(axis, step);
  const currentYear = axis.find((m) => m.current)?.year;

  return (
    <div aria-hidden className="relative mt-5 h-11 tabular-nums">
      {axis.map((m, index) =>
        monthIndexes.has(index) ? (
          <p
            key={`${m.year}-${m.month}`}
            data-reading="month"
            data-current={m.current || undefined}
            data-future={m.future || undefined}
            className={`absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap ${m.current ? "font-medium text-accent" : m.future ? FUTURE_TEXT : "text-foreground-muted"}`}
            style={{ left: x(index) + step / 2 }}
          >
            {MONTHS[m.month]}
          </p>
        ) : null,
      )}
      {years.map(({ year, edge }) => (
        <p
          key={year}
          data-reading="year"
          data-current={year === currentYear || undefined}
          data-future={axis[edge].future || undefined}
          className={`absolute top-5 text-sm whitespace-nowrap ${year === currentYear ? "text-accent" : axis[edge].future ? FUTURE_TEXT : "text-foreground-muted"}`}
          style={{ left: x(edge) }}
        >
          {year}
        </p>
      ))}
    </div>
  );
}

function Plot({ id, months, axis, size }: { id: string; months: ReadingMonth[]; axis: AxisMonth[]; size: Size }) {
  const { width, height } = size;
  // A mesma geometria para o histórico e para o eixo inteiro: a borda i é a
  // mesma nos dois, e a escala vertical inclui o fim da referência no eixo.
  const { x, y } = getGeometry(axis.length, width, height, chartTop(months, axis.length));
  // A linha começa no zero, no começo do primeiro mês, e passa pelo total de
  // cada mês (no fim dele): sobe quando há conclusões, fica reta sem elas.
  // Termina no último mês do histórico (o atual), nunca nos meses seguintes.
  const origin = { cx: x(0), cy: y(0) };
  const vertices = [origin, ...months.map((m, index) => ({ cx: x(index + 1), cy: y(m.total) }))];
  // Pontos só nos meses com conclusões (e o atual, destacado à parte): uma
  // série longa não vira uma fileira de pontos.
  const points = months.flatMap((m, index) => (m.finished > 0 ? [{ ...m, vertex: index + 1, ...vertices[index + 1] }] : []));
  const currentIndex = months.findIndex((m) => m.current);
  const current = currentIndex >= 0 ? vertices[currentIndex + 1] : null;
  const end = vertices[vertices.length - 1];
  const referenceEnd = { cx: end.cx, cy: y(months[months.length - 1].reference) };
  // A referência continua pelos meses que só completam o eixo.
  const axisEnd = { cx: x(axis.length), cy: y(referenceAt(axis.length)) };

  // Fração do comprimento da linha em cada vértice: a entrada mostra o ponto
  // quando o traço chega nele.
  const lengths = vertices.map((v, index) => (index === 0 ? 0 : Math.hypot(v.cx - vertices[index - 1].cx, v.cy - vertices[index - 1].cy)));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const at = lengths.map((_, index) => (total > 0 ? lengths.slice(0, index + 1).reduce((sum, length) => sum + length, 0) / total : 0));

  const line = vertices.map((v, index) => `${index === 0 ? "M" : "L"}${v.cx},${v.cy}`).join(" ");
  const area = `${line} L${end.cx},${height} L${origin.cx},${height} Z`;
  const anyAbove = months.some((m) => m.aboveReference);
  // Anos novos (a borda em que janeiro começa): uma marca discreta na base.
  const yearEdges = axis.flatMap((m, index) => (index > 0 && m.month === 0 ? [{ x: x(index), future: m.future }] : []));

  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 overflow-visible">
      <defs>
        <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-paper)" stopOpacity="0.07" />
          <stop offset="1" stopColor="var(--color-paper)" stopOpacity="0" />
        </linearGradient>
        {/* Só a parte acima da trajetória da referência: ali a linha fica dourada. */}
        <clipPath id={`${id}-above`}>
          <polygon points={`${origin.cx},${origin.cy} ${referenceEnd.cx},${referenceEnd.cy} ${end.cx},${-TOP_SPACE} ${origin.cx},${-TOP_SPACE}`} />
        </clipPath>
        <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x={-20} y={-20} width={width + 40} height={height + 40}>
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      <path data-reading="area" d={area} fill={`url(#${id}-area)`} />

      {/* Base: uma linha fina, com uma marca no começo de cada ano e sob cada ponto. */}
      <line data-reading="baseline" x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} className="stroke-paper/15" strokeWidth="1" />
      {yearEdges.map((edge) => (
        <line
          key={edge.x}
          data-reading="baseline"
          x1={edge.x}
          x2={edge.x}
          y1={height - 7}
          y2={height - 0.5}
          className={edge.future ? "stroke-paper/15" : "stroke-paper/30"}
          strokeWidth="1"
        />
      ))}
      {points.map((p, index) => (
        <Stem key={p.vertex} index={index} cx={p.cx} cy={p.cy} height={height} current={p.current} />
      ))}
      {/* Mês atual sem conclusões: a haste dourada também, sem ponto comum. */}
      {current && months[currentIndex].finished === 0 && <Stem cx={current.cx} cy={current.cy} height={height} current />}

      <line
        data-reading="reference"
        x1={origin.cx}
        x2={referenceEnd.cx}
        y1={origin.cy}
        y2={referenceEnd.cy}
        strokeDasharray="4 6"
        className="stroke-paper/35"
        strokeWidth="1"
      />
      {/* Nos meses que ainda não aconteceram, a mesma trajetória, mais apagada. */}
      {axisEnd.cx > referenceEnd.cx && (
        <line
          data-reading="reference"
          data-future
          x1={referenceEnd.cx}
          x2={axisEnd.cx}
          y1={referenceEnd.cy}
          y2={axisEnd.cy}
          strokeDasharray="4 6"
          className="stroke-paper/20"
          strokeWidth="1"
        />
      )}

      {/* Um brilho largo e suave sob o traço, e o traço em papel. */}
      <path data-reading="line" d={line} pathLength={1} fill="none" className="stroke-paper/40" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${id}-glow)`} />
      <path data-reading="line" d={line} pathLength={1} fill="none" className="stroke-paper" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {anyAbove && (
        <g data-reading="gold" clipPath={`url(#${id}-above)`}>
          <path d={line} fill="none" stroke={GOLD} strokeOpacity="0.6" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${id}-glow)`} />
          <path d={line} fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      )}

      {points.map((p, index) => (
        <g key={p.vertex} data-reading="point" data-index={index} data-at={at[p.vertex]} data-above={p.aboveReference || undefined}>
          <circle cx={p.cx} cy={p.cy} r="3.5" className="fill-paper" />
          {p.aboveReference && <circle data-reading="gold" cx={p.cx} cy={p.cy} r="3.5" fill={GOLD} />}
        </g>
      ))}

      {current && (
        <>
          <g data-reading="current">
            <circle data-reading="halo" cx={current.cx} cy={current.cy} r="13" className="fill-accent/10 stroke-accent/40" strokeWidth="1" />
            <circle cx={current.cx} cy={current.cy} r="5.5" fill={GOLD} className="stroke-background" strokeWidth="1.5" />
          </g>
          <g transform={`translate(${current.cx} ${current.cy - 20})`}>
            <ReadingBook id={id} scale={width < 640 ? 0.9 : 1.15} />
          </g>
        </>
      )}
    </svg>
  );
}

// Haste pontilhada do ponto até a base, com uma marca na base.
function Stem({ index, cx, cy, height, current }: { index?: number; cx: number; cy: number; height: number; current: boolean }) {
  return (
    <g data-reading="stem" data-index={index}>
      <line
        x1={cx}
        x2={cx}
        y1={cy + 6}
        y2={height - 4}
        strokeDasharray="1 4"
        strokeLinecap="round"
        className={current ? "stroke-accent/50" : "stroke-paper/25"}
        strokeWidth="1"
      />
      <circle cx={cx} cy={height - 0.5} r="1.75" className={current ? "fill-accent" : "fill-paper/40"} />
    </g>
  );
}
