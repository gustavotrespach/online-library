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
