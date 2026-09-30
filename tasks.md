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

- [ ] `src/lib/supabase/` e `supabase/migrations/`
- [ ] `.env.example` (adicionar `!.env.example` ao `.gitignore`, que hoje ignora `.env*`)
- [ ] Row Level Security
- [ ] `docs/banco-de-dados.md`

## Fase 06 — Autenticação

- [ ] `src/components/auth/` com Supabase Auth
- [ ] Substituir os placeholders de `AccountActions` por destinos reais e pelo menu do usuário autenticado

## Fase 07 — My Library

- [ ] `src/components/library/`, `bookshelf/`, `book/`
- [ ] Preencher o `href` de My Library em `navigation.ts`; seção com `scroll-margin-top` para o header fixo
- [ ] Substituir o conteúdo provisório da seção após o Hero (`page.tsx`), mantendo o início em `black`
- [ ] Rolagem suave pontual até a seção (sem `scroll-behavior` global)

## Fase 08 — Gerenciamento de Livros

- [ ] `src/components/book-modal/` e `src/lib/books/`
- [ ] Modal com `<dialog>` nativo, seguindo o padrão de `MobileMenu.tsx` (`decisions.md`, 003)

## Fase 09 — Reading Progress

- [ ] `src/components/reading-progress/`
- [ ] Preencher o `href` de Reading Progress em `navigation.ts`

## Fase 10 — Footer

- [ ] `src/components/footer/`

## Etapas finais

- [ ] Responsividade e acessibilidade
- [ ] Performance
- [ ] Testes
- [ ] Revisão final
- [ ] Deploy (Vercel)
