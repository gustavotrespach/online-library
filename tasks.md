# Tarefas — Online Library

Estado das tarefas do website, organizado pelas fases definidas no
`plan.md` (seção 38).

Legenda: `[x]` concluída · `[ ]` pendente

------------------------------------------------------------------------

## Fase 01 — Fundação do Website ✅

- [x] Projeto Next.js 16 (App Router) com React 19 e TypeScript em modo `strict`
- [x] Tailwind CSS v4 configurado via `@tailwindcss/postcss`
- [x] ESLint com `eslint-config-next` (core-web-vitals + TypeScript)
- [x] Alias de importação `@/*` → `src/*`
- [x] `src/app/layout.tsx`: layout raiz, `lang="pt-BR"`, metadata global
- [x] `src/app/page.tsx`: página inicial provisória
- [x] `src/app/globals.css`: estilos globais mínimos (somente Tailwind)
- [x] `agentRules: false` no `next.config.ts` para o `next dev` não alterar o `AGENTS.md`
- [x] Scripts `dev`, `build`, `start`, `lint` e `typecheck`
- [x] Repositório Git inicializado e `.gitignore` configurado
- [x] `CONTRIBUTING.md` com instruções para rodar o projeto
- [x] Checks: `typecheck`, `lint` e `build` passando; `next dev` servindo a página

Observações:

- `src/components/`, `src/lib/`, `src/types/` e `src/styles/` ainda não
  existem porque nenhuma responsabilidade real exige esses diretórios
  nesta fase (`AGENTS.md`, seção 8). Eles serão criados nas fases
  que precisarem deles.
- Nenhuma variável de ambiente é necessária nesta fase.

## Fase 02 — Sistema Visual ✅

- [x] Tipografia: Cormorant Garamond (`font-serif`) e Inter (`font-sans`) via `next/font`, fontes variáveis auto-hospedadas
- [x] Pesos restritos a 400/500/600 e tamanho fluido `text-display`
- [x] Paleta como tokens no `@theme static` do `globals.css`, sem as cores padrão do Tailwind
- [x] Escala de espaçamento (múltiplos de 4px) mapeada na escala nativa do Tailwind
- [x] Container global `page-container` (1440px; padding de 20/32/48px)
- [x] Breakpoints de referência: `md` (768px) e `lg` (1024px)
- [x] Raios `sm`/`md`/`lg` (6/8/12px) + `rounded-full`
- [x] Bordas discretas por padrão (token `border`)
- [x] Linguagem de movimento: curvas `ease-smooth`/`ease-smooth-in-out`, transição padrão de 200ms
- [x] Foco visível global (`accent`, 2px, offset de 3px) e cor de seleção
- [x] `prefers-reduced-motion` global
- [x] `themeColor` do viewport e `color-scheme: dark`
- [x] Página inicial provisória usando somente tokens do sistema
- [x] `docs/design.md` (regras de uso) e `decisions.md` (decisão 001)
- [x] Checks: `typecheck`, `lint` e `build` passando; verificação visual em 390px, 834px e 1440px

Observações:

- Lucide React não foi instalado nesta fase porque nenhum ícone era
  usado; foi instalado na Fase 03.
- `foreground-subtle` não atinge 4,5:1 e não deve ser usado em texto de
  leitura normal (ver `docs/design.md`).

## Fase 03 — Navbar ✅

- [x] `src/components/navbar/`: `Navbar`, `MobileMenu`, `NavigationLink`, `AccountActions` e `navigation.ts`
- [x] `lucide-react` instalado (ícones `Menu` e `X`)
- [x] Desktop (≥ 1024px): marca, navegação centralizada e área da conta
- [x] Mobile e tablet (< 1024px): menu em tela cheia com `<dialog>` nativo
- [x] Itens sem destino como placeholders (`decisions.md`, 002)
- [x] Área da conta (`AccountActions`) isolada para ser substituída na autenticação
- [x] Header `fixed` com fundo translúcido, sem transições de opacity/transform
- [x] Link "Pular para o conteúdo" e `<main id="main-content">`
- [x] Trava global de scroll enquanto um `<dialog>` modal estiver aberto
- [x] Checks: `typecheck`, `lint` e `build`; testes em 390/768/1024/1440px, teclado, abertura/fechamento do menu e reduced motion

## Fase 04 — Hero ✅

- [x] `src/components/hero/`: `Hero.tsx` e `createVideoScrubber.ts`
- [x] `gsap` instalado (GSAP + ScrollTrigger)
- [x] Vídeo controlado pelo scroll via `currentTime`, com pin por 3 viewports (`decisions.md`, 004)
- [x] Scrub reversível, sem autoplay, retornando ao primeiro quadro
- [x] Preto final do vídeo conectado à seção seguinte (token `black`)
- [x] `hero-poster.jpg` (primeiro quadro, extraído sem alterar o `hero.mp4`)
- [x] Navbar integrada à timeline: aparece entre 2% e 14%, transparente sobre o Hero, visível com foco por teclado
- [x] Reduced motion: poster estático, sem pin e sem download do vídeo
- [x] Enquadramento do vídeo ajustado no mobile
- [x] Section 02 provisória (conteúdo da Fase 02) como alvo de "Pular para o conteúdo"
- [x] Checks: `typecheck`, `lint` e `build`; testes automatizados no Chrome em 390/768/1024/1440px (ver relatório da fase)
- [x] `hero-scrub.mp4` gerado a partir do `hero.mp4` com keyframes a cada 6 quadros (`decisions.md`, 005)
- [x] Idle com `hero-idle.webm` (VP9); o idle MP4 anterior fica em `assets-source/hero/` e não é mais usado
- [x] Idle bidirecional: loop no início do scroll, pausa ao rolar e retorno ao voltar ao topo, com fade nos dois sentidos
- [x] Nunca dois vídeos reproduzindo ao mesmo tempo; reduced motion sem download de vídeos
- [x] Checks: `typecheck`, `lint` e `build`; testes automatizados no Chrome em 390/768/1024/1440px com dois ciclos topo → baixo → topo, incluindo scroll contínuo, reduced motion e modo dev (StrictMode)

Pendências e melhorias:

- [ ] Testar em dispositivos reais, principalmente Safari/iOS e Firefox (os testes desta fase usaram somente Chrome headless); confirmar o suporte a WebM VP9 no Safari/iOS
- [ ] Asset mobile (vertical) opcional, via `HERO_MEDIA` no `Hero.tsx`
- [ ] Idealmente, alinhar o enquadramento do idle ao quadro 0 do scrub (hoje há uma leve diferença, suavizada pelo fade)

## Fase 05 — Supabase e Banco de Dados

### 05A — Supabase Database Foundation ✅

- [x] Supabase CLI 2.119.0 como dev dependency (`npx supabase`)
- [x] `supabase init`: `supabase/config.toml` (sem secrets; somente referências `env(...)`)
- [x] Migration `20260930225042_create_initial_library_schema.sql`: `profiles`, `books`, `user_books`
- [x] Constraints, foreign keys com `on delete` explícito e trigger `set_updated_at`
- [x] Privilégios explícitos e Row Level Security nas três tabelas (`decisions.md`, 006)
- [x] Testes pgTAP em `supabase/tests/` (`rls_test.sql`: 21; `schema_test.sql`: 17)
- [x] `docs/banco-de-dados.md`
- [x] Checks: `typecheck`, `lint` e `build`
- [x] Validação local real (Docker Desktop 29.8.1, PostgreSQL 17.11): `npx supabase start`, `db reset` e `test db` com sucesso; 38/38 testes pgTAP passando
- [x] Projeto remoto (Online Library, `sa-east-1`, PostgreSQL 17.11) vinculado com `supabase link`
- [x] Migration aplicada no remoto com `db push`, após `db push --dry-run` listar somente `20260930225042_create_initial_library_schema.sql`
- [x] Validação remota somente leitura: colunas, constraints, foreign keys, RLS, policies, grants, triggers e índices conferem com a migration; advisors sem alertas de segurança

Observações:

- Antes do Docker, a migration e os testes foram validados no PGlite
  (Postgres 18, WASM), também com 38/38. O código de erro do `restrict`
  difere entre as versões (23503 no 17, 23001 no 18); o teste compara o
  nome da constraint.
- Os testes pgTAP não foram executados no remoto: eles inserem dados
  (em transação desfeita), e a validação remota foi somente leitura.
- O advisor de performance aponta, em nível INFO, a FK
  `user_books.book_id` sem índice, omissão prevista em
  `docs/banco-de-dados.md` (seção Índices).

### 05B — Cliente Supabase ✅

- [x] `@supabase/supabase-js` 2.117.2 e `@supabase/ssr` 0.12.7
- [x] `src/lib/supabase/`: `client.ts` (navegador), `server.ts` (servidor, cookies via `getAll`/`setAll`, `server-only`) e `env.ts` (`decisions.md`, 007)
- [x] `.env.example` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, sem valores; `!.env.example` no `.gitignore`
- [x] `src/types/database.ts` gerado com `npx supabase gen types typescript --linked --schema public`
- [x] Checks: `typecheck`, `lint`, `build` e `git diff --check`
- [x] Validação dos clientes fora do repositório: checagem de tipos (consultas tipadas, tabela/campo inexistente e tipo errado rejeitados) e inicialização em runtime dos módulos reais com `cookies()` simulado, sem rede
- [x] `.env.local` configurado (ignorado pelo Git) com URL e chave publishable do projeto remoto; clientes browser e server inicializados com as variáveis reais, sem consultas ao banco

Observações:

- Nenhum componente usa os clientes ainda; o website continua rodando
  sem `.env.local`. A primeira chamada sem as variáveis gera um erro
  explícito.
- A inicialização do browser client foi testada no Node, não em um
  navegador real.

## Fase 06 — Autenticação

### 06A — Auditoria ✅

- [x] Auditoria do código, do Auth remoto (somente leitura) e do banco; decisões levantadas para a 06B

### 06B — Decisões e preparação ✅

- [x] Decisões do Auth básico registradas (`decisions.md`, 008)
- [x] `auth.email.enable_confirmations = true` no `supabase/config.toml`, alinhado ao remoto
- [x] Migration `20261002160116_create_profile_on_signup.sql`: trigger `users_create_profile` e função `create_profile_for_new_user()`
- [x] Testes: `profile_trigger_test.sql` (16) e ajuste de `rls_test.sql`/`schema_test.sql` para profiles criados pelo trigger; 54/54 passando no stack local
- [x] Fluxo de confirmação por `token_hash` verificado em stack local: `verifyOtp` sem cookies, sessão gravada via `setAll` e `getClaims()` no request seguinte
- [x] Checks: `typecheck`, `lint` e `build`

Observações:

- A validação local usou um stack temporário fora do repositório (cópia
  do `config.toml` com outras portas), porque as portas padrão estavam
  ocupadas pelo stack de outro projeto.
- Um teste que inseria usuários como `supabase_auth_admin` foi
  descartado: o papel `postgres` local não pode assumi-lo. O disparo do
  trigger pelo papel do Auth foi verificado por um `signUp` real na API
  do Auth local.

### 06C — Auth básico ✅

- [x] Migration `20261002160116_create_profile_on_signup.sql` aplicada no remoto (`db push --dry-run`, depois `db push`); trigger, função e policies conferidos no catálogo
- [x] Template de confirmação com `token_hash` no local (`supabase/templates/confirmation.html` + `config.toml`)
- [x] Host local alinhado a `http://localhost:3000` (Site URL e Redirect URLs iguais ao remoto)
- [x] `zod` como dependência direta (`decisions.md`, 009)
- [x] `src/proxy.ts` + `src/lib/supabase/proxy.ts`: renovação da sessão via `getClaims()`, sem proteção de rotas
- [x] `/cadastrar`, `/entrar` (grupo `src/app/(auth)/`) e `/auth/confirm` (Route Handler com `verifyOtp`)
- [x] `src/components/auth/`: `AuthProvider`, formulários, campos e mensagens de erro por `error.code`
- [x] `AccountActions` com estados de carregamento, visitante e autenticado (iniciais, `display_name` e Sair); o menu mobile fecha ao navegar ou sair
- [x] Checks: `typecheck`, `lint`, `build` (`/` e `/cadastrar` estáticas) e pgTAP 54/54
- [x] E2E no Chrome contra stack local (70/70), em 1440, 1024 e 390px: cadastro, validações, confirmação (inclusive em outro navegador e com link reutilizado, inválido, expirado ou sem parâmetros), login, logout, persistência após reload e ao reabrir o navegador, RLS via API, envio duplo, erro de rede e open redirect
- [x] Renovação de JWT expirado pelo proxy verificada sem JavaScript
- [x] SMTP personalizado configurado no remoto (Gmail SMTP, remetente "Online Library")
- [x] Template "Confirm signup" do remoto configurado manualmente no Dashboard, igual a `supabase/templates/confirmation.html`; validado pelo e-mail real recebido (o CLI não compara o corpo do template)
- [x] Verificação remota real (2026-10-05):
  - cadastro sem sessão e profile criado pelo trigger;
  - e-mail via SMTP com link `/auth/confirm?token_hash=…&type=email`;
  - confirmação em navegador sem cookies;
  - sessão, reload, reabertura do navegador e logout por POST;
  - erros: link reutilizado, inválido ou sem parâmetros, e-mail inválido, senha incorreta e credenciais inexistentes;
  - login posterior;
  - RLS via API (11 verificações)
- [x] Usuário de teste removido do remoto; `auth.users`, `profiles`, identities, sessions, `books` e `user_books` zerados, sem órfãos

Pendências:

- [ ] Infraestrutura de testes da aplicação (etapa "Testes"): o E2E desta fase rodou fora do repositório
- [ ] `npm audit`: 5 vulnerabilidades altas na cadeia de lint (`eslint-config-next` → `fast-glob` → `micromatch`/`braces`), anteriores a esta fase
- [ ] Melhoria de UX: logo após o login, a Navbar ainda mostra "Entrar" por uma fração de segundo enquanto o `display_name` é buscado

Antes do uso por usuários externos:

- [ ] SMTP definitivo: o Gmail SMTP atual é provisório e pode ser substituído por um serviço transacional (ex.: Resend) com domínio próprio
- [ ] Site URL de produção (quando o domínio existir)

## Fase 07 — My Library

### 07A — Protótipo visual da estante

Protótipo com dados fictícios, para validar o conceito antes da
implementação real. Sem Supabase, sem APIs de livros, sem CRUD e sem
alterações no banco.

- [x] Rota temporária `/preview/bookshelf` (sem link na navegação, `noindex`), a remover quando a estante real existir
- [x] `src/components/bookshelf/`: layout puro (`bookshelf-layout.ts`), animações GSAP (`bookshelf-motion.ts`), `Bookshelf`, `Shelf`, `Book`, `Ornament`, `Cobweb`, dados fictícios e controles do protótipo (`BookshelfPreview`)
- [x] Prateleiras flutuantes: capacidade calculada pela largura disponível, livros da esquerda para a direita e de cima para baixo, prateleira nova quando necessário
- [x] Largura do livro por páginas (escala logarítmica, 80–1000 páginas, com mínimo e máximo); capa com proporção 2:3
- [x] Progresso na capa: a parte não lida fica em escala de cinza (0% cinza, 100% colorida)
- [x] Ornamentos em posições fixas por prateleira, com área reservada no layout e balanço sutil no hover
- [x] Teias de aranha na estante vazia, que somem com o primeiro livro
- [x] Animações GSAP: entrada, saída, reordenação (FLIP, os mesmos nós DOM deslizam), prateleira entrando e saindo, altura da estante
- [x] Reduced motion: tudo vai direto ao estado final, sem hover nos ornamentos
- [x] Checks: `typecheck`, `lint`, `build` e `git diff --check`
- [x] Verificação no Chrome (fora do repositório) em 390, 768, 1024 e 1440px: sem overflow, sem sobreposição, ornamentos fixos, animações, reduced motion e Home/Navbar intactas
- [x] Refinamento após a avaliação visual: 9 tipos de ornamento (planta, escultura, vaso, pote de porcelana, vasinhos, castiçal, ampulheta, globo e porta-retrato) em SVG com tokens do design system
- [x] Distribuição determinística por prateleira (pseudoaleatória com seed fixo, sem `Math.random()`): prateleiras sem ornamento, um objeto ou um par; à esquerda, à direita ou mais ao centro quando cabem livros dos dois lados; tipos em ciclos embaralhados, sem repetição em sequência
- [x] Composição por faixa: no mobile menos ornamentos, menores, sem pares nem centro
- [x] Ornamentos renderizados dentro da prateleira: entram e saem junto com ela; a área continua reservada antes de posicionar os livros
- [x] Teias presas sob as tábuas, perto das pontas (nenhuma, pequena, maior ou maior + pequena na ponta oposta), sem tocar ornamentos da prateleira de baixo; teias de outra composição (resize) assumem o estado atual sem animar
- [x] Checks: `typecheck`, `lint`, `build` e `git diff --check`; E2E no Chrome (fora do repositório) em 390, 768, 1024 e 1440px, com resize e reduced motion

### 07B — Estante real

- [x] Decisões da estante real registradas (`decisions.md`, 010)
- [x] `src/types/book.ts` (`LibraryBook`) e `src/lib/books/user-books.ts`: `user_books` + livro embutido, sob RLS, sem `any`
- [x] `src/components/library/LibrarySection.tsx`: estados carregando, visitante, vazia, com livros e erro (com "Tentar novamente"); visitante não consulta o banco
- [x] Capas reais (`cover_url`) com fallback (título, autor e tom de encadernação estável); largura padrão sem `pages`; progresso na capa preservado
- [x] Layout por intervalos ocupáveis (`getShelfIntervals`, `packBook`): regra única de encaixe para layout e drag, sem compressão, sem invadir ornamentos, ordem preservada
- [x] Drag-and-drop com Pointer Events + GSAP (`createBookDrag.ts`): mouse, caneta e toque (pressão longa, sem bloquear a rolagem), rolagem automática nas bordas, Esc cancela
- [x] Validação de drop (`findDropTarget`): só posições em que o livro cabe inteiro na prateleira apontada; fora da estante o livro volta ao lugar
- [x] Livro segurado (elevação, inclinação, sombra), FLIP dos demais, marca discreta na tábua, assentamento e retorno físicos
- [x] Teclado: livros focáveis, setas movem uma posição, instruções e anúncios para leitores de tela
- [x] Ordem explícita (lista de ids), separada da posição física
- [x] `/preview/bookshelf` usa o mesmo componente real com dados fictícios
- [x] Home: seção My Library após o Hero, mantendo o início em `black`; `href` de My Library preenchido; `scroll-margin-top`; rolagem suave pontual (sem `scroll-behavior` global)
- [x] Checks: `typecheck`, `lint`, `build` e `git diff --check`
- [x] Verificação fora do repositório: testes puros do layout (casos A–G e propriedades) e E2E no Chrome contra um stack Supabase local temporário (visitante, vazio, loading, erro, RLS, capas, drag com mouse e toque, teclado, reduced motion, 390/768/1024/1440px, resize, navegação); regressão da 07A no preview

Limitações e pendências:

- [x] **Persistir a ordem**: resolvido na Fase 08 (`user_books.position`; `decisions.md`, 011)
- [x] Adicionar e remover livros reais: Fase 08
- [x] Capas das fontes externas com `remotePatterns` (Fase 08); URLs manuais seguem sem otimização
- [ ] Validação visual final da estante real; depois, remover `/preview/bookshelf`
- [ ] Testar em dispositivos reais (Safari/iOS e Android): o toque foi verificado com eventos sintéticos no Chrome headless
- [ ] A estante não foi verificada com usuário autenticado no projeto remoto (sem livros e sem permissão de escrita em `books`); a verificação usou o stack local

## Fase 08 — Gerenciamento de Livros

### 08 — Adicionar livros, remover e ordem persistida

- [x] Decisões registradas (`decisions.md`, 011) e `docs/integracoes.md` criado
- [x] Migration `20261006184007_add_library_order_and_book_sources.sql`:
  - `user_books.position` (`not null`, única por usuário, `deferrable`), preenchida pela ordem de adição; trigger `user_books_set_position` (fim da estante, lock por usuário)
  - `books.source`/`source_id` (identificador externo), `isbn` único em ISBN-13, `cover_url` somente HTTPS
  - `add_book_to_library` (`security definer`: validação, catálogo por ISBN/origem, sem duplicar na estante) e `set_library_order` (`security invoker`, sob RLS); `anon` sem execução
- [x] Testes pgTAP: `library_test.sql` (36); suíte local com 90/90
- [x] Migration aplicada no remoto (`db push --dry-run`, depois `db push`); catálogo conferido somente leitura; `src/types/database.ts` regenerado com `--linked`
- [x] Validação remota do fluxo das RPCs em bloco desfeito (`raise exception` no fim): livro novo, duplicata por ISBN, livro manual, ordem, progresso 0 e escrita direta em `books` bloqueada; contagens de `books`, `user_books`, `profiles` e `auth.users` conferidas em 0 depois
- [x] `src/lib/books/`: `isbn.ts` (ISBN-13 canônico), `google-books.ts`, `open-library.ts`, `book-search.ts` (fallback), `book-sources.ts` (servidor), `catalog.ts` (cliente), `cover-hosts.ts`, `normalize.ts`; `user-books.ts` com ordem por `position`, adicionar, remover e salvar a ordem
- [x] Route Handlers autenticados: `GET /api/books/search` e `GET /api/books/details`
- [x] Google Books somente com `GOOGLE_BOOKS_API_KEY` (servidor; sem chave a API responde 429); Open Library como fallback; `BOOKS_API_CONTACT` opcional no User-Agent; `.env.example` atualizado
- [x] `src/types/book.ts`: `BookSearchResult` e `BookMetadata`; `src/lib/validation/book.ts` (Zod: busca, entrada manual, resposta da API)
- [x] `src/components/book-modal/`: `ModalDialog` (`<dialog>` nativo), `AddBookDialog` (busca, resultados, revisão, salvando, duplicata, erros), `ManualBookForm`, `BookDetailsDialog` (remoção com confirmação), `CoverThumbnail`
- [x] Estante: "Adicionar livro", clique/Enter abre o livro, drag não abre; ordem gravada ao soltar (fila de gravação; falha restaura a última ordem salva); remoção otimista que volta em caso de erro
- [x] `next.config.ts`: `images.remotePatterns` só para `books.google.com/books/**` e `covers.openlibrary.org/b/**`
- [x] Checks: `typecheck`, `lint`, `build` e `git diff --check`
- [x] Verificação fora do repositório: 19 testes unitários (normalizadores, ISBN, fallback, validação, hosts), contra os arquivos reais do repositório; E2E no Chrome contra o stack local com Open Library real (ordem persistida e reload, falha ao salvar, isolamento entre usuários, adicionar, duplicata, duplo clique, manual, erros de API e banco, remoção com e sem falha, capas, foco, 390/768px); E2E da 07B e regressão da 07A

Pendências:

- [ ] Configurar `GOOGLE_BOOKS_API_KEY` (e `BOOKS_API_CONTACT`) em `.env.local` e na Vercel; o caminho do Google Books foi verificado só por testes de normalização
- [x] Atualizar progresso e feedback no livro aberto: Fase 09B
- [ ] Editar os dados do livro no catálogo (`plan.md`, seção 26: "alterar informações editáveis"): fora do escopo da 09B
- [ ] Botão "+" por prateleira (`plan.md`, seção 20): esta fase usa um único "Adicionar livro" no cabeçalho da seção
- [ ] Bucket e policies de Storage para capas personalizadas, por migration (upload de capa)
- [ ] Fluxo completo no navegador contra o remoto: requer uma conta confirmada; a validação remota cobriu as RPCs diretamente no banco
- [ ] Testes da aplicação no repositório (etapa "Testes"): unitários e E2E seguem fora do repositório

## Fase 09A — Abertura do livro

Interação visual apenas: sem edição, sem progresso editável, sem
alterações no banco.

- [x] Decisão registrada (`decisions.md`, 012)
- [x] `BookDetailsDialog` passa a ser o livro aberto: o livro sai da estante (FLIP a partir do lugar dele), vem para a frente e abre em CSS 3D (capa à esquerda com o progresso, página de papel à direita com os dados existentes)
- [x] `src/components/book-modal/open-book-motion.ts`: etapas GSAP separadas (sair, vir para a frente, abrir, fechar e voltar), interrompíveis; reduced motion direto ao estado final
- [x] Estante: o lugar do livro aberto fica vazio sem recalcular o layout (`openBookId`); `BookCover` exportado de `Book.tsx`; livro anuncia que abre um diálogo
- [x] Fechar por botão, Esc ou clique fora; o livro volta ao lugar atual dele na estante; foco volta ao livro; remover fecha, devolve o livro e segue a remoção existente
- [x] Checks: `typecheck`, `lint`, `build` e `git diff --check`
- [x] Verificação fora do repositório: E2E no Chrome contra o stack local (livros Google Books, Open Library, manual sem capa, capa quebrada e com progresso; reabrir; drag antes e depois; ordem e reload; interrupções e Esc duplo; teclado e foco; remoção; reduced motion; toque; 390/768/1024/1440px com resize aberto); regressões da 07A, 07B e 08

Pendências:

- [x] Avaliação visual do usuário antes da Fase 09B (aprovada)
- [ ] Testar em dispositivos reais (Safari/iOS e Android): toque e CSS 3D foram verificados no Chrome headless
- [ ] Capas pequenas na origem (ex.: miniatura `zoom=1` do Google Books) ficam suaves no tamanho do livro aberto

## Fase 09B — Progresso, páginas lidas e feedback

Edição da relação do usuário com o livro (não do catálogo), dentro do
livro aberto da 09A.

- [x] Decisão registrada (`decisions.md`, 013)
- [x] Migration `20261006222453_add_reading_progress.sql`: `user_books.pages_read` (≥ 0), preenchida a partir do progresso sem alterar `progress` nem `updated_at`; trigger `user_books_sync_reading` (páginas ≤ total, progresso derivado, `started_at`/`finished_at`, feedback aparado)
- [x] Testes pgTAP: `reading_test.sql` (38); suíte local com 128/128
- [x] `src/lib/books/reading.ts` (progresso a partir das páginas, status), validação Zod (páginas lidas, porcentagem, feedback) e `updateReading` (uma atualização sob RLS)
- [x] Livro aberto: progresso por páginas lidas (ou porcentagem sem páginas), feedback com contador, "Salvar progresso"/"Salvar feedback", estados não salvo/salvando/salvo/erro, pergunta ao fechar com alterações não salvas ("Salvar e fechar", "Descartar", "Cancelar")
- [x] Capa do livro aberto e da estante atualizadas ao salvar, sem reload e sem recalcular o layout da estante
- [x] Celulares: controles num cartão de papel abaixo do livro; dados da página em duas linhas (ISBN inteiro)
- [x] Verificação fora do repositório: 7 testes unitários (progresso, arredondamento, validação, status); E2E da 09B no Chrome contra o stack local (páginas, porcentagem, feedback, não salvo, concluído e datas, erros de rede, duplo clique, logout/login, reload, drag, 390/768/1024/1440px, reduced motion)
- [x] Migration aplicada no remoto (`db push --dry-run`, depois `db push`) sem alterar os dados existentes (contagens e hashes conferidos antes e depois); catálogo conferido somente leitura; `src/types/database.ts` regenerado com `--linked`
- [x] Validação remota do fluxo do trigger em bloco desfeito (`raise exception` no fim), como `authenticated` sob RLS: páginas → progresso, datas, limites, livro sem páginas, feedback aparado e transferência de `user_id` bloqueada; nenhum dado de teste restante
- [x] Regressões 07A, 07B, 08 e 09A executadas; teste de responsividade da 09A atualizado para a página com rolagem da 09B

Pendências:

- [x] Livros concluídos antes desta migration não têm `finished_at`: tratados no Reading Progress (contam no total, em nenhum ano, com aviso; `decisions.md`, 014)

## Fase 09 — Reading Progress

Item 10 da ordem de desenvolvimento (`plan.md`, seção 38); chamada de
"Fase 10" na solicitação.

- [x] Decisão registrada (`decisions.md`, 014)
- [x] `src/lib/books/reading-progress.ts`: `READING_REFERENCE` (3,96 → 4 livros por ano, Instituto Pró-Livro, 2024; único lugar com o valor) e `summarizeReading` (concluídos = progresso 100; ano de `finished_at` no fuso do navegador; anos contínuos até o ano atual; concluídos sem data só no total)
- [x] `finished_at` na consulta da estante (`LIBRARY_BOOK_COLUMNS`) e em `LibraryBook`; nenhuma consulta nova e nenhuma alteração no banco
- [x] `src/components/reading-progress/`: `ReadingProgressSection` (visitante, carregando, erro com "Tentar novamente", vazio, com dados, livros sem data), `ReadingChart` (SVG medido, tábua da estante como base, referência tracejada, destaque acima da referência, ano atual em destaque, alternativa textual) e `reading-progress-motion.ts` (entrada GSAP única por `IntersectionObserver`; reduced motion no estado final)
- [x] `LibrarySection` renderiza a seção depois da estante com os mesmos livros: concluir ou desconcluir um livro atualiza a contagem sem reload
- [x] `href` de Reading Progress em `navigation.ts` (`/#reading-progress`)
- [x] Checks: `typecheck`, `lint`, `build` (Home continua estática) e `git diff --check`
- [x] Verificação fora do repositório: 13 testes unitários (nenhum livro, um livro, mesmo ano, vários anos, sem data, progresso < 100, ano atual, anos anteriores, ordem, fuso, referência); E2E no Chrome contra o stack local (visitante sem consulta, vazio, 2024/2025/2026 = 2/5/3, concluir e desconcluir com reload, um único ano, sem data, erro, animação, reduced motion, 390/768/1024/1440px e resize, Navbar); uma única consulta a `user_books` no build de produção; regressões 07A, 07B, 08, 09A e 09B

### Redesign visual (após a primeira revisão visual)

Sem mudança em dados, contagem, referência, banco ou consultas.

- [x] Decisão registrada (`decisions.md`, 015) e `docs/design.md` atualizado
- [x] Atmosfera escura a partir do fim da estante (gradiente, luz quente baixa, grão), sem divisória nem tábua
- [x] Cabeçalho editorial ("Sua evolução de leitura") e números separados por um fio, sem cards
- [x] Gráfico: linha em papel com brilho, hastes pontilhadas, base fina, referência tracejada nomeada, dourado recortado acima da referência, ano e quantidade abaixo de cada ponto
- [x] `ReadingBook.tsx`: livro aberto em SVG sobre o ponto do ano atual (e no começo do horizonte nos estados visitante e vazio)
- [x] Motion: entrada do cabeçalho e do gráfico (uma vez cada) e micro-movimento contínuo (livro, página, halo, luz), pausado fora da tela; reduced motion sem nenhum dos dois
- [x] Verificação fora do repositório: E2E da seção atualizado (ordem da entrada por amostragem, livro alinhado ao ponto em 390/768/1024/1440px e no resize, micro-movimento vivo e pausado fora da tela, rótulos sem sobreposição com seis anos, reduced motion parado) e regressões 07A, 07B, 08, 09A e 09B

### Escala mensal acumulada (após a aprovação do redesign)

Mesma direção visual; muda só a escala do gráfico. Sem mudança em banco,
consultas ou referência.

- [x] Decisão registrada (`decisions.md`, 016); `docs/design.md` e `docs/banco-de-dados.md` (texto sobre `finished_at`) atualizados
- [x] `summarizeReading` devolve `months`: total acumulado no fim de cada mês, do mês da primeira conclusão datada até o mês atual, sem lacunas; referência acumulada de 3,96 / 12 por mês; acima = estritamente maior no mesmo mês; concluídos sem data só no total
- [x] Gráfico: linha do zero (começo do primeiro mês) até o mês atual, pontos só nos meses com conclusões, referência como trajetória tracejada, dourado recortado acima dela, livro e halo no mês atual
- [x] Eixo: meses (a cada 1, 2, 3 ou 6, pelo espaço disponível; o atual sempre) e anos (o atual e o primeiro sempre), com uma marca no começo de cada ano; alternativa textual com todos os meses
- [x] Textos de "ano" para "mês" (visitante, vazio, livros sem data); entrada dos rótulos do eixo com duração limitada
- [x] Checks: `typecheck`, `lint`, `build` (Home continua estática) e `git diff --check`
- [x] Eixo de no mínimo 12 meses (`decisions.md`, 017): meses seguintes ao atual só no gráfico, apagados, com a referência (`referenceAt`) chegando a 3,96; linha, pontos, dourado e livro só até o mês atual; leitor de tela só com o histórico e legenda explicando o eixo
- [x] Verificação fora do repositório: 20 testes unitários da série (23 com `referenceAt` e o eixo); E2E da seção reescrito para a série mensal (contra `next start` local na porta 3100, porque a 3000 estava com o dev server do usuário); regressões 07A, 07B, 08, 09A e 09B; pgTAP

Pendências:

- [x] Primeira revisão visual do usuário (gerou o redesign)
- [x] Revisão visual do redesign pelo usuário (aprovada)
- [x] Revisão da escala mensal: referência "perto da base" diagnosticada (série de um mês numa conta real; cálculo e geometria corretos) e resolvida com o eixo mínimo de 12 meses (abaixo)
- [ ] Revisão visual do eixo de 12 meses pelo usuário
- [ ] Crédito da referência no Footer (`plan.md`, seção 30), lendo `READING_REFERENCE`

## Fase 10 — Footer

- [ ] `src/components/footer/`

## Etapas finais

- [ ] Responsividade e acessibilidade
- [ ] Performance
- [ ] Testes
- [ ] Revisão final
- [ ] Deploy (Vercel)
