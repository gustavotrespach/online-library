# Contribuindo com o Online Library

Guia para desenvolvedores humanos. Agentes de IA devem seguir o
`AGENTS.md`.

## Requisitos

- Node.js 24 LTS (mínimo exigido pelo Next.js: 20.9)
- npm

## Primeiros passos

``` bash
npm install
cp .env.example .env.local   # e preencha com os valores do Supabase
npm run dev
```

O website fica disponível em <http://localhost:3000>. Use `localhost`, e
não `127.0.0.1`: os cookies de sessão e os links de confirmação do Auth
dependem desse host. Sem as variáveis do `.env.local`, as páginas não
respondem. Detalhes do banco e do Auth: `docs/banco-de-dados.md`.

## Scripts

| Comando             | Descrição                                     |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                   |
| `npm run build`     | Build de produção                             |
| `npm run start`     | Serve o build de produção                     |
| `npm run lint`      | ESLint                                        |
| `npm run typecheck` | Gera os tipos de rotas do Next.js e roda `tsc` |
| `npm run test:unit` | Testes unitários (`tests/unit/`), sem rede      |

Antes de concluir uma alteração, rode `typecheck`, `lint` e `build`.

## Testes unitários

Ficam em `tests/unit/` e usam o executor de testes do próprio Node
(`node:test`), sem dependências e sem internet; `register-aliases.mjs`
resolve o alias `@/` para `src/`. Requerem Node.js 24 (o código usa
TypeScript que precisa de `--experimental-transform-types`).
`npm run test:unit` roda todos os arquivos `tests/unit/**/*.test.mts`.

| Arquivo                   | Cobre                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `books.test.mts`          | Fase 08: ISBN, Google Books, Open Library, fallback da busca, validação, hosts de capa |
| `reading.test.mts`        | Fase 09B: progresso pelas páginas, status, validação de páginas, porcentagem e feedback |
| `reading-progress.test.mts` | Fase 10: série mensal acumulada e trajetória da referência                            |

Os testes do Reading Progress usam uma data fixa e fixam o fuso
(`America/Sao_Paulo`) no próprio arquivo: o resultado não depende do
relógio nem do fuso da máquina.

Para rodar um arquivo ou só parte dos testes, use o Node diretamente (o
filtro precisa vir antes do arquivo; argumentos depois de
`npm run test:unit --` não filtram):

``` bash
# um arquivo
node --experimental-transform-types --no-warnings \
  --import ./tests/unit/register-aliases.mjs \
  --test tests/unit/reading.test.mts

# testes cujo nome contém um trecho
node --experimental-transform-types --no-warnings \
  --import ./tests/unit/register-aliases.mjs \
  --test --test-name-pattern="resposta real" tests/unit/books.test.mts
```

Fixtures da Open Library e sua procedência:
`tests/unit/fixtures/open-library/README.md`.

## Documentação

- `plan.md`: o que o website deve ser e as fases de desenvolvimento.
- `tasks.md`: estado atual das tarefas.
- `AGENTS.md`: regras de trabalho, arquitetura e convenções, válidas
  também para humanos.
