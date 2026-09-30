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

Texturas de papel, grão ou ruído ainda não são usadas. Se forem
introduzidas em uma fase específica, devem ser extremamente sutis e
nunca prejudicar a legibilidade.
