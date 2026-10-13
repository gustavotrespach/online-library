// Testes unitários da leitura (Fase 09B): progresso a partir das páginas
// lidas, status e validação de páginas, porcentagem e feedback. Dados
// sintéticos, sem rede. Uso: npm run test:unit (CONTRIBUTING.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { getReadingStatus, hasPageCount, pagesFromProgress, progressFromPages } from "@/lib/books/reading";
import { feedbackSchema, MAX_FEEDBACK_LENGTH, pagesReadSchema, progressPercentSchema } from "@/lib/validation/book";

test("progresso a partir das páginas lidas", () => {
  assert.equal(progressFromPages(137, 320), 43, "42,8125% arredonda para 43");
  assert.equal(progressFromPages(160, 320), 50);
  assert.equal(progressFromPages(0, 320), 0);
  assert.equal(progressFromPages(320, 320), 100);
});

test("arredondamento: 0 e 100 só nos extremos", () => {
  assert.equal(progressFromPages(1, 1000), 1, "uma página já é leitura iniciada (0,1% → 1)");
  assert.equal(progressFromPages(999, 1000), 99, "faltando uma página não é concluído (99,9% → 99)");
  assert.equal(progressFromPages(1, 3), 33);
  assert.equal(progressFromPages(2, 3), 67);
  assert.equal(progressFromPages(5, 8), 63, "62,5% arredonda para cima, como round() no Postgres");
  for (let pages = 1; pages <= 400; pages += 7) {
    for (let read = 0; read <= pages; read += 1) {
      const p = progressFromPages(read, pages);
      assert.ok(Number.isInteger(p) && p >= 0 && p <= 100);
      assert.equal(p === 0, read === 0);
      assert.equal(p === 100, read === pages);
    }
  }
});

test("páginas equivalentes a um progresso (preenchimento e livros antigos)", () => {
  assert.equal(pagesFromProgress(43, 320), 138);
  assert.equal(pagesFromProgress(0, 320), 0);
  assert.equal(pagesFromProgress(100, 320), 320);
  // Ida e volta preserva o progresso a partir de 100 páginas.
  for (let progress = 0; progress <= 100; progress += 1) {
    assert.equal(progressFromPages(pagesFromProgress(progress, 320), 320), progress);
  }
});

test("livro sem páginas: progresso direto", () => {
  assert.equal(hasPageCount(null), false);
  assert.equal(hasPageCount(0), false);
  assert.equal(hasPageCount(320), true);
  assert.deepEqual(progressPercentSchema.safeParse("43").data, 43);
  assert.deepEqual(progressPercentSchema.safeParse(" 0 ").data, 0);
  assert.deepEqual(progressPercentSchema.safeParse("100").data, 100);
  for (const bad of ["101", "-1", "4.5", "", "abc", "1e2"]) {
    const result = progressPercentSchema.safeParse(bad);
    assert.equal(result.success, false, bad);
    assert.equal(result.error?.issues[0]?.message, "Use um número inteiro entre 0 e 100.");
  }
});

test("validação das páginas lidas", () => {
  const schema = pagesReadSchema(320);
  assert.equal(schema.safeParse("137").data, 137);
  assert.equal(schema.safeParse("0").data, 0);
  assert.equal(schema.safeParse("320").data, 320);
  assert.equal(schema.safeParse("321").error?.issues[0]?.message, "As páginas lidas não podem passar de 320.");
  for (const bad of ["-1", "", "3.5", "dez"]) {
    assert.equal(schema.safeParse(bad).error?.issues[0]?.message, "Informe um número inteiro de páginas.", bad);
  }
});

test("validação do feedback", () => {
  assert.equal(feedbackSchema.parse("  Gostei.  "), "Gostei.", "aparado");
  assert.equal(feedbackSchema.parse(""), null, "vazio apaga");
  assert.equal(feedbackSchema.parse("   \n "), null, "só espaços apaga");
  assert.equal(feedbackSchema.parse("a".repeat(MAX_FEEDBACK_LENGTH))?.length, 5000);
  assert.equal(
    feedbackSchema.safeParse("a".repeat(MAX_FEEDBACK_LENGTH + 1)).error?.issues[0]?.message,
    "Use no máximo 5000 caracteres.",
  );
  assert.equal(feedbackSchema.parse(`  ${"a".repeat(5000)}  `)?.length, 5000, "espaços nas pontas não contam");
});

test("transições de status pelo progresso", () => {
  assert.equal(getReadingStatus(0), "not_started");
  assert.equal(getReadingStatus(1), "reading", "0 → >0: começa a leitura");
  assert.equal(getReadingStatus(99), "reading");
  assert.equal(getReadingStatus(100), "finished", "<100 → 100: concluído");
  assert.equal(getReadingStatus(50), "reading", "100 → <100: volta a ser leitura");
  assert.equal(getReadingStatus(progressFromPages(320, 320)), "finished");
  assert.equal(getReadingStatus(progressFromPages(319, 320)), "reading");
  assert.equal(getReadingStatus(progressFromPages(1, 320)), "reading");
});
