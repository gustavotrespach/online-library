# Decisões Arquiteturais — Online Library

Registro das decisões que precisam ser preservadas em implementações
futuras (ver `AGENTS.md`, seção 27).

------------------------------------------------------------------------

## 001 — Tokens visuais no `@theme` do Tailwind, sem as escalas padrão

**Data:** 2026-09-29 · **Fase:** 02 — Sistema Visual

### Contexto

O sistema visual define paleta, pesos tipográficos e raios próprios. O
Tailwind v4 traz escalas padrão extensas (cores `neutral-*`, `amber-*`…,
pesos de 100 a 900, raios até `4xl`) que permitiriam a cada componente
fugir do sistema sem que isso fosse percebido.

### Decisão

- `src/app/globals.css` é a **fonte única** dos tokens visuais, definidos
  com `@theme static`.
- As escalas padrão de **cores**, **pesos** e **raios** do Tailwind são
  removidas (`--color-*: initial`, `--font-weight-*: initial`,
  `--radius-*: initial`) e substituídas somente pelos tokens do projeto.
- Espaçamento e breakpoints usam as escalas nativas do Tailwind, que já
  correspondem à especificação (múltiplos de 4px; 768px e 1024px).
- `static` garante que todas as variáveis existam no CSS final mesmo sem
  classe que as utilize, permitindo `var(--color-…)` em CSS próprio e em
  animações (GSAP).

### Motivo

Impedir, pela própria ferramenta, valores fora do sistema: uma classe
fora da paleta simplesmente não é gerada.

### Alternativas consideradas

- **Manter as escalas padrão e confiar em convenção:** mais flexível,
  mas o desvio não é detectável.
- **Arquivo de tokens em TypeScript ou `tailwind.config`:** desnecessário
  no Tailwind v4, cuja configuração é feita em CSS.

### Consequências

- Classes como `text-neutral-500`, `bg-white`, `font-bold` e
  `rounded-2xl` não existem neste projeto.
- Um novo token deve ser adicionado em `globals.css` e ter seu uso
  descrito em `docs/design.md`.
- Valores que não aceitam variáveis CSS (ex.: `themeColor` no
  `viewport` do layout) repetem o hex correspondente e devem ser
  atualizados junto com o token.

------------------------------------------------------------------------

## 002 — Itens de navegação sem destino são placeholders

**Data:** 2026-09-29 · **Fase:** 03 — Navbar

### Contexto

A Navbar precisa exibir My Library, Reading Progress, Entrar e
Cadastrar, mas as seções e a autenticação só existem em fases
posteriores. Não devem ser criadas rotas falsas nem links que não levam
a lugar algum.

### Decisão

`NavigationItem.href` aceita `null`. Nesse caso, `NavigationLink`
renderiza um `<a>` sem `href`, que no HTML representa um placeholder de
link: não é focável nem clicável, aparece em `text-foreground-subtle` e
é anunciado com "(em breve)". Quando o destino existir, basta preencher
o `href` em `src/components/navbar/navigation.ts` (ou em
`AccountActions`, para autenticação).

### Motivo

Mostra a estrutura final da navegação sem simular funcionalidade
inexistente, usando semântica nativa do HTML.

### Alternativas consideradas

- **Links para âncoras ainda inexistentes:** clicáveis, mas sem efeito.
- **Criar páginas provisórias:** contraria o `AGENTS.md` (seção 8).
- **Ocultar os itens:** esconde a estrutura planejada da navegação.

### Consequências

Nenhum item pode ficar com `href: null` depois que seu destino for
implementado. As seções de destino precisarão de `scroll-margin-top`
equivalente à altura do header fixo.

------------------------------------------------------------------------

## 003 — Overlays com `<dialog>` nativo

**Data:** 2026-09-29 · **Fase:** 03 — Navbar

### Contexto

O menu mobile exige foco contido, conteúdo de fundo inerte, fechamento
com Esc e retorno do foco. O modal de livros (Fase 08) terá as mesmas
necessidades.

### Decisão

Menus em tela cheia e modais usam o elemento `<dialog>` aberto com
`showModal()`. O React controla apenas o estado aberto/fechado; o
comportamento modal é do navegador.

### Motivo

O navegador já oferece top layer, `inert` no restante da página, Esc e
restauração de foco, sem dependências adicionais e sem reimplementar
focus trap.

### Alternativas consideradas

- **Biblioteca de componentes acessíveis (Radix, Headless UI):** resolve
  o problema, mas adiciona uma dependência que o navegador já cobre.
- **Focus trap manual com `div`:** mais código e mais pontos de falha.

### Consequências

- Novos overlays devem seguir o padrão de `MobileMenu.tsx`.
- Um overlay oculto por CSS em algum breakpoint precisa ser fechado
  quando o breakpoint mudar, para não deixar a página inerte.

------------------------------------------------------------------------

## 004 — Hero: vídeo controlado pelo scroll com GSAP ScrollTrigger

**Data:** 2026-09-30 · **Fase:** 04 — Hero

> Atualizada pela decisão 005: o scrub usa `hero-scrub.mp4` e o Hero
> passou a ter um estado idle antes do primeiro scroll.

### Contexto

O Hero é uma cena pré-renderizada (`public/assets/hero/hero.mp4`:
1280×720, H.264, 9,04s, 24 fps, sem áudio, termina em preto). O scroll
deve avançar e retroceder a cena, com o Hero fixado até o último quadro.

### Decisão

- **O vídeo é a animação.** Nenhum efeito visual da cena é recriado em
  CSS/SVG; o código só controla o tempo. O vídeo nunca é reproduzido com
  `play()` nem `autoplay`.
- **Scroll → `currentTime`.** Uma timeline GSAP com ScrollTrigger
  (`pin: true`, `scrub: 0.5`) anima um playhead normalizado (0–1);
  `createVideoScrubber` converte esse valor em `currentTime` aplicando
  somente o alvo mais recente quando o seek anterior termina, sem
  enfileirar seeks.
- **Distância de scroll: 3 alturas de viewport** (≈ 3s de vídeo por
  tela), ajustável em `SCROLL_DISTANCE_IN_VIEWPORTS` no `Hero.tsx`.
- **Navbar:** a Navbar existente (`#site-header`) é animada pela mesma
  timeline (opacidade e deslocamento, entre 2% e 14% da timeline),
  configurável em `NAVBAR_REVEAL`. Sobre o Hero, o header fica
  transparente (`data-over-hero`) e uma faixa escura no topo do Hero
  garante contraste sobre os quadros claros.
- **Reduced motion:** via `gsap.matchMedia()`. Nada é criado: sem pin,
  sem timeline e sem download do vídeo (`preload="none"`); o Hero exibe
  o poster (primeiro quadro, `hero-poster.jpg`) e a Navbar fica no
  estado padrão.

### Motivo

- Seek por `currentTime` é naturalmente reversível e mantém um único
  asset de vídeo, sem sequência de imagens.
- Medição no Chrome com o asset atual: **o vídeo tem um único keyframe
  (quadro 1 de 217)**, então cada seek decodifica desde o início —
  latência de ~6ms no começo a ~77ms no fim. Seeks enfileirados
  acumulariam atraso; aplicar apenas o alvo mais recente mantém o vídeo
  alinhado ao scroll (diferença < 1 quadro após o scroll parar).
- 3 viewports equilibram ritmo cinematográfico e esforço de scroll; 1
  viewport pareceria arrastar um vídeo, e mais de 4 tornaria a abertura
  cansativa.

### Alternativas consideradas

- **`gsap.to(video, { currentTime })` direto:** dispara um seek por
  tick, que se acumulam com este asset.
- **Sequência de imagens em canvas:** scrub mais fluido, mas centenas de
  requests e muito mais peso; o vídeo continua sendo o asset principal.
- **Reduzir a animação no reduced motion:** ainda exigiria atravessar a
  timeline; o poster estático respeita melhor a preferência.

### Consequências

- Uma versão do vídeo com keyframes frequentes (arquivo novo, sem
  alterar o original) deixaria o scrub mais fluido, principalmente em
  celulares. Trocar o asset exige só mudar `HERO_VIDEO` no `Hero.tsx`.
- Um asset mobile futuro também entra por `HERO_VIDEO`, sem mudar a
  timeline.
- A Navbar nasce oculta em páginas com o Hero por uma regra CSS
  (`body:has([data-hero])`), evitando que ela pisque antes da
  hidratação. Sem JavaScript, ela permanece oculta nessas páginas.
- O header não pode ter transições CSS de opacity/transform, e novas
  seções após o Hero não precisam compensar o pin (o ScrollTrigger
  reserva o espaço).

------------------------------------------------------------------------

## 005 — Hero: estado idle bidirecional e assets de vídeo

**Data:** 2026-09-30 · **Fase:** 04 — Hero

### Contexto

O Hero tem dois estados: **idle** (loop sutil, câmera parada) e
**scrub** (a cena segue o scroll). O idle é o estado de repouso do Hero
e retorna quando o usuário volta ao início do scroll.

Na preparação dos assets:

- `hero-scrub.mp4` não existia; o `hero.mp4` tem um único keyframe, com
  seeks de ~50–70ms (decisão 004).
- O primeiro idle recebido (`mp4v`, MPEG-4 Part 2) não era reproduzido
  por Chrome, Edge e Firefox. Ele foi substituído pelo
  `hero-idle.webm`, fornecido pelo usuário.

### Decisão

**Assets** (`public/assets/hero/`):

| Arquivo | Origem | Formato |
| --- | --- | --- |
| `hero-idle.webm` | fornecido pelo usuário | WebM VP9, 1280×720, 5s, sem áudio, loop sem emenda |
| `hero-scrub.mp4` | gerado do `hero.mp4` com AVFoundation (macOS) | H.264 High, 1280×720, 24 fps, keyframe a cada 6 quadros, sem B-frames, qualidade 0.75, `moov` no início, sem áudio |

`hero.mp4` permanece preservado e não é referenciado pelo código. O
idle MP4 anterior fica em `assets-source/hero/hero-idle.original.mp4`,
fora de `public/`, e não é mais usado.

**Comportamento:**

- Dois `<video>` sobrepostos: o idle (em cima, `loop`) e o scrub
  (embaixo). Nenhum tem `autoplay` no HTML; o idle é iniciado com
  `play()` somente com `prefers-reduced-motion: no-preference`. Se o
  autoplay for negado, o poster permanece.
- O download do scrub começa quando o idle já está tocando (ou quando o
  autoplay é negado), priorizando o que aparece primeiro.
- **Idle → scrub:** no `onUpdate` do ScrollTrigger do pin, quando a
  posição real do scroll passa do início do Hero. O idle é pausado e
  some em um fade de 0,4s; o scrub segue o scroll.
- **Scrub → idle:** no `onUpdate` do playhead da timeline, quando o
  scroll está no início do Hero **e** o playhead suavizado chegou a menos
  de 0,1% da timeline (`currentTime` < ~0,01s). O idle volta a tocar e
  aparece em um fade de 0,4s, continuando o loop de onde parou.
- O scrub nunca é reproduzido, apenas posicionado; o idle só toca no
  estado idle. Os dois vídeos nunca tocam ao mesmo tempo.
- Nenhum listener de scroll, ScrollTrigger ou timeline adicional: os dois
  sentidos usam callbacks já existentes, e o estado fica em uma variável
  de closure (sem estado React).
- Reduced motion: nenhum vídeo é baixado ou reproduzido; apenas o poster.

### Motivo

- Keyframes a cada 6 quadros reduzem o seek para ~3ms (máximo ~5ms) com
  PSNR de 42–52 dB em relação ao original (visualmente equivalente), e o
  arquivo cai de 7,9MB para 3,9MB.
- Elementos separados evitam a tela vazia que a troca de `src` de um
  único `<video>` causaria, e mantêm o idle pronto para voltar sem novo
  download.
- `progress > 0` não indica scroll: no topo da página o ScrollTrigger usa
  `start = -0.001` e chama `onUpdate` durante o refresh. Pelo mesmo
  motivo, a timeline nunca chega a exatamente 0 no topo, então o retorno
  usa um limiar (0,1%) em vez de `onReverseComplete`.
- Esperar o playhead suavizado alcançar o início evita que o idle
  reapareça enquanto o scrub ainda está retrocedendo.

### Alternativas consideradas

- **Um único `<video>` trocando o `src`:** tela vazia ou poster a cada
  troca de estado.
- **Idle somente na primeira visita ao topo:** deixava o Hero congelado
  no quadro 0 do scrub ao voltar; o idle é o estado de repouso.
- **ffmpeg para gerar o scrub:** mesmo resultado, mas exigiria instalar
  uma dependência de sistema; o AVFoundation já está disponível.

### Consequências

- Os vídeos baixados na página inicial somam ~4,1MB (idle 0,24MB +
  scrub 3,9MB), contra 7,9MB do `hero.mp4`.
- Um novo asset de scrub precisa de keyframes frequentes e `moov` no
  início. O idle depende de suporte a WebM VP9; onde não houver, o
  poster é exibido.
- Idle e quadro 0 do scrub têm enquadramentos levemente diferentes; o
  fade suaviza a troca, mas assets futuros devem idealmente coincidir.

------------------------------------------------------------------------

## 006 — Modelo de dados inicial: `books` compartilhado e `user_books`

**Data:** 2026-09-30 · **Fase:** 05A — Supabase Database Foundation

### Contexto

A biblioteca precisa guardar dados do livro (título, autor, capa…) e
dados pessoais de leitura (progresso, datas, opinião), isolados por
usuário e protegidos pelo banco. A identidade já é fornecida pelo
Supabase Auth (`auth.users`), e a autenticação só será implementada na
Fase 06.

### Decisão

- Schema versionado em `supabase/migrations/`; nada é criado pelo
  Dashboard.
- Três tabelas: `profiles` (1:1 com `auth.users`), `books` (dados do
  livro, compartilháveis) e `user_books` (um livro na biblioteca de um
  usuário, com `progress`, `started_at`, `finished_at` e `feedback`).
- `profiles.id` e `user_books.user_id` referenciam **`auth.users.id`
  diretamente**, e não um ao outro.
- Status de leitura derivado de `progress` (0–100); sem `status` nem
  `is_read`.
- Exclusão: `cascade` de `auth.users` para `profiles` e `user_books`;
  `restrict` de `books` para `user_books`.
- Privilégios explícitos (`revoke`/`grant`) e RLS em todas as tabelas:
  `anon` sem acesso; cada usuário lê e altera somente o próprio profile
  e os próprios `user_books`; `books` somente leitura para usuários
  autenticados.

Detalhes: `docs/banco-de-dados.md`.

### Motivo

- Separar dados do livro de dados pessoais permite que um mesmo livro
  esteja em várias bibliotecas sem duplicar progresso ou opinião em
  `books`.
- Referenciar `auth.users` direto permite policies simples
  (`auth.uid() = user_id`) e não exige um trigger de criação de profile
  antes da Fase 06.
- `restrict` em `books` impede que a remoção de um livro apague
  silenciosamente a biblioteca de outros usuários.
- Privilégios explícitos tornam o acesso reproduzível e independente de
  mudanças nos defaults da plataforma; RLS garante o isolamento por
  linha.

### Alternativas consideradas

- **`user_id` referenciando `profiles.id`:** exigiria que todo usuário
  tivesse profile antes de usar a biblioteca.
- **Livro com dados de leitura em uma única tabela por usuário:**
  duplicaria os dados do livro e dificultaria a futura deduplicação de
  edições.
- **`isbn` único em `books`:** rejeitado enquanto não houver estratégia
  de normalização de edições.
- **Policies de escrita em `books` para usuários:** adiadas até a
  definição do fluxo de criação de livros com as APIs externas.

### Consequências

- Nenhum usuário consegue criar livros ainda. A Fase 08 precisa definir
  como `books` é escrito (e revisar grants/policies) antes de a
  biblioteca adicionar livros.
- Remover um livro exige remover antes os `user_books` que o
  referenciam.
- O profile precisa ser criado explicitamente na Fase 06 (trigger ou
  fluxo da aplicação, a decidir).
- Tipos TypeScript do banco serão gerados pela Supabase CLI na Fase 05B,
  junto com o cliente que os consome.

------------------------------------------------------------------------

## 007 — Clientes Supabase e tipos gerados do banco

**Data:** 2026-09-30 · **Fase:** 05B — Supabase Client

### Contexto

O website precisa acessar o Supabase a partir de Client Components e do
servidor (Server Components, Server Functions, Route Handlers). A
autenticação da Fase 06 dependerá de sessão em cookies, e o código
precisa de tipos que correspondam ao schema da Fase 05A.

### Decisão

- Bibliotecas oficiais: `@supabase/supabase-js` e `@supabase/ssr`.
- `src/lib/supabase/client.ts` (`createBrowserClient`) para o navegador e
  `src/lib/supabase/server.ts` (`createServerClient`) para o servidor.
  O cliente do servidor é criado a cada chamada, lê e grava cookies pelo
  `cookies()` do Next.js com `getAll`/`setAll`, e importa `server-only`.
- Os dois usam somente `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, lidas em
  `src/lib/supabase/env.ts`, que falha com mensagem clara se faltarem.
- `src/types/database.ts` é gerado pela Supabase CLI a partir do projeto
  remoto e não é editado manualmente.
- Não foram criados `src/types/book.ts` nem `src/types/user.ts`: ainda
  não há código de domínio que os use, e o arquivo gerado já oferece
  `Tables<"books">`, `TablesInsert<…>` e `TablesUpdate<…>`.

### Motivo

- `@supabase/ssr` é o caminho oficial para App Router: a sessão fica em
  cookies e é visível tanto no navegador quanto no servidor.
- Um cliente de servidor por request evita compartilhar a sessão de um
  usuário com outro; `server-only` impede que esse módulo chegue a um
  Client Component.
- Tipos gerados do banco real não divergem do schema; tipos manuais
  duplicariam as migrations.

### Alternativas consideradas

- **Somente `@supabase/supabase-js` (`createClient`):** guarda a sessão
  em `localStorage`, invisível para o servidor.
- **API `get`/`set`/`remove` de cookies:** deprecated no `@supabase/ssr`.
- **Tipos escritos à mão ou aliases de domínio agora:** duplicação sem
  consumidor.

### Consequências

- Server Components não podem gravar cookies: o `setAll` ignora o erro
  nesse contexto. A renovação da sessão precisará do `proxy.ts`
  (substituto do `middleware` no Next.js 16) na Fase 06.
- Toda nova migration aplicada no remoto exige regenerar
  `src/types/database.ts` (comando em `docs/banco-de-dados.md`).
- Aliases de domínio (ex.: status derivado de `progress`) devem ser
  criados quando houver código que os use, a partir dos tipos gerados.
