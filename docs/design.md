# Sistema Visual — Online Library

Regras de uso do sistema visual do website. Os valores dos tokens ficam
somente em `src/app/globals.css` (`@theme`), que é a fonte de verdade.
Este documento explica **quando** e **como** usá-los.

## Direção

Cinematográfica, editorial, minimalista e contemporânea, inspirada em
livros e bibliotecas físicas. Não deve parecer um dashboard
administrativo.

A hierarquia vem de contraste, espaçamento, superfícies e tipografia, e
não de bordas, cards, sombras pesadas ou gradientes. Elementos
decorativos só entram quando têm função.

## Tipografia

| Família            | Classe       | Uso                                                        |
| ------------------ | ------------ | ---------------------------------------------------------- |
| Cormorant Garamond | `font-serif` | Títulos, headings, frases cinematográficas, trechos editoriais |
| Inter              | `font-sans`  | Interface, textos, botões, labels, formulários, dados de livros, navegação |

- `font-sans` é a fonte padrão do documento.
- `h1`–`h6` já usam `font-serif` com peso 500. Para um heading de
  interface (ex.: título de um formulário), aplique `font-sans`.
- Só existem os pesos `font-normal` (400), `font-medium` (500) e
  `font-semibold` (600). Não criar hierarquia com excesso de pesos;
  preferir tamanho, cor e espaçamento.
- `text-display` é um tamanho fluido (≈44px no mobile → 88px no desktop)
  para títulos editoriais de destaque. Os demais tamanhos usam a escala
  padrão do Tailwind (`text-sm`, `text-base`, `text-lg`, `text-4xl`…).
- Rótulos pequenos em caixa alta (eyebrows) usam Inter com
  `text-xs font-medium tracking-widest uppercase`.
- As duas fontes são variáveis e auto-hospedadas pelo `next/font` (um
  arquivo por família, sem requests ao Google em tempo de execução).
  Itálico ainda não é carregado; adicionar `style: ["normal", "italic"]`
  no layout se ele passar a ser usado.

## Cores

| Token                   | Uso                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `background`            | Fundo principal do website                                 |
| `background-secondary`  | Fundo alternativo para diferenciar seções                  |
| `surface`               | Superfícies elevadas: modais, painéis, campos              |
| `foreground`            | Texto principal                                            |
| `foreground-muted`      | Texto secundário, descrições                               |
| `foreground-subtle`     | Texto discreto (ver restrição abaixo)                      |
| `paper`                 | Cor de papel: páginas, detalhes inspirados em livros       |
| `accent`                | Detalhe dourado/envelhecido, foco, seleção. Usar com moderação |
| `border`                | Bordas discretas, quando realmente necessárias             |
| `black`                 | Preto puro do fim do vídeo do Hero. Somente em transições ligadas ao vídeo (fade da seção seguinte, faixa escura do topo) e na atmosfera escura do Reading Progress |

Uso nas classes: `bg-surface`, `text-foreground-muted`, `border-border`,
`bg-paper text-background` etc. A paleta padrão do Tailwind foi removida
(ver `decisions.md`). Nenhum hex deve ser escrito em componentes; em CSS
próprio ou animações use `var(--color-…)`.

**Contraste (WCAG AA):**

- `foreground`, `foreground-muted`, `accent` e `paper` passam com folga
  em todos os fundos (≥ 6:1).
- `foreground-subtle` tem 3,4–3,9:1: **não usar em texto de leitura
  normal**. Permitido em texto grande (≥ 24px, ou ≥ 18,66px em
  semibold), metadados não essenciais, ícones e elementos decorativos.
- Texto sobre `paper` usa `text-background`.

## Espaçamento

Escala em múltiplos de 4px, usando a escala nativa do Tailwind
(`1` = 4px):

| px   | 4 | 8 | 12 | 16 | 24 | 32 | 40 | 48 | 64 | 80 | 96 | 128 | 160 |
| ---- | - | - | -- | -- | -- | -- | -- | -- | -- | -- | -- | --- | --- |
| classe | `1` | `2` | `3` | `4` | `6` | `8` | `10` | `12` | `16` | `20` | `24` | `32` | `40` |

- Elementos pequenos: 8–12px (`2`–`3`)
- Conteúdo interno: 16–24px (`4`–`6`)
- Entre componentes: 24–32px (`6`–`8`)
- Grandes separações: 48–80px (`12`–`20`)
- Entre seções: 96–160px (`24`–`40`), em geral menor no mobile

Evitar valores fora da escala (ex.: `p-5`, `mt-7`) sem motivo concreto.

## Layout

`page-container` é o container global: largura máxima de 1440px
(`max-w-site`), centralizado, com padding horizontal de 20px (mobile),
32px (tablet) e 48px (desktop). Seções podem ocupar a largura total e
usar `page-container` internamente.

## Responsividade

| Faixa   | Largura       | Variante do Tailwind |
| ------- | ------------- | -------------------- |
| Mobile  | < 768px       | (sem prefixo)        |
| Tablet  | 768–1023px    | `md:`                |
| Desktop | ≥ 1024px      | `lg:`                |

- Estilos partem do mobile; `md:` e `lg:` acrescentam ajustes. Cada
  faixa deve ter composição própria, não apenas uma versão reduzida.
- `sm:`, `xl:` e `2xl:` continuam disponíveis, mas só devem ser usados
  quando um componente realmente precisar.
- Nada pode depender exclusivamente de hover. A variante `hover:` do
  Tailwind já só é aplicada em dispositivos com hover real; toda ação
  precisa de um caminho equivalente por toque e teclado.

## Raios

`rounded-sm` (6px), `rounded-md` (8px), `rounded-lg` (12px) e
`rounded-full` para elementos circulares. Não existem raios maiores, de
propósito: evitar o arredondamento típico de dashboards.

## Bordas e superfícies

Bordas são a exceção. O padrão de qualquer `border` já é o token
`border` (baixo contraste). Preferir separar áreas com espaçamento,
mudança de superfície (`background` → `background-secondary` →
`surface`) e transparência.

## Movimento

| Tipo                     | Duração          | Curva                     |
| ------------------------ | ---------------- | ------------------------- |
| Microinterações (hover, foco, estados) | 150–300ms (`duration-200`, padrão) | `ease-smooth` (padrão) |
| Transições de interface (modais, painéis, entrada de elementos) | 300–500ms (`duration-300`–`duration-500`) | `ease-smooth` ou `ease-smooth-in-out` |

- As classes `transition`, `transition-colors` etc. já usam 200ms e
  `ease-smooth` por padrão; basta especificar quando for diferente.
- Evitar `ease-linear`, exceto para progresso contínuo ligado ao scroll.
- Foco: contorno de 2px na cor `accent` com offset de 3px, aplicado
  globalmente via `:focus-visible`. Não remover sem substituir por algo
  igualmente visível.
- Não definir `scroll-behavior: smooth` globalmente: ele interfere no
  GSAP ScrollTrigger (Hero). A rolagem suave da navegação deve ser feita
  pontualmente na fase da Navbar.

### `prefers-reduced-motion`

- Globalmente, com `reduce`, animações e transições CSS passam a durar
  0,01ms: os estados finais continuam sendo aplicados e os eventos de
  fim de transição continuam disparando, então a funcionalidade é
  preservada.
- Para variações específicas, usar `motion-safe:` e `motion-reduce:`.
- Animações em JavaScript (GSAP) não são cobertas pela regra CSS e
  precisam tratar a preferência explicitamente (`gsap.matchMedia()`),
  exibindo diretamente o estado final.

## Hero

- No início do scroll o Hero mostra o idle em loop (estado de repouso).
  Ao rolar, o idle some em um fade de 0,4s e a cena passa a seguir o
  scroll; ao voltar ao início, o idle reaparece com o mesmo fade. Sem
  movimento permitido (reduced motion ou autoplay negado), o Hero
  mostra o poster estático.
- Os vídeos preenchem o Hero com `object-cover`, sem distorção. Abaixo de
  768px o enquadramento é deslocado para 40% na horizontal, para manter
  o leitor e o livro visíveis no crop vertical.
- Sobre o Hero a Navbar não tem fundo; uma faixa `from-black/60` no topo
  do Hero, que aparece junto com a Navbar, garante o contraste.
- O preto final do vídeo continua na seção seguinte: ela começa em
  `black` e chega a `background` na metade da altura, sem costura.
- Nenhum texto ou efeito é sobreposto à cena; conteúdo essencial não
  depende do vídeo.

## Estante (My Library)

- Prateleiras flutuantes, livros com largura pelo número de páginas e
  capa em escala de cinza na parte ainda não lida (a cor sobe da base).
  Ornamentos e teias seguem a composição determinística aprovada na 07A.
- Capa ausente ou que não carregou: fallback com título e autor sobre um
  tom de encadernação estável por livro (cores de conteúdo, não tokens).
- Estados: carregando (prateleiras sem livros e mensagem discreta que só
  aparece após 0,5s), visitante (convite para entrar ou criar conta),
  vazia (teias) e erro (mensagem e "Tentar novamente"). Só a estante
  vazia mostra teias.
- Drag-and-drop: o livro pego sobe 8px, inclina 2,5° e cresce 4%, com
  sombra maior; os outros abrem espaço e uma linha fina em `accent` marca
  na tábua onde ele vai assentar. Fora da estante não há marca, e o
  livro volta ao lugar ao ser solto.
- Toque: pressão longa para pegar o livro; deslizar sem pressionar rola
  a página. Teclado: setas para a esquerda e para a direita.
- Com reduced motion, o drag continua funcionando, mas sem elevação
  animada nem deslizamento dos outros livros.
- Clique, toque ou Enter em um livro abre o livro (ver "Livro aberto").
  Soltar um livro depois do drag, a pressão longa e a rolagem nunca abrem
  o livro.
- "Adicionar livro" fica ao lado do título da seção, para usuários
  autenticados (inclusive com a estante vazia). Avisos de sucesso ou
  falha (adicionar, remover, salvar a ordem) aparecem em uma linha
  discreta abaixo da descrição.

## Diálogos de livros

- Diálogo centralizado (`max-w-xl`), com cabeçalho fixo (título e
  fechar) e corpo rolável; no mobile ocupa a largura com 16px de margem e
  nunca passa da altura da tela (`dvh`, que acompanha o teclado virtual).
- Adicionar livro: busca (campo + "Buscar"), lista de resultados com capa
  pequena (44px), título, autor, páginas e ano, e "Selecionar"; revisão
  com capa maior, páginas, ano e ISBN, e "Adicionar à biblioteca". "Não
  encontrou? Adicionar manualmente" leva ao formulário manual.
- Um único padrão visual para todos os estados (buscando, sem
  resultados, erro, salvando, duplicata): uma linha de texto em
  `foreground-muted` e alertas em `surface`, como nos formulários de
  autenticação.
- O foco acompanha as etapas: campo de busca ao abrir e ao voltar, título
  do livro na revisão, campo título na entrada manual. Ao fechar, o foco
  volta a quem abriu (ou ao "Adicionar livro", se o livro saiu da
  estante).

## Livro aberto

- O próprio livro sai da estante: sobe um pouco e inclina, vem para o
  centro ainda fechado e abre como um livro físico (a capa gira na
  lombada). Aberto: capa à esquerda, com a mesma escala de cinza do
  progresso; página de papel à direita com título, autor, páginas, ano e
  ISBN (só os que existem), seguidos da leitura (progresso e feedback).
- Fundo escurecido com discrição (`black/60`, sem blur): a estante
  continua visível. O lugar do livro na estante fica vazio enquanto ele
  está aberto.
- Fechar (botão acima do canto do livro), Esc ou clique fora: o livro
  fecha, volta e assenta no mesmo lugar. "Remover da estante" fica abaixo
  do livro, com confirmação.
- Com alterações não salvas, fechar pergunta antes, no mesmo lugar da
  confirmação de remoção: "Você tem alterações não salvas." com "Salvar e
  fechar", "Descartar" e "Cancelar". Esc com a pergunta aberta cancela a
  pergunta (nunca fecha o livro descartando o rascunho).
- Tamanho: a maior página que cabe na tela (até 400px de largura,
  proporção 2:3), com espaço para os controles. Textos da página
  acompanham a largura dela (unidades de container), com mínimo de 12px.
- Reduced motion: abre e fecha direto, sem trajeto.

### Leitura no livro aberto

- **Progresso:** rótulo em caixa alta ("Progresso"), a porcentagem e uma
  linha fina de tinta que acompanha o valor digitado (prévia), e um campo
  numérico com "Salvar progresso". Livro com páginas: "Páginas lidas
  [137] de 320". Livro sem páginas: "Porcentagem lida [43] %", sem total
  inventado. A capa só muda depois de salvar.
- **Seu feedback:** área de texto em papel, com o convite "Escreva o que
  você achou deste livro…", contador discreto ("238 / 5000") e "Salvar
  feedback". Apagar o texto e salvar remove o feedback.
- **Estados:** uma linha fixa abaixo de cada parte, sem mudar a altura da
  página: "Alterações não salvas", "Salvando…", "Progresso salvo" /
  "Feedback salvo" (some depois de alguns segundos) ou o erro ("Não foi
  possível salvar… Tente novamente."), sempre preservando o que foi
  digitado. Sem toasts.
- **Sobre papel:** campos com borda em tinta translúcida, botões em tinta
  (`background`) com texto `paper`, foco com contorno na cor da tinta (o
  dourado não tem contraste suficiente no papel). Campos com texto de
  16px e alvos de 44px.
- **Por tamanho de tela:** com página de pelo menos 300px (tablet e
  desktop), progresso e feedback ficam na própria página da direita, que
  rola por dentro quando o conteúdo passa da altura. Abaixo disso
  (celulares), a página continua com os dados e a leitura atual, e os
  controles vão para um cartão de papel abaixo do livro, na largura dele;
  a coluna rola, e o livro começa abaixo da altura da Navbar. Na página
  estreita, os dados viram duas linhas ("340 páginas · 2008" e "ISBN …")
  para o ISBN caber inteiro.
- Usa o `<dialog>` modal como os outros overlays, mas a entrada e a saída
  são do GSAP (o trajeto do livro), não o fade dos modais.

## Reading Progress

Direção: uma jornada, não um painel de estatísticas. A seção é a única
parte escura e contemplativa da Home depois da estante (`decisions.md`,
015).

- **Atmosfera e transição:** sem divisória nem tábua. Uma camada começa
  ainda no respiro que fecha a estante e escurece aos poucos até `black` a
  72% sobre `background` (cerca de 20rem depois). Por cima, uma luz quente
  e baixa no horizonte (`accent` a 11%, gradiente radial) e um grão
  quase imperceptível (ruído SVG a 7%, `soft-light`), para o preto não
  parecer chapado. Nada disso é imagem.
- **Cabeçalho:** eyebrow em `accent`; título serif grande em duas linhas,
  "Sua evolução / de *leitura*" (só "leitura" em `accent`), de `text-5xl`
  a `text-7xl`; um fio curto em `accent` e uma frase em
  `foreground-muted` ("Cada livro concluído é um passo na sua jornada.";
  visitante: convite para entrar ou criar conta).
- **Números:** total ("livros concluídos / até agora") e ano atual
  ("livros em / 2026", com o ano em `accent`), em serif `text-6xl`–`7xl`
  com `lining-nums`, separados só por um fio vertical em `paper/15`. Sem
  cards. Desktop: à direita do título; tablet e celular: abaixo da frase.
- **Gráfico:** protagonista, na largura da seção (no desktop, menos uma
  coluna de 12rem à direita para a referência). Mostra o total acumulado
  de livros concluídos mês a mês (`decisions.md`, 016).
  - Linha do usuário em `paper` (2px, segmentos retos, sem suavização que
    altere os valores) com um brilho largo e suave por baixo; área quase
    invisível sob ela. Começa no zero, no começo do primeiro mês, e passa
    pelo total no fim de cada mês: sobe quando há conclusões e fica reta
    nos meses sem elas. Nunca desce.
  - Pontos pequenos em `paper` só nos meses com conclusões; de cada ponto,
    uma haste pontilhada até a base. A base é um fio em `paper/15`, com uma
    marca no começo de cada ano. Sem eixo Y, grade, legenda ou tooltip.
  - O trecho acima da trajetória da referência fica dourado (`accent`
    clareado pelo `paper`), recortado exatamente na linha tracejada; o
    resto continua em `paper`. Os pontos acima dela também ficam dourados.
  - Abaixo da base, duas linhas de rótulos: os meses (`text-xs`, no meio
    de cada mês) e os anos (`text-sm`, na borda em que cada ano começa).
    Mês e ano atuais em `accent`.
- **Eixo de no mínimo 12 meses** (`decisions.md`, 017): com menos meses
  de histórico, o eixo continua depois do mês atual até completar 12.
  Nesses meses não há linha do usuário, pontos, dourado nem livro; os
  rótulos de mês e ano ficam em `foreground-muted` a 40% e a marca do ano
  na base em `paper/15`. Um mês do histórico sem conclusões tem a linha
  reta sobre ele; um mês seguinte, nada além da referência.
- **Referência:** uma trajetória acumulada (3,96 / 12 por mês, do zero na
  origem até o fim do eixo), tracejada em `paper/35` no histórico e em
  `paper/20` nos meses seguintes, mais discreta que a linha do usuário.
  Desktop: rótulo à direita, na altura do fim da trajetória ("Referência", "4 livros por ano" em `accent`, "(Instituto
  Pró-Livro, 2024)"). Tablet e celular: uma linha acima do gráfico. O
  crédito completo (com a ressalva de livros lidos inteiros ou em parte)
  fecha a seção em texto pequeno.
- **Mês atual e livro:** ponto maior em dourado com halo fino e uma haste
  dourada, no total atual. Sobre ele, um pequeno livro aberto em SVG
  (páginas em `paper`, capa e lombada em `accent`, brilho quente muito
  suave), desenhado nas mesmas coordenadas do ponto: acompanha o ponto em
  qualquer largura.
- **Escala:** o maior total (ou o fim da referência no eixo, se for maior) fica a
  64px do topo, para o livro caber; o zero fica 14px acima da base. Todos
  os meses têm a mesma largura (no máximo 140px; poucos meses ficam juntos
  no centro). A área tem 256px de altura no celular, 288px no tablet e
  320px no desktop, e o SVG é desenhado na largura real.
- **Rótulos em tela estreita (determinístico pela largura de um mês):**
  meses a cada 1, 2, 3 ou 6, alinhados ao calendário (a cada 3: jan, abr,
  jul, out), o menor intervalo em que não encostam; estreito demais,
  nenhum. O mês atual sempre aparece. Anos: o atual e o primeiro sempre,
  os outros enquanto não encostam. A fonte não diminui; a lista acessível
  tem todos os meses.
- **Estados sem gráfico** (visitante, sem livros concluídos, erro,
  carregando): o mesmo horizonte (um fio que se apaga para a direita), com
  uma frase em serif e uma linha de apoio. Sem eixos, zeros ou dados de
  exemplo. No visitante e no estado vazio, o livro descansa no começo do
  horizonte, sem ponto, mês ou valor. Erro: mensagem discreta com "Tentar
  novamente".
- **Entrada (GSAP), uma vez por montagem:** quando a seção chega à tela,
  a luz ambiente, o título, o fio e os números; quando o gráfico chega à
  tela (pelo menos 0,9s depois do cabeçalho), a base, os meses e os anos
  (em cascata de no máximo 0,3s, com qualquer número de meses), a
  referência, a linha desenhada da esquerda para a direita (cada ponto
  quando o traço chega nele), o dourado acima da referência, o destaque do
  mês atual e, por último, o livro.
- **Micro-movimento contínuo (GSAP), quase imperceptível:** o livro sobe e
  desce 1,5px e, a cada cerca de 11s, vira uma página; o halo do mês atual
  e o brilho do livro respiram; a luz ambiente pulsa devagar. A linha, os
  pontos e os rótulos nunca se movem. Pausa fora da tela.
- **Reduced motion:** sem entrada e sem micro-movimento; tudo já no estado
  final.
- **Acessibilidade:** o gráfico é uma `<figure>` com legenda e uma lista
  para leitores de tela com todos os meses, inclusive os sem conclusões
  ("Outubro de 2026 (mês atual): 10 livros concluídos acumulados."); o SVG
  e os rótulos visuais são decorativos (`aria-hidden`). Acima da
  referência é indicado pela posição em relação à linha tracejada e pela
  lista, não só pela cor.

## Ícones

Lucide React é a única biblioteca de ícones. Convenção:
`strokeWidth={1.5}`, `size={20}` (16px em contextos compactos), cor
herdada do texto (`currentColor`). O Lucide já aplica `aria-hidden` a
ícones sem rótulo; botões só com ícone precisam de `aria-label` e área de
toque de pelo menos 48px (`size-12`).

## Menus e modais

- Overlays (menu mobile, futuros modais) usam o `<dialog>` nativo com
  `showModal()`: foco contido, conteúdo de fundo inerte e Esc já vêm do
  navegador. Ver `decisions.md` (003).
- Enquanto um `<dialog>` modal está aberto, o `html` não rola (regra
  global em `globals.css`).
- Entrada e saída usam fade com `transition-discrete` + `starting:`
  (duração de interface, `ease-smooth-in-out`). Ao fechar, o foco volta
  ao elemento que abriu o overlay.

## Itens ainda indisponíveis

Links cujo destino ainda não existe são exibidos como placeholder
(`<a>` sem `href`) em `text-foreground-subtle`, com "(em breve)" para
leitores de tela. Não recebem foco nem hover. Ver `decisions.md` (002).

## Texturas

Só o Reading Progress usa textura: um grão de ruído SVG a 7% sobre o
fundo escuro. Novas texturas devem ser igualmente sutis e nunca
prejudicar a legibilidade.
