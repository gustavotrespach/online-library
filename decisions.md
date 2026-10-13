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

> Atualizada pela decisão 011: a escrita em `books` passou a ser feita pela
> função `add_book_to_library`, e `isbn` passou a ser único (ISBN-13).

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

------------------------------------------------------------------------

## 008 — Autenticação: profile por trigger e confirmação por `token_hash`

**Data:** 2026-10-02 · **Fase:** 06B — Supabase Auth (planejamento e preparação)

> Atualizada pela decisão 009: o host local foi alinhado a `localhost` e
> o template de confirmação local foi configurado.

### Contexto

A auditoria da Fase 06A levantou as decisões necessárias antes do Auth
básico (e-mail e senha). O Auth remoto exige confirmação de e-mail, então
o `signUp` não devolve sessão, e o link de confirmação pode ser aberto em
outro navegador ou dispositivo.

### Decisão

**Profile e nome**

- O profile é criado pelo trigger `users_create_profile` (`after insert`
  em `auth.users`), que chama `public.create_profile_for_new_user()`:
  `security definer`, `search_path` vazio, sem `EXECUTE` para `public`,
  `anon`, `authenticated` e `service_role`. Um erro no trigger faz o
  cadastro falhar: não existe usuário sem profile.
- O nome é **obrigatório** no cadastro e vai em
  `signUp({ options: { data: { display_name } } })`. A chave
  `display_name` é a única lida. O trigger remove espaços nas
  extremidades, trunca em 80 caracteres e grava `null` se sobrar vazio.
- Depois do cadastro, a fonte de verdade é `profiles.display_name`. A
  metadata do Auth é só o transporte inicial: não é sincronizada, não é
  usada na interface e nunca serve para autorização.

**Configuração**

- Confirmação de e-mail ativa no remoto e no `supabase/config.toml`
  (`auth.email.enable_confirmations = true`).
- Senha: mínimo de 6 caracteres, o mesmo do remoto, sem política extra.

**Rotas e confirmação**

- Rotas do Auth básico: `/entrar`, `/cadastrar` e `/auth/confirm`.
- O link do e-mail de confirmação usa `token_hash`. Template de
  confirmação:
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
- `/auth/confirm` é um Route Handler (GET) que cria o server client e
  chama `supabase.auth.verifyOtp({ token_hash, type })`, com
  `type: "email"`. Em caso de sucesso, a sessão é gravada nos cookies
  pelo `setAll`, e o handler redireciona para `/`.
- Como o link é montado a partir do `SiteURL`, o fluxo não depende de
  `emailRedirectTo` nem da lista de Redirect URLs.

**Sessão e autorização**

- `src/proxy.ts` só renova e sincroniza a sessão; não protege rotas na
  Fase 06.
- Cada Server Function ou Route Handler sensível verifica a autenticação
  com `getClaims()` (JWT ES256 validado localmente) ou `getUser()`
  (consulta o Auth). Nunca `getSession()` no servidor.
- A Navbar lê o estado de Auth no cliente, para a Home continuar
  estática.
- Autenticação (quem é o usuário) é do Supabase Auth. Autorização (o que
  ele pode acessar) é do RLS. Metadata, estado da Navbar e dados
  enviados pelo navegador nunca autorizam nada.

### Motivo

- O trigger cria o profile na mesma transação do usuário,
  independentemente de sessão, confirmação, navegador ou fluxo de
  cadastro.
- O `token_hash` não depende do code verifier do PKCE, que só existe no
  navegador que fez o cadastro.

Verificado em um stack local (GoTrue v2.197.0, a mesma versão registrada
no remoto pelo `supabase link`), com o template acima e o `createServerClient` do `@supabase/ssr`
sem cookies, simulando outro navegador:

- `verifyOtp` criou a sessão e gravou o cookie `sb-<ref>-auth-token`;
- o `getClaims()` do request seguinte retornou o usuário;
- reusar o link ou usar um `token_hash` inválido resultou em
  `otp_expired`.

### Alternativas consideradas

- **Profile criado pela aplicação:** sem sessão após o `signUp`, exigiria
  criação tardia e permitiria usuário sem profile.
- **Callback PKCE padrão (`exchangeCodeForSession`):** falha quando o
  link é aberto em outro navegador ou dispositivo.
- **Nome sincronizado entre metadata e `profiles`:** duas fontes de
  verdade.

### Consequências

- O template de confirmação precisa ser configurado no remoto
  (Dashboard) e no local (`config.toml` + arquivo do template) antes do
  fluxo funcionar. Até lá, o template padrão envia um link
  `/auth/v1/verify` incompatível com `/auth/confirm`.
- O `SiteURL` define o domínio do link: o local usa
  `http://127.0.0.1:3000`, e o remoto, `http://localhost:3000`. Cookies
  de `127.0.0.1` não valem em `localhost`, então o desenvolvimento local
  precisa usar o mesmo host do `SiteURL`.
- Comportamentos observados no GoTrue v2.197.0, que a interface precisa
  tratar:
  - login antes da confirmação: erro `email_not_confirmed`;
  - cadastro com e-mail já confirmado: erro `User already registered`;
  - cadastro repetido com confirmação pendente: sem erro, com reenvio do
    e-mail;
  - senha abaixo do mínimo: erro `weak_password`;
  - envios para o mesmo e-mail limitados por `max_frequency` (1 min no
    remoto).
- Segundo a documentação do Supabase, sem SMTP próprio o serviço de
  e-mail padrão não atende usuários externos (não verificado neste
  ambiente). Um SMTP próprio é requisito antes do uso real.
- A função do trigger não aparece em `src/types/database.ts` (funções
  `returns trigger` não são expostas), então os tipos não mudam.

------------------------------------------------------------------------

## 009 — Auth básico: formulários, estado na Navbar e confirmação

**Data:** 2026-10-05 · **Fase:** 06C — Auth básico

> Atualizada em 2026-10-05: o template remoto foi configurado e o fluxo
> completo foi validado com um cadastro real no remoto (`tasks.md`, 06C).

### Contexto

A Fase 06C implementou cadastro, confirmação, login e logout seguindo a
decisão 008. A implementação exigiu decisões sobre validação, estado de
Auth no cliente, logout e tratamento de links inválidos.

### Decisão

**Formulários**

- Validação com **Zod** (`src/lib/validation/auth.ts`), sem React Hook
  Form: os formulários têm de 2 a 4 campos.
- Os formulários chamam o browser client (`signUp`, `signInWithPassword`)
  em Client Components, sem Server Actions. O próprio Auth valida de
  novo no servidor.
- Os erros do Auth são traduzidos por `error.code`
  (`src/components/auth/authErrorMessage.ts`), nunca pelo texto da
  mensagem.
- Mínimo de senha (6) e limite do nome (80) ficam em constantes, iguais
  ao Supabase e ao trigger.

**Estado de Auth e Navbar**

- Um único `AuthProvider` no layout raiz mantém um só
  `onAuthStateChange` (com cleanup) e busca `profiles.display_name` sob
  RLS. A `AccountActions` (Desktop e Mobile) apenas consome o contexto.
- Enquanto a sessão é lida, a área da conta fica reservada e vazia, sem
  mostrar "Entrar" a quem já está autenticado.
- A Home continua estática: o servidor não lê cookies para montar a
  Navbar.

**Logout**

- Botão "Sair" que chama `signOut({ scope: "local" })`: um POST ao Auth
  que encerra só a sessão deste navegador.
- Não existe rota GET de logout.

**Confirmação e redirects**

- Link inválido, expirado, já usado ou sem parâmetros leva a
  `/entrar?erro=link-invalido`, com um aviso. O Auth responde
  `otp_expired` nos três primeiros casos, então a interface não os
  distingue.
- Não há parâmetro `next`: login e confirmação sempre levam a `/`, o que
  elimina open redirects nesta fase.

**Rotas e proxy**

- `/entrar` e `/cadastrar` ficam no grupo `src/app/(auth)/`, que
  compartilha o layout sem alterar as URLs.
- `/entrar` é renderizada sob demanda porque lê `?erro=`; `/cadastrar` e
  `/` continuam estáticas.
- `src/proxy.ts` usa `updateSession` (`src/lib/supabase/proxy.ts`) em
  todas as rotas, exceto assets estáticos, e só renova a sessão.

**Ambiente local**

- O host local é `http://localhost:3000`, igual ao Site URL do remoto.
- A lista local de Redirect URLs ficou vazia, como no remoto.

### Motivo

- Validar no cliente dá retorno imediato. As regras que importam
  continuam no servidor (Auth e trigger).
- Um único listener evita requisições e estados duplicados entre a
  Navbar desktop e o menu mobile.
- Sem `next`, não há destino controlado pela URL a validar.

### Alternativas consideradas

- **Server Actions para login e cadastro:** exigiriam sincronizar a
  Navbar manualmente, porque os cookies mudariam fora do browser client.
- **React Hook Form:** desnecessário para formulários tão pequenos.
- **Logout global:** encerraria a sessão em todos os dispositivos sem o
  usuário pedir.

### Consequências

- O browser client usa PKCE, então o `token_hash` do e-mail vem com o
  prefixo `pkce_`. O `verifyOtp({ token_hash, type: "email" })` aceita
  esse formato e cria a sessão sem o code verifier, também em outro
  navegador (verificado em E2E). O cookie
  `sb-<ref>-auth-token-code-verifier` criado no cadastro fica sem uso.
- Todas as rotas passam pelo proxy, que exige as variáveis do Supabase:
  sem `.env.local`, o website não responde.
- O template remoto de confirmação precisa ser igual a
  `supabase/templates/confirmation.html`. Até lá, o e-mail do remoto
  usa o link padrão `/auth/v1/verify`, incompatível com `/auth/confirm`.

------------------------------------------------------------------------

## 010 — Estante real: ordem na sessão, layout por intervalos e drag com Pointer Events

**Data:** 2026-10-06 · **Fase:** 07B — Estante real

> Atualizada pela decisão 011: a ordem passou a ser persistida em
> `user_books.position`, e as capas conhecidas passaram pela otimização do
> Next.js.

### Contexto

A estante aprovada no protótipo (07A) passou a mostrar os livros reais do
usuário, com reordenação por drag-and-drop. O schema atual não tem campo
de ordem, e a escrita em `books` continua fechada (006), então adicionar
livros depende da Fase 08.

### Decisão

**Dados**

- A seção My Library (`src/components/library/LibrarySection.tsx`) é um
  Client Component: a Home continua estática, e o estado de Auth vem do
  `AuthProvider` (009).
- Visitantes não consultam nada. Usuários autenticados carregam
  `user_books` com o livro embutido (`book:books(...)`) pelo browser
  client, uma vez por usuário (`src/lib/books/user-books.ts`). O
  isolamento é do RLS; não há filtro por `user_id` no navegador.
- Tipo de domínio `LibraryBook` (`src/types/book.ts`), derivado dos tipos
  gerados. A estante, o preview e a consulta usam o mesmo tipo.

**Ordem**

- `user_books` não tem coluna de ordem e nenhuma migration foi criada.
  A ordem inicial é a de adição (`created_at`, depois `id`, só como
  critério de exibição) e a reordenação vale **somente para a sessão**.
- A ordem é uma lista explícita de ids, separada da posição física:
  ordem → layout → animação. Persistir a ordem exige uma decisão de
  schema (ex.: coluna de posição em `user_books`) e muda somente o
  `moveBook` da seção.

**Layout**

- Cada prateleira é uma sequência de intervalos livres: a largura útil
  menos a área reservada de cada ornamento (`getShelfIntervals`).
- Uma única regra de encaixe (`packBook`): na ordem da coleção, cada
  livro vai para o primeiro trecho em que cabe inteiro; se não couber na
  sobra, tenta o próximo intervalo e depois a próxima prateleira. Livros
  nunca são comprimidos nem invadem ornamentos, e a ordem nunca é trocada
  para tapar buracos. A sobra fica no fim do intervalo, junto ao
  ornamento ou à ponta da prateleira, e nunca entre dois livros.
- O drag usa a mesma regra (`findDropTarget`): simula a inserção em cada
  posição da ordem e só aceita as que deixam o livro inteiro na
  prateleira apontada, escolhendo a mais próxima. Abaixo da última
  prateleira ocupada, a posição válida é o fim da coleção; fora da
  estante, nenhuma (o livro volta ao lugar).

**Interação**

- Pointer Events + GSAP, sem biblioteca de drag. Um controlador
  imperativo (`createBookDrag.ts`) move o livro segurado fora do React e
  só avisa a estante quando o destino muda; a estante então re-renderiza
  a ordem de pré-visualização e anima os outros livros pelo FLIP já
  existente.
- Mouse e caneta: o drag começa após 4px de movimento. Toque: pressão
  longa (320ms); antes disso, o gesto é rolagem da página
  (`touch-action: pan-y`). Com o livro segurado, um `touchmove` não
  passivo impede a rolagem; perto das bordas da janela a página rola
  sozinha. Esc ou `pointercancel` devolvem o livro.
- Alternativa por teclado: cada livro é um botão focável; as setas para
  a esquerda e para a direita movem o livro uma posição, com anúncio em
  `aria-live`.

**Capas**

- Capas externas usam `next/image` com `unoptimized`: os hosts das capas
  (Google Books, Open Library, Storage) só serão definidos na Fase 08, e
  a otimização exige a lista de `remotePatterns`. Capa ausente ou com
  erro usa um fallback com título, autor e um tom de encadernação
  estável por livro.

### Motivo

- Não há autorização para mudar o schema nesta fase, e usar `created_at`
  ou `updated_at` como ordem distorceria campos com outro significado.
- Uma regra de encaixe única garante que a posição prevista durante o
  drag é exatamente a que o layout produz ao soltar.
- Pointer Events cobrem mouse, toque e caneta; uma biblioteca de drag
  traria um segundo modelo de layout (listas/grades) incompatível com
  intervalos físicos.

### Alternativas consideradas

- **Migration com coluna de posição:** depende de autorização e de uma
  estratégia de reindexação; adiada.
- **Distribuir a sobra entre os livros (justificar a prateleira):**
  reduziria buracos, mas mudaria o espaçamento aprovado na 07A.
- **Preencher a sobra com um livro posterior menor:** trocaria a ordem
  da coleção.
- **dnd-kit ou similar:** dependência extra sem suporte a áreas
  reservadas por ornamentos.

### Consequências

- Recarregar a página volta à ordem de adição até a ordem ser
  persistida.
- Adicionar e remover livros reais fica para a Fase 08; a estante já
  anima entradas e saídas quando os dados mudam.
- Ao definir os hosts das capas (Fase 08), trocar `unoptimized` por
  `remotePatterns`.

------------------------------------------------------------------------

## 011 — Catálogo de livros: busca externa, escrita controlada e ordem persistida

**Data:** 2026-10-06 · **Fase:** 08 — Adicionar e gerenciar livros

### Contexto

A estante precisava ser preenchida com livros reais. A escrita em `books`
estava fechada (006), a ordem da estante valia só para a sessão (010) e o
identificador externo e a deduplicação de edições estavam pendentes
(`docs/banco-de-dados.md`).

### Decisão

**Ordem**

- `user_books.position` (`integer`, `not null`, ≥ 0), única por usuário
  (`unique (user_id, position)`, `deferrable initially immediate`, para
  que uma reordenação troque posições em um único comando). A posição
  pertence à relação usuário ↔ livro, nunca a `books`.
- Registros existentes: posições pela ordem de adição (`created_at`,
  `id`), por usuário.
- Livro novo: o trigger `user_books_set_position` o põe no fim da estante
  do usuário, com um lock por usuário contra inserções simultâneas.
- Reordenação: `set_library_order(uuid[])`, `security invoker`. Grava a
  ordem inteira em um comando, protegida pelo RLS de `user_books`; livros
  fora da lista vão para o fim. A estante grava somente ao soltar o livro
  (ou a cada tecla), uma gravação por vez e sempre a ordem mais recente.
  Se a gravação falhar, volta à última ordem salva e avisa.

**Escrita em `books`**

- Os usuários continuam sem grant de escrita em `books`. O único caminho
  é `add_book_to_library(...)`, `security definer` e `search_path` vazio,
  que:
  - usa sempre `auth.uid()` como dono;
  - valida os dados de novo (título/autor até 300 caracteres, páginas
    1–20000, ano até o ano seguinte, ISBN canônico, origem completa);
  - reutiliza o livro do catálogo pelo ISBN ou pela origem externa, ou o
    cria;
  - adiciona o livro à estante com progresso 0, no fim. Se o livro já
    estiver na estante, devolve `already_in_library` em vez de duplicar
    (`unique (user_id, book_id)` continua sendo a última proteção).
- `books.source` (`google_books` | `open_library`) e `books.source_id`,
  únicos em par; livros manuais não têm origem.
- `books.isbn` passa a ser único e sempre ISBN-13 (um ISBN-10 é
  convertido antes de chegar ao banco). Título e autor nunca identificam
  um livro.
- `books.cover_url` exige HTTPS.
- Remover da estante apaga só `user_books`. O livro fica no catálogo.

**Fontes externas** (`docs/integracoes.md`)

- Busca pelo servidor (Route Handlers autenticados), nunca direto do
  navegador: chave e contato ficam no servidor, e a interface recebe só o
  modelo normalizado.
- Google Books primeiro, somente com `GOOGLE_BOOKS_API_KEY`: sem chave, a
  API respondeu 429 (cota zero para chamadas anônimas). Open Library como
  fallback, ou como fonte única sem a chave.
- Detalhes da edição só ao selecionar um resultado.

**Capas**

- Guardadas como URL, sem download nem re-hospedagem nesta fase.
- `images.remotePatterns` somente para `books.google.com/books/**` e
  `covers.openlibrary.org/b/**`. URLs manuais (qualquer host) são
  exibidas sem o otimizador, porque a alternativa seria um curinga.

### Motivo

- Uma função de escrita deixa a regra de deduplicação e a validação no
  banco, em uma só chamada, sem abrir `books` para inserções arbitrárias.
- `set_library_order` como `security invoker` mantém a reordenação sob o
  RLS existente, sem policy nova.
- ISBN canônico torna a deduplicação de edições confiável: a mesma edição
  tem ISBN-10 e ISBN-13 equivalentes.
- A chave do Google Books não pode ir ao navegador, e o Open Library pede
  um User-Agent identificável, impossível de definir no navegador.

### Alternativas consideradas

- **Grant de `insert` em `books` com policy aberta:** deduplicação e
  validação ficariam no cliente; qualquer usuário gravaria livros
  arbitrários.
- **Posição como `float`/fração (inserção entre vizinhos):** menos
  escritas, mas exige rebalanceamento; a estante tem poucas centenas de
  livros por usuário.
- **Ordem por `created_at`/`updated_at`:** campos com outro significado.
- **Chamar as APIs pelo navegador:** exporia a chave e impediria o
  User-Agent.
- **Re-hospedar capas no Storage:** mais controle e sem dependência
  externa, mas exige bucket, policies e rotina de cópia; adiado.

### Consequências

- Com o ISBN único, uma entrada manual com o ISBN de um livro já
  existente reutiliza o registro do catálogo (os dados digitados não
  sobrescrevem o catálogo).
- Livros sem ISBN e sem origem (manuais) criam um registro por adição.
- Sem `GOOGLE_BOOKS_API_KEY`, todas as buscas usam o Open Library.
- Os limites por IP das APIs são compartilhados entre os usuários, porque
  as chamadas saem do servidor.
- O tipo de retorno de `add_book_to_library` é genérico nos tipos gerados;
  a resposta é validada com Zod em `src/lib/books/user-books.ts`.

------------------------------------------------------------------------

## 012 — Livro aberto: o próprio livro sai da estante, dentro do `<dialog>` nativo

**Data:** 2026-10-06 · **Fase:** 09A — Abertura do livro

### Contexto

Clicar em um livro abria um diálogo comum com os dados (Fase 08). A
interação pedida é física: o livro sai da prateleira, vem para a frente e
abre diante do usuário, e no fechamento volta exatamente ao lugar dele.
Ao mesmo tempo, o livro aberto precisa do comportamento modal (foco
contido, estante inerte, Esc), e a estante não pode ser recalculada nem
perder o drag-and-drop.

### Decisão

- O livro aberto é um **segundo elemento visual** (capa + miolo), dentro
  do mesmo `<dialog>` nativo com `showModal()` (003). O livro da estante
  continua no layout, só invisível enquanto o livro está aberto
  (`openBookId` na estante): os outros livros não se movem e a posição
  original é preservada.
- **Continuidade (FLIP):** ao abrir, o retângulo do livro da estante
  (`captureBookOrigin`) vira o transform inicial do livro aberto, que
  parte exatamente de lá. O estado final é o layout do diálogo (livro
  aberto no centro); ao fechar, o retângulo é lido de novo e o livro
  volta para onde a estante está agora (ex.: depois de um resize).
- **Representação:** CSS 3D, sem imagens de páginas. A capa gira na
  lombada (`rotateY` até -180°) e a face interna dela vira a página da
  esquerda, com a mesma capa (`BookCover`, inclusive a escala de cinza do
  progresso e o fallback). A página da direita é papel (`paper`) com os
  dados; bordas de páginas, dobra e sombras com gradientes.
- **Animação:** GSAP, em etapas separadas (`open-book-motion.ts`): sair da
  estante, vir para a frente, abrir; fechar e voltar. O fechamento parte
  do estado atual, então interromper a abertura (Esc, fechar, clique fora)
  é seguro. Reduced motion abre e fecha direto no estado final.
- **Fechamento animado com `<dialog>`:** o Esc (`cancel`) só pede o
  fechamento; o diálogo sai quando o livro está de volta. Se o navegador
  fechar o diálogo à força (um segundo Esc), o livro volta sem animar.
- **Foco:** vai para o título do livro aberto ao abrir e volta para o
  livro na estante ao fechar (ou para "Adicionar livro", se ele foi
  removido).
- **Remover:** o livro fecha e volta para a estante, e então a remoção
  segue como antes (saída animada da estante, restauração em caso de
  falha).

### Motivo

- Um clone no `<dialog>` fica acima de tudo (top layer) sem mexer no
  layout da estante, nos transforms do drag nem nos `overflow` dos
  ancestrais; mover o próprio nó da estante exigiria tirá-lo do layout.
- O `<dialog>` nativo já deixa a estante inerte: nenhum livro pode ser
  arrastado ou clicado enquanto um livro está aberto, sem código extra no
  drag.
- CSS 3D cobre capa, páginas e profundidade sem dependências nem assets.

### Alternativas consideradas

- **Animar o próprio `<li>` da estante:** o livro teria de sair do layout
  (reflow) e conviver com os transforms do FLIP e do drag.
- **Modal comum com fade:** não dá a continuidade espacial pedida.
- **Three.js ou biblioteca de flip de páginas:** dependência pesada para
  um único objeto.
- **Página da esquerda em papel, com a capa reduzida:** mais "real", mas a
  capa deixaria de ser o lado esquerdo do livro aberto, como pedido.

### Consequências

- O livro aberto mostra a capa cerca de 3× maior que na estante: capas de
  origem pequenas (ex.: miniatura `zoom=1` do Google Books) aparecem
  suaves. Para não piscar, a imagem da estante (já carregada) fica por
  baixo até a versão maior carregar.
- Um livro aberto pede um commit da estante (o lugar dele fica vazio),
  mas sem recalcular o layout nem animar outros livros.
- A edição (progresso, dados) entra na página da direita em outra fase.

------------------------------------------------------------------------

## 013 — Leitura no livro aberto: páginas lidas, progresso derivado e regras no banco

**Data:** 2026-10-06 · **Fase:** 09B — Edição do livro, progresso e feedback

### Contexto

O livro aberto (012) passou a registrar a leitura: progresso, páginas
lidas e feedback pessoal. `user_books` já tinha `progress` (0–100, usado
pela capa da estante), `started_at`, `finished_at` e `feedback` (até 5000
caracteres), mas as datas nunca eram preenchidas. Informar a leitura em
páginas ("137 de 320") é mais natural que em porcentagem, e a escrita
direta em `user_books` (sob RLS) já é permitida pelos grants, então
qualquer regra que só existisse no website poderia ser contornada.

### Decisão

**Modelo**

- Nova coluna `user_books.pages_read` (`integer`, opcional, `>= 0`).
- **Livro com páginas** (`books.pages` preenchido): `pages_read` é a
  entrada do usuário e `progress` é derivado dela, inteiro de 0 a 100:
  0 só sem nenhuma página lida, 100 só com todas, e entre 1 e 99 no meio
  (arredondado; 1 página de 1000 já é "lendo", 999 de 1000 ainda não é
  "concluído"). `progress` continua sendo o que a estante e o status usam.
- **Livro sem páginas**: `pages_read` fica nulo e `progress` é informado
  diretamente, em porcentagem. Não existe total fictício.
- Não há dois valores independentes: um único trigger mantém os dois
  coerentes.

**Regras no banco** — trigger `user_books_sync_reading` (`before insert or
update`, função `sync_user_book_reading()`, `security invoker`,
`search_path` vazio, sem `EXECUTE` para os papéis da API). Vale para o
website, para as funções existentes e para a escrita direta sob RLS:

- `pages_read` acima de `books.pages`, ou informado para um livro sem
  páginas, é recusado (SQLSTATE `22023`); negativo é recusado pela
  constraint (`23514`).
- Um `progress` gravado diretamente num livro com páginas vira as páginas
  equivalentes (`round(pages × progress / 100)`), e o progresso é
  recalculado a partir delas.
- `started_at`: preenchido quando o progresso sai de 0 pela primeira vez;
  nunca sobrescrito nem apagado (voltar a 0% mantém o início).
- `finished_at`: preenchido ao chegar a 100%; limpo ao sair de 100%.
- As datas só mudam junto com o progresso: o cliente não as define.
- `feedback`: espaços nas pontas removidos; vazio vira `null`. Continua
  privado: só o RLS existente de `user_books` dá acesso a ele.

**Gravação**

- Uma única atualização pelo browser client (`updateReading` em
  `src/lib/books/user-books.ts`): `update … select` em `user_books`, sob o
  RLS existente (só as linhas do próprio usuário), sem `user_id` vindo do
  cliente. A resposta já traz os valores finais (progresso derivado,
  feedback aparado), que atualizam o estado local da estante sem
  recarregar a biblioteca.
- Validação com Zod antes de enviar (`src/lib/validation/book.ts`:
  páginas lidas, porcentagem, feedback); o banco repete as regras.
- Salvamento explícito: "Salvar progresso" e "Salvar feedback", cada um
  com o seu estado (não salvo, salvando, salvo, erro). "Salvar e fechar"
  grava as duas partes na mesma atualização. Fechar com alterações não
  salvas pergunta antes (Salvar e fechar, Descartar, Cancelar).

**Registros existentes (migration)**

- `pages_read = round(books.pages × progress / 100)` nos livros com
  páginas; nulo nos demais. `progress` e `updated_at` não mudam.
- Datas não são inventadas: livros que já estavam em 100% continuam sem
  `finished_at` até a próxima mudança de progresso.

### Motivo

- Páginas são o que o usuário sabe informar com precisão; a porcentagem
  derivada mantém compatíveis a capa da estante e o status.
- Um trigger cobre todos os caminhos de escrita sem abrir mão do RLS nem
  criar uma função `security definer`: o usuário já pode atualizar as
  próprias linhas, e as regras precisam valer também nesse caso.
- O RLS de `user_books` já é a autorização; um Route Handler ou Server
  Action só repetiria a mesma escrita com um passo a mais.

### Alternativas consideradas

- **`progress` como fonte e páginas derivadas:** perde a informação exata
  que o usuário digitou.
- **`progress` como coluna gerada:** colunas geradas não podem ler
  `books.pages`, que está em outra tabela.
- **Função `update_reading` (RPC):** as regras ficariam fora da escrita
  direta, que continua permitida; exigiria revogar grants de colunas.
- **Route Handler ou Server Action:** sem ganho de segurança sobre o RLS,
  com um request a mais.
- **Autosave:** gravações frequentes e estado menos claro para o usuário;
  o salvamento explícito foi o pedido.

### Consequências

- Em livros com poucas páginas, um progresso gravado diretamente se ajusta
  ao valor possível em páginas (ex.: 50% de um livro de 3 páginas vira
  2 páginas, 67%).
- A contagem anual de livros concluídos (Reading Progress) deve usar
  `finished_at` e tratar os livros concluídos antes desta migration, que
  não têm data.
- O trigger só consulta `books.pages` quando o progresso ou as páginas
  mudam; reordenar a estante não paga esse custo.

## 014 — Reading Progress: contagem anual derivada da estante

**Data:** 2026-10-07 · **Fase:** Reading Progress (`plan.md`, seções 27–29)

### Contexto

A seção Reading Progress mostra quantos livros o usuário concluiu a cada
ano, ao lado da referência estatística do `plan.md` (seção 28). Os dados já
existem: `user_books.progress` (100 = concluído) e `finished_at`, mantido
pelo trigger da Fase 09B (013). A estante, logo acima na Home, já carrega
todas as linhas de `user_books` do usuário sob RLS e atualiza o estado
local a cada leitura salva. Livros que já estavam em 100% antes da
migration da 09B não têm `finished_at`, e nenhuma data foi inventada para
eles.

### Decisão

**Fonte dos dados**

- A seção é derivada dos livros que a estante já carregou (a mesma
  consulta de `fetchLibraryBooks`, agora com `finished_at`), sem outra
  consulta e sem tabela de histórico. `LibrarySection` renderiza a seção
  logo depois da estante e passa os livros e o estado (carregando,
  visitante, erro). Visitantes não consultam nada.
- A transformação fica em `src/lib/books/reading-progress.ts`
  (`summarizeReading`), uma função pura e testada.

**Contagem**

- Conta como concluído: `progress = 100`. Adicionar, ter feedback, ter
  `started_at` ou páginas lidas não conta.
- O ano é o de `finished_at` no fuso do navegador (o do usuário), assim
  como o ano atual.
- Anos exibidos: do primeiro ano com um livro concluído até o ano atual,
  sem lacunas (um ano sem livros vale 0, que é um dado real). Sem nenhum
  livro concluído com data, não há gráfico.
- **Concluídos sem `finished_at`**: entram no total ("livros concluídos"),
  mas em nenhum ano; a seção avisa quantos são. Nenhuma data é atribuída.
- Ultrapassar a referência é estritamente acima dela (5 > 4; 4 não
  ultrapassa).

**Referência**

- `READING_REFERENCE` em `reading-progress.ts` é o único lugar com o
  valor: média de 3,96 livros por ano (Retratos da Leitura no Brasil,
  Instituto Pró-Livro, edição de 2024), apresentada como 4. O crédito na
  seção informa que o levantamento conta livros lidos inteiros ou em parte,
  enquanto o gráfico do usuário conta só os concluídos. Sem link: nenhum
  endereço da fonte foi definido.

**Gráfico e animação**

- SVG próprio, medido em pixels reais (`ResizeObserver`), sem biblioteca
  de gráficos.
- Entrada com GSAP disparada por um `IntersectionObserver`, uma vez por
  montagem. Sem ScrollTrigger: a altura da estante muda (carregamento,
  livros adicionados e removidos), e as posições do ScrollTrigger teriam de
  ser recalculadas a cada mudança; a animação não acompanha o scroll.
  Reduced motion mostra o estado final.

### Motivo

- Uma única fonte para a estante e para o gráfico: concluir um livro no
  livro aberto atualiza a contagem na hora, sem reload, sem consulta extra
  e sem risco das duas seções divergirem.
- O RLS de `user_books` continua sendo a autorização; nada novo é exposto.
- Um ano sem data inventada é mais honesto do que um gráfico "completo":
  o total continua certo e o aviso explica a diferença.

### Alternativas consideradas

- **Consulta própria da seção (`progress = 100`):** dados duplicados no
  navegador e uma segunda fonte que precisaria ser avisada a cada leitura
  salva.
- **Contexto compartilhado entre as duas seções:** mover o estado da
  estante para um provider só para isso; mais código para o mesmo
  resultado.
- **Usar `updated_at` (ou `started_at`) para os concluídos sem data:**
  inventaria um ano de conclusão.
- **Excluir os concluídos sem data também do total:** esconderia livros
  que o usuário de fato concluiu.
- **Recharts, Chart.js ou D3:** uma dependência para uma linha, alguns
  pontos e uma referência; o visual precisaria ser refeito de qualquer
  forma.
- **ScrollTrigger:** ver acima.

### Consequências

- A seção Reading Progress só existe dentro de `LibrarySection` (na Home).
  Se ela for usada em outra página, o estado da estante precisará subir
  para um componente comum.
- O total pode ser maior do que a soma dos anos (livros sem data), sempre
  com o aviso.
- O Footer (próxima fase) deve ler a referência de `READING_REFERENCE`.

## 015 — Reading Progress: atmosfera escura, livro como marcador e movimento contínuo

**Data:** 2026-10-07 · **Fase:** Reading Progress (redesign visual)

### Contexto

A primeira versão da seção (014) continuava a estante: mesmo fundo, mesmo
cabeçalho e uma tábua da estante como base do gráfico. Na revisão visual,
ela pareceu um gráfico convencional. A direção pedida (com uma imagem de
referência) é a de uma jornada: um ambiente mais escuro e
cinematográfico, a linha branca como protagonista, pequenos detalhes
dourados, o ano atual marcado por um livro aberto e uma seção que parece
viva mesmo depois da entrada. Dados, contagem, referência e acessibilidade
da 014 não mudam.

### Decisão

- **Transição pela atmosfera, não por um elemento:** a seção começa ainda
  no respiro que fecha a estante e escurece aos poucos (`black` a 72% sobre
  `background`), com uma luz quente baixa e um grão quase imperceptível,
  tudo em CSS. A tábua da estante sai do gráfico.
- **Livro como marcador:** um livro aberto em SVG próprio
  (`ReadingBook.tsx`), dentro do mesmo SVG do gráfico e posicionado pelas
  coordenadas do ponto do ano atual. Sem GIF, Lottie ou imagem externa.
- **Duas entradas (GSAP, uma vez cada):** o cabeçalho quando a seção chega
  à tela e o gráfico quando ele chega à tela, pelo menos 0,9s depois do
  cabeçalho. Ambas por `IntersectionObserver`, como na 014.
- **Movimento contínuo em GSAP:** uma timeline com repetição infinita (o
  livro respira e vira uma página de tempos em tempos; o halo, o brilho
  do livro e a luz ambiente pulsam), pausada quando a seção sai da tela e
  não criada com reduced motion. Só esses elementos se movem; a linha, os
  pontos e os anos ficam parados.

### Motivo

- A diferença entre "estante" e "jornada" vem da luz, não de uma borda ou
  de um card; o gradiente evita a costura entre as duas seções.
- Um marcador desenhado nas coordenadas do ponto não pode se desalinhar em
  nenhuma largura, e o SVG segue os tokens de cor do projeto.
- Com uma única entrada, a linha seria desenhada fora da tela enquanto o
  cabeçalho ainda estivesse entrando.
- Com o GSAP, a entrada e o movimento contínuo ficam no mesmo arquivo
  (`reading-progress-motion.ts`), com transformações SVG confiáveis
  (origem na lombada para virar a página) e pausa explícita fora da tela.

### Alternativas consideradas

- **Manter a tábua da estante como base:** continuidade literal, mas o
  gráfico continuava parecendo parte da estante, não uma nova atmosfera.
- **Imagem de fundo (montanhas, horizonte):** mais peso, mais um asset e
  menos controle de contraste; a luz em gradiente basta.
- **GIF, vídeo ou Lottie para o livro:** um asset ou uma dependência para
  um ícone de 40px, sem os tokens de cor e sem reduced motion nativo.
- **Animações CSS (`@keyframes`) para o movimento contínuo:** possíveis,
  mas espalhariam o movimento entre CSS global e GSAP, e a pausa fora da
  tela exigiria outro mecanismo.
- **ScrollTrigger:** pelos mesmos motivos da 014.

### Consequências

- `black` passa a ser usado também na atmosfera do Reading Progress, e o
  projeto ganha a sua primeira textura (`docs/design.md`).
- Enquanto a seção está na tela (sem reduced motion), o ticker do GSAP
  fica ativo para o movimento contínuo; fora dela, a timeline fica
  pausada.
- A seção é a última da Home por enquanto; o Footer (próxima fase) começa
  sobre o fundo escuro dela.

## 016 — Reading Progress: total acumulado mês a mês e referência como trajetória

**Data:** 2026-10-13 · **Fase:** Reading Progress (escala do gráfico)

### Contexto

O gráfico da 014/015 mostrava quantos livros foram concluídos em cada ano.
Com poucos anos e poucos livros, ele quase não muda: concluir um livro
move um único ponto, e um ano novo começa no zero. O redesign visual da 015
foi aprovado; a mudança pedida é só de escala e de leitura dos dados: a
jornada ao longo dos meses, como total acumulado. A referência continua
sendo a média anual de 3,96 livros (Retratos da Leitura no Brasil,
Instituto Pró-Livro, 2024), apresentada como "4 livros por ano".

### Decisão

**Série**

- `summarizeReading` devolve `months`: do mês do primeiro livro concluído
  com data até o mês atual, sem lacunas. Cada mês tem os concluídos nele
  (`finished`) e o total acumulado até o fim dele (`total`), que nunca
  diminui; um mês sem conclusões repete o total anterior (a linha fica
  reta).
- Continua contando como concluído só `progress = 100`. O mês é o de
  `finished_at` no fuso do navegador, como o ano era. Cada linha de
  `user_books` conta uma vez.
- O resumo não muda: total de concluídos (com os sem data) e concluídos no
  ano atual (`plan.md`, seção 27).
- **Concluídos sem `finished_at`**: como na 014, entram no total do resumo,
  em nenhum mês e com o aviso. A linha acumulada conta só os datados.

**Referência como trajetória**

- A média anual vira uma trajetória acumulada: `surveyAverage / 12`
  (0,33 livro) por mês, a partir do começo do primeiro mês da série. No
  fim do mês *n* da série, a referência vale *n* × 3,96 / 12. É uma
  conversão matemática da média anual, não uma estatística mensal da
  pesquisa; o rótulo continua "4 livros por ano" e o crédito não muda.
- Acima da referência continua sendo estritamente acima, agora comparando
  os dois acumulados no mesmo mês. O dourado é recortado acima da
  trajetória (inclinada), não de uma linha horizontal.

**Gráfico**

- A linha começa no zero, no começo do primeiro mês (a origem da
  jornada, onde a trajetória da referência também começa), e passa pelo
  total no fim de cada mês. Não é um mês inventado: antes da primeira
  conclusão datada, o acumulado é zero.
- Pontos só nos meses com conclusões, e o mês atual destacado com o livro;
  uma série de anos não vira uma fileira de pontos.
- Eixo: os meses no meio de cada intervalo e os anos na borda em que
  começam, com uma marca discreta na base. Os rótulos visíveis dependem só
  da largura de um mês (todos os meses, a cada 2, 3 ou 6, sempre alinhados
  ao calendário, ou nenhum além do atual); o mês atual, o ano atual e o
  primeiro ano têm prioridade. A lista para leitores de tela tem todos os
  meses, inclusive os sem conclusões.

**Dados**

- Tudo continua derivado dos livros que a estante já carrega: nenhuma
  consulta nova, nenhuma tabela de histórico, nenhuma migration.

### Motivo

- O acumulado mostra a jornada inteira e muda a cada livro concluído; a
  linha só sobe ou fica parada, que é como uma jornada de leitura
  acontece.
- Comparar um acumulado com uma linha anual fixa não faria sentido; os
  dois precisam estar na mesma escala de tempo.
- Começar a trajetória no primeiro mês da série compara o usuário com a
  média a partir de quando ele começou a registrar conclusões, não desde
  uma data arbitrária.

### Alternativas consideradas

- **Livros concluídos por mês (sem acumular):** a maioria dos meses teria
  0 ou 1, um gráfico em serra sem a ideia de jornada.
- **Começar a série em janeiro do primeiro ano:** a referência acumularia
  meses em que o usuário ainda não registrava leituras.
- **Começar a série no mês anterior à primeira conclusão:** mostraria um
  mês (e às vezes um ano) inteiro sem nada; a origem no começo do primeiro
  mês tem o mesmo zero sem esse mês.
- **Comparar com 4 em vez de 3,96 na trajetória:** o arredondamento é só
  de apresentação; a conta usa a média registrada.
- **Tabela de histórico mensal:** desnecessária; `finished_at` já
  determina o mês de cada conclusão.

### Consequências

- `ReadingYear` sai; `ReadingMonth` e `summary.months` o substituem.
- Quem conclui o primeiro livro começa acima da referência (1 contra
  0,33); a trajetória o alcança em poucos meses sem novas conclusões.
- Uma conclusão sem data continua fora da linha; se o livro for
  desconcluído e concluído de novo, ele ganha a data da nova conclusão
  (trigger da 09B).

## 017 — Reading Progress: eixo de no mínimo 12 meses

**Data:** 2026-10-13 · **Fase:** Reading Progress (escala do gráfico)

### Contexto

Na revisão visual da 016, a referência parecia mal posicionada, quase na
base do gráfico. O cálculo e a geometria estavam corretos: como
`finished_at` só existe desde a migration da 09B (outubro de 2026), as
conclusões datadas de uma conta real são todas do mês atual. A série tem
um mês, e a referência termina, corretamente, em 0,33 livro, enquanto o
usuário já tem vários. Com tão pouco tempo no eixo, a trajetória de "4
livros por ano" não tem espaço para aparecer.

### Decisão

- O eixo do gráfico tem `max(12, meses do histórico)` meses, a partir do
  começo real da série. Os meses que completam o eixo vêm logo depois do
  último mês do histórico (o atual) e existem só no gráfico
  (`axisMonths` em `ReadingChart.tsx`); `summarizeReading` e
  `summary.months` continuam só com o histórico.
- Nesses meses seguintes não há linha do usuário, pontos, dourado ou
  livro: a linha termina no mês atual, onde ficam o ponto, o halo e o
  livro. Só a referência continua, com a mesma conta (`referenceAt`, a
  fórmula da 016 extraída para uma função), mais apagada. Com 12
  intervalos ela chega a 3,96.
- Rótulos de meses e anos seguintes em `foreground-muted` a 40%, marca do
  ano na base mais fraca. Um mês do histórico sem conclusões tem a linha
  reta sobre ele e rótulo normal; um mês seguinte não tem linha e tem
  rótulo apagado.
- A escala vertical inclui o fim da referência no eixo.
- A lista para leitores de tela continua só com os meses do histórico; a
  legenda da figura diz até quando o eixo vai e que esses meses ainda não
  aconteceram.

### Motivo

- A referência é anual; 12 meses é o menor eixo em que ela mostra o que
  significa. Estender para a frente não inventa histórico, e começar antes
  da primeira conclusão compararia o usuário com meses em que ele não
  registrava leituras (016).
- A mesma geometria para histórico e eixo garante que a referência, a
  linha do usuário e o dourado continuem na mesma escala e origem.

### Alternativas consideradas

- **Manter o eixo só com o histórico:** correto, mas a referência fica
  ilegível até a conta ter vários meses.
- **Estender para trás (12 meses até o mês atual):** criaria meses
  anteriores à primeira conclusão e mudaria a origem da referência.
- **Projetar a linha do usuário:** seria uma previsão, não um registro.

### Consequências

- Com menos de 12 meses de histórico, o mês atual não fica na ponta
  direita do gráfico; o livro continua nele.
- Com 12 meses ou mais, o gráfico é o mesmo da 016.
