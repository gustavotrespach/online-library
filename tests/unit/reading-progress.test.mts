// Testes unitários do Reading Progress (Fase 10): série mensal acumulada e
// trajetória da referência. Dados sintéticos e data fixa (NOW), sem rede.
// Uso: npm run test:unit (CONTRIBUTING.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { READING_REFERENCE, referenceAt, summarizeReading, type ReadingSummary } from "@/lib/books/reading-progress";

// O mês de cada conclusão depende do fuso (o do navegador, na seção). Os
// casos foram escritos para São Paulo; fixar aqui torna o resultado igual em
// qualquer máquina. O node:test roda cada arquivo num processo próprio.
process.env.TZ = "America/Sao_Paulo";

const NOW = new Date("2026-10-07T15:00:00-03:00");
const done = (finishedAt: string | null) => ({ progress: 100, finished_at: finishedAt });
const reading = (progress: number, finishedAt: string | null = null) => ({ progress, finished_at: finishedAt });
// "2026-02:1/3" = fevereiro de 2026, 1 no mês, 3 acumulados.
const series = (s: ReadingSummary) =>
  s.months.map((m) => `${m.year}-${String(m.month + 1).padStart(2, "0")}:${m.finished}/${m.total}`).join(" ");
const totals = (s: ReadingSummary) => s.months.map((m) => m.total);
const monotonic = (s: ReadingSummary) => s.months.every((m, i, a) => i === 0 || m.total >= a[i - 1].total);
const MONTHLY = 3.96 / 12;

test("fuso dos testes", () => {
  assert.equal(new Date("2026-01-01T00:00:00Z").getFullYear(), 2025, "TZ=America/Sao_Paulo é necessário");
});

test("nenhum livro: nenhum mês", () => {
  const s = summarizeReading([], NOW);
  assert.deepEqual(s, { totalFinished: 0, undatedFinished: 0, currentYear: 2026, currentYearCount: 0, months: [] });
});

test("livros não concluídos não contam, mesmo com datas", () => {
  const s = summarizeReading([reading(0), reading(99, "2026-03-01T12:00:00Z"), reading(50)], NOW);
  assert.equal(s.totalFinished, 0);
  assert.deepEqual(s.months, []);
});

test("um livro no mês atual: um único mês", () => {
  const s = summarizeReading([done("2026-10-02T12:00:00Z")], NOW);
  assert.equal(s.totalFinished, 1);
  assert.equal(s.currentYearCount, 1);
  assert.deepEqual(s.months, [{ year: 2026, month: 9, finished: 1, total: 1, reference: 0.33, current: true, aboveReference: true }]);
});

test("vários livros no mesmo mês", () => {
  const s = summarizeReading([done("2026-08-01T12:00:00Z"), done("2026-08-15T12:00:00Z"), done("2026-08-31T12:00:00Z")], NOW);
  assert.equal(series(s), "2026-08:3/3 2026-09:0/3 2026-10:0/3");
});

test("meses consecutivos sem conclusões repetem o total (linha estável)", () => {
  const s = summarizeReading([done("2026-02-10T12:00:00Z"), done("2026-04-10T12:00:00Z"), done("2026-04-20T12:00:00Z"), done("2026-06-10T12:00:00Z")], NOW);
  assert.equal(series(s), "2026-02:1/1 2026-03:0/1 2026-04:2/3 2026-05:0/3 2026-06:1/4 2026-07:0/4 2026-08:0/4 2026-09:0/4 2026-10:0/4");
  assert.equal(s.months.at(-1)?.current, true);
});

test("conclusões em meses diferentes, com a entrada fora de ordem", () => {
  const s = summarizeReading([done("2026-09-01T12:00:00Z"), done("2026-07-01T12:00:00Z"), done("2026-08-01T12:00:00Z")], NOW);
  assert.equal(series(s), "2026-07:1/1 2026-08:1/2 2026-09:1/3 2026-10:0/3");
});

test("mudança de ano: dezembro → janeiro sem lacuna", () => {
  const s = summarizeReading([done("2025-11-20T12:00:00Z"), done("2026-01-05T12:00:00Z")], NOW);
  assert.equal(series(s).split(" ").slice(0, 4).join(" "), "2025-11:1/1 2025-12:0/1 2026-01:1/2 2026-02:0/2");
  assert.equal(s.months.length, 12, "novembro de 2025 a outubro de 2026");
  assert.equal(s.currentYearCount, 1, "só janeiro de 2026 conta no ano atual");
});

test("série com vários anos: contínua, crescente e com o total certo", () => {
  const dates = [
    "2024-03-10T12:00:00Z",
    "2024-11-20T12:00:00Z",
    "2025-01-05T12:00:00Z",
    "2025-03-18T12:00:00Z",
    "2025-06-02T12:00:00Z",
    "2025-08-27T12:00:00Z",
    "2025-12-30T12:00:00Z",
    "2026-02-14T12:00:00Z",
    "2026-05-09T12:00:00Z",
    "2026-09-01T12:00:00Z",
  ];
  const s = summarizeReading(dates.map(done), NOW);
  assert.equal(s.months.length, 32, "março de 2024 a outubro de 2026");
  assert.deepEqual([s.months[0].year, s.months[0].month], [2024, 2]);
  assert.deepEqual([s.months.at(-1)?.year, s.months.at(-1)?.month], [2026, 9]);
  assert.ok(s.months.every((m, i, a) => i === 0 || m.year * 12 + m.month === a[i - 1].year * 12 + a[i - 1].month + 1), "sem lacunas");
  assert.equal(s.months.at(-1)?.total, 10);
  assert.equal(s.months.reduce((sum, m) => sum + m.finished, 0), 10);
  assert.equal(s.currentYearCount, 3);
  assert.equal(s.months.filter((m) => m.current).length, 1);
});

test("o total acumulado nunca diminui", () => {
  const random = Array.from({ length: 60 }, (_, i) => done(`20${22 + (i % 5)}-${String((i * 7) % 12 + 1).padStart(2, "0")}-15T12:00:00Z`));
  const s = summarizeReading([...random, reading(40), done(null)], NOW);
  assert.ok(monotonic(s));
  assert.equal(s.months.at(-1)?.total, 60);
});

test("referência: trajetória acumulada de 3,96 / 12 por mês, a partir do primeiro mês", () => {
  const s = summarizeReading([done("2024-03-10T12:00:00Z")], NOW);
  assert.equal(READING_REFERENCE.surveyAverage, 3.96);
  assert.equal(READING_REFERENCE.booksPerYear, 4);
  s.months.forEach((m, i) => assert.ok(Math.abs(m.reference - (i + 1) * MONTHLY) < 1e-9, `${i}: ${m.reference}`));
  assert.equal(s.months[11].reference, 3.96, "12 meses = 3,96");
  assert.equal(s.months[2].reference, 0.99, "sem erro de ponto flutuante");
  assert.ok(s.months.every((m, i, a) => i === 0 || m.reference > a[i - 1].reference), "estritamente crescente");
});

test("referência configurável (o mesmo cálculo com outro valor anual)", () => {
  const s = summarizeReading([done("2026-01-10T12:00:00Z")], NOW, 12);
  assert.deepEqual(s.months.map((m) => m.reference), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(s.months.map((m) => m.aboveReference), Array(10).fill(false), "1 não passa de 1; depois fica abaixo");
});

test("usuário acima e abaixo da referência, mês a mês", () => {
  // Fevereiro: 2 livros; depois nada até outubro.
  const s = summarizeReading([done("2026-02-03T12:00:00Z"), done("2026-02-20T12:00:00Z")], NOW);
  assert.deepEqual(totals(s), [2, 2, 2, 2, 2, 2, 2, 2, 2]);
  // Referência: 0,33 0,66 0,99 1,32 1,65 1,98 2,31 2,64 2,97.
  assert.deepEqual(s.months.map((m) => m.aboveReference), [true, true, true, true, true, true, false, false, false]);
});

test("igual à referência não é acima (estritamente maior)", () => {
  const s = summarizeReading([done("2026-01-10T12:00:00Z"), done("2026-04-10T12:00:00Z")], NOW, 6);
  // Referência 0,5 por mês: janeiro 0,5 (1 > 0,5), abril 2 (2 = 2).
  assert.equal(s.months[0].aboveReference, true);
  assert.equal(s.months[3].reference, 2);
  assert.equal(s.months[3].total, 2);
  assert.equal(s.months[3].aboveReference, false);
});

test("livro concluído sem finished_at conta no total, mas em nenhum mês", () => {
  const s = summarizeReading([done(null), done("2026-07-01T12:00:00Z")], NOW);
  assert.equal(s.totalFinished, 2);
  assert.equal(s.undatedFinished, 1);
  assert.equal(series(s), "2026-07:1/1 2026-08:0/1 2026-09:0/1 2026-10:0/1");
});

test("só livros sem data: nenhum mês é inventado", () => {
  const s = summarizeReading([done(null), done(null)], NOW);
  assert.equal(s.totalFinished, 2);
  assert.equal(s.undatedFinished, 2);
  assert.deepEqual(s.months, []);
});

test("o mês vem do fuso do usuário (navegador), não do UTC", () => {
  // 2026-10-01 01:00 UTC ainda é 30/09 em São Paulo.
  const s = summarizeReading([done("2026-10-01T01:00:00Z")], NOW);
  assert.equal(series(s), "2026-09:1/1 2026-10:0/1");
});

test("livro passa de incompleto para concluído: entra no mês da conclusão", () => {
  const before = [done("2026-05-10T12:00:00Z"), reading(60)];
  const after = [done("2026-05-10T12:00:00Z"), done("2026-10-06T12:00:00Z")];
  const a = summarizeReading(before, NOW);
  const b = summarizeReading(after, NOW);
  assert.deepEqual(totals(a), [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(totals(b), [1, 1, 1, 1, 1, 2]);
  assert.equal(b.currentYearCount, 2);
  // E sai de 100%: volta ao que era.
  assert.deepEqual(summarizeReading(before, NOW), a);
});

test("reload: os mesmos livros dão a mesma série, sem duplicar", () => {
  const books = [done("2026-03-10T12:00:00Z"), done("2026-03-10T12:00:00Z"), done("2026-06-01T12:00:00Z"), reading(30)];
  const first = summarizeReading(books, NOW);
  const again = summarizeReading(books.map((b) => ({ ...b })), NOW);
  assert.deepEqual(again, first);
  assert.equal(first.months.at(-1)?.total, 3, "cada linha conta uma vez");
  assert.equal(first.totalFinished, 3);
});

test("relógio local atrasado não esconde um mês já registrado", () => {
  const s = summarizeReading([done("2026-12-02T12:00:00Z")], NOW);
  assert.equal(series(s), "2026-12:1/1");
  assert.equal(s.months[0].current, false);
});

test("referência atravessando a virada do ano: 12 meses = 3,96, mesma origem da série", () => {
  // Novembro de 2025 a outubro de 2026: 12 meses, com a virada no meio.
  const s = summarizeReading([done("2025-11-20T12:00:00Z"), done("2026-01-05T12:00:00Z"), done("2026-06-05T12:00:00Z")], NOW);
  assert.equal(s.months.length, 12);
  assert.deepEqual(
    s.months.map((m) => m.reference),
    [0.33, 0.66, 0.99, 1.32, 1.65, 1.98, 2.31, 2.64, 2.97, 3.3, 3.63, 3.96],
    "o índice do mês continua contando depois de dezembro",
  );
  assert.deepEqual(totals(s), [1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]);
  assert.deepEqual(
    s.months.map((m) => m.aboveReference),
    [true, true, true, true, true, true, false, true, true, false, false, false],
  );
});

test("como uma conta real hoje: conclusões datadas só no mês atual", () => {
  // finished_at existe desde a migration da 09B; as conclusões anteriores
  // ficaram sem data. A série tem um mês e a referência termina em 0,33.
  const today = "2026-10-06T12:00:00Z";
  const s = summarizeReading([done(today), done(today), done(today), done(today), done(null), done(null)], NOW);
  assert.equal(s.totalFinished, 6);
  assert.equal(s.undatedFinished, 2);
  assert.deepEqual(s.months, [{ year: 2026, month: 9, finished: 4, total: 4, reference: 0.33, current: true, aboveReference: true }]);
});

test("referenceAt: a mesma trajetória da série, também além do histórico (eixo de 12 meses)", () => {
  assert.equal(referenceAt(0), 0, "origem");
  assert.equal(referenceAt(1), 0.33);
  assert.equal(referenceAt(12), 3.96, "12 intervalos = 3,96");
  assert.equal(referenceAt(24), 7.92);
  assert.equal(referenceAt(12, 12), 12, "valor anual configurável");
  // Um mês de histórico: a série tem só ele; o eixo de 12 meses continua a
  // mesma conta, sem criar meses no modelo.
  const s = summarizeReading([done("2026-10-02T12:00:00Z")], NOW);
  assert.equal(s.months.length, 1);
  assert.equal(s.months[0].reference, referenceAt(1));
  const long = summarizeReading([done("2024-03-10T12:00:00Z")], NOW);
  assert.ok(long.months.every((m, i) => m.reference === referenceAt(i + 1)));
});
