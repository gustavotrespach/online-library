"use client";

import gsap from "gsap";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/components/bookshelf/bookshelf-motion";
import { READING_REFERENCE, summarizeReading, type ReadingSummary } from "@/lib/books/reading-progress";
import type { LibraryBook } from "@/types/book";
import { ReadingChart } from "./ReadingChart";
import { ReadingBook } from "./ReadingBook";
import { createChartEntrance, createHeadingEntrance, createReadingIdle } from "./reading-progress-motion";

export const READING_PROGRESS_SECTION_ID = "reading-progress";

export type ReadingProgressState =
  | { status: "loading" | "guest" | "error" }
  | { status: "ready"; books: LibraryBook[] };

interface ReadingProgressSectionProps {
  state: ReadingProgressState;
  onRetry: () => void;
}

const LINK = "text-foreground underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent";

// Grão quase imperceptível, para o preto não parecer um bloco chapado.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Seção Reading Progress da Home: o total de livros concluídos mês a mês,
// como uma jornada, ao lado da trajetória da referência estatística. Usa os livros que a estante já
// carregou (sob o RLS de user_books), então acompanha cada leitura salva sem
// outra consulta.
export function ReadingProgressSection({ state, onRetry }: ReadingProgressSectionProps) {
  const books = state.status === "ready" ? state.books : null;
  // O mês atual é o do navegador, como o mês de cada finished_at.
  const [now] = useState(() => new Date());
  const summary = useMemo(() => (books ? summarizeReading(books, now) : null), [books, now]);
  const hasData = state.status === "ready" && summary !== null && summary.totalFinished > 0;
  const showsChart = hasData && summary.months.length > 0;

  const sectionRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [chartDrawn, setChartDrawn] = useState(false);
  const onChartDrawn = useCallback(() => setChartDrawn(true), []);

  // O cabeçalho entra quando a seção chega à tela; o gráfico, quando ele
  // mesmo aparece (não é desenhado fora da tela). Cada um toca uma vez.
  const sectionInView = useInView(sectionRef, { rootMargin: "0px 0px -15% 0px" });
  const bodyInView = useInView(bodyRef, { threshold: 0.35 });
  const headingKey = state.status === "loading" ? null : `${state.status}:${hasData}`;
  const bodyKey = state.status === "loading" || (showsChart && !chartDrawn) ? null : `${state.status}:${hasData}:${showsChart}`;
  const heading = useEntrance(sectionRef, headingKey, sectionInView, reduced, createHeadingEntrance);
  useEntrance(bodyRef, bodyKey, bodyInView, reduced, createChartEntrance, heading);

  // Micro-movimento contínuo, só com a seção na tela e sem reduced motion.
  const idle = useRef<gsap.core.Timeline | null>(null);
  const idleKey = `${bodyKey}:${summary?.months.length ?? 0}`;
  useEffect(() => {
    const root = sectionRef.current;
    if (reduced || !root) return;
    const timeline = createReadingIdle(root);
    idle.current = timeline;
    return () => {
      timeline.revert();
      idle.current = null;
    };
  }, [reduced, idleKey]);
  useEffect(() => {
    if (sectionInView) idle.current?.play();
    else idle.current?.pause();
  }, [sectionInView, reduced, idleKey]);

  return (
    <section
      ref={sectionRef}
      id={READING_PROGRESS_SECTION_ID}
      aria-labelledby="reading-progress-title"
      aria-busy={state.status === "loading"}
      className="relative scroll-mt-16 pt-16 pb-28 md:scroll-mt-20 md:pt-24 md:pb-36"
    >
      <Atmosphere />

      <div className="page-container relative">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div>
              <p data-reading="heading" className="text-xs font-medium tracking-widest text-accent uppercase">
                Reading Progress
              </p>
              <h2 id="reading-progress-title" className="mt-5 text-5xl md:text-6xl lg:text-7xl">
                <span data-reading="heading" className="block">
                  Sua evolução
                </span>{" "}
                <span data-reading="heading" className="block">
                  de <span className="text-accent">leitura</span>
                </span>
              </h2>
              <div data-reading="rule" aria-hidden className="mt-8 h-px w-12 bg-accent/60" />
              <p data-reading="heading" className="mt-6 max-w-md text-base text-foreground-muted md:text-lg">
                {state.status === "guest" ? (
                  <>
                    <Link href="/entrar" className={LINK}>
                      Entre
                    </Link>{" "}
                    ou{" "}
                    <Link href="/cadastrar" className={LINK}>
                      crie sua conta
                    </Link>{" "}
                    para acompanhar, mês a mês, os livros que você concluir.
                  </>
                ) : (
                  "Cada livro concluído é um passo na sua jornada."
                )}
              </p>
            </div>
            {hasData && <Summary summary={summary} />}
          </div>

          <div ref={bodyRef} className="mt-16 md:mt-20">
            <ReadingBody state={state} summary={summary} onRetry={onRetry} onChartDrawn={onChartDrawn} />
          </div>

          <ReferenceCredit />
        </div>
      </div>
    </section>
  );
}

function useInView(ref: RefObject<Element | null>, options: IntersectionObserverInit) {
  const [inView, setInView] = useState(false);
  const { rootMargin, threshold } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin, threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
}

// Entrada que toca uma vez por montagem. A timeline é (re)criada enquanto
// não tocou, sempre que o conteúdo muda (key); null = ainda não está pronto.
// Devolve o instante em que ela começou. Com `after` (o começo de outra
// entrada), espera a outra ter avançado ENTRANCE_GAP segundos.
const ENTRANCE_GAP = 0.9;

function useEntrance(
  ref: RefObject<HTMLElement | null>,
  key: string | null,
  trigger: boolean,
  reduced: boolean,
  create: (root: HTMLElement) => gsap.core.Timeline,
  after?: RefObject<number | null>,
) {
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const start = useRef<gsap.core.Tween | null>(null);
  const startedAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (reduced) {
      start.current?.kill();
      timeline.current?.progress(1);
      return;
    }
    if (startedAt.current !== null || key === null || !root) return;
    const created = create(root);
    timeline.current = created;
    return () => {
      if (startedAt.current !== null) return;
      created.revert();
      timeline.current = null;
    };
  }, [ref, key, reduced, create]);

  useEffect(() => {
    const current = timeline.current;
    if (!trigger || !current || startedAt.current !== null) return;
    const now = performance.now();
    const other = after?.current;
    const wait = other == null ? 0 : Math.max(0, ENTRANCE_GAP - (now - other) / 1000);
    startedAt.current = now + wait * 1000;
    start.current = gsap.delayedCall(wait, () => void current.play());
  }, [trigger, key, after]);

  useEffect(
    () => () => {
      start.current?.kill();
      timeline.current?.kill();
    },
    [],
  );

  return startedAt;
}

// Atmosfera: a estante escurece aos poucos até um quase preto (sem
// divisória), com uma luz quente e baixa no horizonte e um grão quase
// imperceptível.
function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 md:-top-32">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-black) 72%, transparent) 20rem)",
        }}
      />
      <div data-reading="ambient" className="absolute inset-0 overflow-hidden">
        <div
          data-reading="ambient-light"
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 75% 40% at 50% 100%, color-mix(in srgb, var(--color-accent) 11%, transparent), transparent 70%), radial-gradient(ellipse 40% 30% at 80% 55%, color-mix(in srgb, var(--color-accent) 4%, transparent), transparent 70%)",
          }}
        />
      </div>
      <div className="absolute inset-0 opacity-[0.07] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

function ReadingBody({
  state,
  summary,
  onRetry,
  onChartDrawn,
}: {
  state: ReadingProgressState;
  summary: ReadingSummary | null;
  onRetry: () => void;
  onChartDrawn: () => void;
}) {
  if (state.status === "loading") {
    return (
      <Horizon>
        <p role="status" className="sr-only">
          Carregando seu progresso de leitura…
        </p>
      </Horizon>
    );
  }
  if (state.status === "guest") {
    return (
      <Horizon book title="Um mês de cada vez.">
        Cada livro concluído marca o mês em que você terminou a leitura, ao lado da média de leitura no Brasil.
      </Horizon>
    );
  }
  if (state.status === "error" || !summary) {
    return (
      <Horizon>
        <p role="alert" className="text-base text-foreground-muted">
          Não foi possível carregar seu progresso de leitura.{" "}
          <button type="button" onClick={onRetry} className={LINK}>
            Tentar novamente
          </button>
        </p>
      </Horizon>
    );
  }
  if (summary.totalFinished === 0) {
    return (
      <Horizon book title="Sua jornada começa com o primeiro livro concluído.">
        Quando um livro chegar a 100%, ele aparece aqui, no mês em que você terminou a leitura.
      </Horizon>
    );
  }

  return (
    <>
      {summary.months.length > 0 ? (
        <ReadingChart months={summary.months} onDrawn={onChartDrawn} />
      ) : (
        <Horizon title="Seus livros concluídos ainda não têm data de conclusão registrada." />
      )}
      {summary.undatedFinished > 0 && (
        <p data-reading="note" className="mt-8 max-w-xl text-sm text-foreground-muted">
          {summary.undatedFinished === 1
            ? "1 livro foi concluído antes do registro de datas: ele conta no total, mas não aparece em nenhum mês."
            : `${summary.undatedFinished} livros foram concluídos antes do registro de datas: eles contam no total, mas não aparecem em nenhum mês.`}
        </p>
      )}
    </>
  );
}

// Estados sem gráfico: o mesmo horizonte do gráfico, sem eixos, pontos ou
// valores inventados; só o texto e, quando a jornada ainda não começou, o
// livro no ponto de partida (decorativo, sem mês nem valor).
function Horizon({ title, book = false, children }: { title?: string; book?: boolean; children?: ReactNode }) {
  const id = useId();
  return (
    <>
      <div className="relative flex min-h-48 flex-col justify-end md:min-h-56">
        <div className={book ? "pb-20 md:pb-24" : "pb-10 md:pb-12"}>
          {title && (
            <p data-reading="message" className="max-w-xl font-serif text-3xl leading-tight text-foreground md:text-4xl">
              {title}
            </p>
          )}
          {children && (
            <div data-reading="message" className="mt-4 max-w-lg text-base text-foreground-muted">
              {children}
            </div>
          )}
        </div>
        {book && (
          <svg aria-hidden width="80" height="64" viewBox="-40 -56 80 64" className="absolute bottom-0 left-0 overflow-visible">
            <ReadingBook id={id} />
          </svg>
        )}
        <div data-reading="baseline" aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-paper/30 via-paper/10 to-transparent" />
      </div>
      {/* O lugar dos meses e anos, para todos os estados terem a mesma altura. */}
      <div aria-hidden className="mt-5 h-11" />
    </>
  );
}

// Números do resumo: parte da composição, sem cards; separados só por um fio.
function Summary({ summary }: { summary: ReadingSummary }) {
  const { totalFinished, currentYearCount, currentYear } = summary;
  return (
    <div className="flex shrink-0 items-stretch gap-8 md:gap-12">
      <p data-reading="summary" className="flex flex-col">
        <span className="font-serif text-6xl leading-none text-foreground tabular-nums lining-nums md:text-7xl">{totalFinished}</span>
        <span className="mt-3 text-sm leading-snug text-foreground-muted">
          {totalFinished === 1 ? "livro concluído" : "livros concluídos"}
          <br />
          até agora
        </span>
      </p>
      <div data-reading="summary-rule" aria-hidden className="w-px bg-paper/15" />
      <p data-reading="summary" className="flex flex-col">
        <span className="font-serif text-6xl leading-none text-foreground tabular-nums lining-nums md:text-7xl">{currentYearCount}</span>
        <span className="mt-3 text-sm leading-snug text-foreground-muted">
          {currentYearCount === 1 ? "livro em" : "livros em"}
          <br />
          <span className="font-medium text-accent">{currentYear}</span>
        </span>
      </p>
    </div>
  );
}

// Crédito discreto da referência (plan.md, seção 28).
function ReferenceCredit() {
  const { surveyAverage, booksPerYear, survey, publisher, edition } = READING_REFERENCE;
  return (
    <p className="mt-16 max-w-2xl text-xs leading-relaxed text-foreground-muted">
      Referência: média de {surveyAverage.toLocaleString("pt-BR")} livros por ano, lidos inteiros ou em parte,
      apresentada como {booksPerYear}. {survey}, {publisher}, edição de {edition}.
    </p>
  );
}
