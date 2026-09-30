# Online Library --- Plano do Website

## 1. Visão Geral

O Online Library é um WEBSITE público de biblioteca digital pessoal.

O objetivo é transformar a experiência tradicional de uma biblioteca
física em uma experiência digital moderna, visual e cinematográfica.

O website permitirá que usuários tenham uma biblioteca pessoal,
adicionem livros, acompanhem seu progresso de leitura e visualizem sua
atividade de leitura ao longo do ano.

O projeto será desenvolvido como um website responsivo para:

-   desktop;
-   tablet;
-   mobile.

Embora o website possua autenticação, dados persistentes e
funcionalidades interativas, ele NÃO deve ser tratado conceitualmente
como um aplicativo mobile ou desktop.

O produto é um WEBSITE.

------------------------------------------------------------------------

## 2. Observação sobre o Next.js

O projeto utilizará o App Router do Next.js.

Por isso, o framework utiliza uma pasta chamada:

`src/app/`

Essa nomenclatura é uma convenção técnica do Next.js e NÃO significa que
o produto seja um aplicativo.

`src/app/` deverá ser entendido como a camada técnica de páginas, rotas
e layouts do website.

Em toda a documentação, o produto deverá ser chamado de:

-   website;
-   site;
-   plataforma web, quando apropriado.

Evitar tratar o Online Library como:

-   aplicativo mobile;
-   aplicativo desktop;
-   app mobile;
-   app nativo.

------------------------------------------------------------------------

## 3. Objetivos do Website

O website deverá permitir que um usuário:

-   crie uma conta;
-   faça login;
-   tenha uma biblioteca pessoal;
-   pesquise livros;
-   adicione livros;
-   adicione livros manualmente;
-   escolha uma edição específica;
-   utilize capas externas;
-   envie capas personalizadas;
-   acompanhe o progresso de leitura;
-   marque livros como concluídos;
-   edite livros;
-   remova livros;
-   visualize sua quantidade de livros concluídos no ano;
-   visualize sua leitura em relação a uma referência estatística.

Os dados de cada usuário deverão ser isolados dos demais usuários.

------------------------------------------------------------------------

## 4. Stack Tecnológica

A stack principal será:

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   GSAP
-   GSAP ScrollTrigger
-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Supabase Storage
-   Zod
-   React Hook Form
-   Lucide React
-   Vercel

Integrações externas:

-   Google Books API
-   Open Library API

Não adicionar tecnologias importantes sem necessidade técnica concreta e
justificativa documentada.

------------------------------------------------------------------------

## 5. Arquitetura Geral

``` text
Usuário
   ↓
Website
   ↓
Vercel
   ↓
Next.js
   ↓
Supabase
   ├── Auth
   ├── PostgreSQL
   └── Storage

Serviços externos
   ├── Google Books API
   └── Open Library API
```

O Next.js será responsável pela estrutura do website e pelas
necessidades de servidor do projeto.

Não será utilizado um servidor Express separado inicialmente.

------------------------------------------------------------------------

## 6. Estrutura Geral do Website

O website terá inicialmente quatro grandes seções:

1.  Hero
2.  My Library
3.  Reading Progress
4.  Footer

A navegação principal deverá permitir acessar essas seções por scroll
suave quando apropriado.

------------------------------------------------------------------------

## 7. Estrutura de Diretórios

A estrutura deverá evoluir de forma incremental.

O agente NÃO deve criar todos os arquivos futuros antecipadamente apenas
para preencher a estrutura.

As pastas e arquivos devem ser criados quando a respectiva fase começar
e quando existir uma responsabilidade real para eles.

Estrutura conceitual:

``` text
online-library/
│
├── AGENTS.md
├── plan.md
├── tasks.md
├── decisions.md
├── CONTRIBUTING.md
│
├── docs/
│   ├── produto.md
│   ├── design.md
│   ├── arquitetura.md
│   ├── banco-de-dados.md
│   └── integracoes.md
│
├── public/
│   └── assets/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── styles/
│
├── supabase/
│   └── migrations/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── ...
```

Essa é uma estrutura arquitetural de referência. Não significa que todos
os arquivos e diretórios devam ser criados imediatamente.

------------------------------------------------------------------------

## 8. Responsabilidade das Principais Pastas

### `src/app/`

Pasta técnica do Next.js para:

-   páginas;
-   rotas;
-   layouts;
-   arquivos especiais do framework;
-   estilos globais quando apropriado.

### `src/components/`

Componentes visuais e interativos do website.

Estrutura futura esperada:

``` text
src/components/
├── navbar/
├── hero/
├── auth/
├── library/
├── bookshelf/
├── book/
├── book-modal/
├── reading-progress/
└── footer/
```

Essas pastas serão criadas conforme as funcionalidades forem
implementadas.

### `src/lib/`

Lógica reutilizável, integrações e utilitários.

Estrutura futura possível:

``` text
src/lib/
├── supabase/
├── books/
├── validation/
└── utils/
```

### `src/types/`

Tipos TypeScript compartilhados do domínio.

Exemplos futuros:

``` text
src/types/
├── book.ts
└── user.ts
```

### `src/styles/`

Estilos que realmente precisem existir fora do Tailwind e dos estilos
globais.

### `public/assets/`

Assets estáticos do website:

-   imagens;
-   assets do Hero;
-   ícones;
-   outros recursos.

### `supabase/migrations/`

Migrations do PostgreSQL.

------------------------------------------------------------------------

## 9. Documentação do Projeto

Documentos principais:

``` text
AGENTS.md
plan.md
tasks.md
decisions.md
CONTRIBUTING.md

docs/
├── produto.md
├── design.md
├── arquitetura.md
├── banco-de-dados.md
└── integracoes.md
```

Responsabilidades:

### `AGENTS.md`

Como agentes devem trabalhar.

### `plan.md`

O que o website deve ser, requisitos, arquitetura e roadmap.

### `tasks.md`

Estado das tarefas.

### `decisions.md`

Decisões arquiteturais relevantes.

### `CONTRIBUTING.md`

Como desenvolvedores humanos trabalham no projeto.

### `docs/produto.md`

Comportamento e objetivos do produto quando houver detalhes que mereçam
documentação adicional.

### `docs/design.md`

Decisões visuais e de experiência.

### `docs/arquitetura.md`

Arquitetura técnica.

### `docs/banco-de-dados.md`

Schema, relacionamentos, RLS e decisões de banco.

### `docs/integracoes.md`

Google Books, Open Library e outras integrações externas.

Não criar documentação apenas para repetir código óbvio.

------------------------------------------------------------------------

# 10. Fase 01 --- Fundação do Website

Objetivo: estabelecer uma base limpa, executável e organizada.

Estrutura inicial esperada:

``` text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
├── lib/
├── types/
└── styles/
```

Além dos arquivos de configuração necessários do Next.js, TypeScript,
Tailwind e ferramentas utilizadas.

### `src/app/layout.tsx`

Responsável por:

-   layout raiz;
-   estrutura HTML principal;
-   metadata global;
-   fontes globais quando apropriado;
-   providers globais somente quando necessários.

### `src/app/page.tsx`

Página principal do website.

Não deve concentrar toda a implementação futura em um único arquivo.

### `src/app/globals.css`

Estilos globais necessários.

Deve permanecer enxuto.

### `src/components/`, `src/lib/`, `src/types/`, `src/styles/`

Podem existir como base estrutural, mas subarquivos específicos devem
ser criados somente quando houver uma responsabilidade real.

------------------------------------------------------------------------

# 11. Fase 02 --- Sistema Visual

Estabelecer:

-   tipografia;
-   espaçamentos;
-   base de cores;
-   elementos visuais recorrentes;
-   comportamento responsivo;
-   estilos globais necessários.

Evitar criar um design system excessivamente abstrato.

------------------------------------------------------------------------

# 12. Fase 03 --- Navbar

Criar:

``` text
src/components/navbar/
```

quando a fase começar.

Responsabilidades:

-   navegação entre seções;
-   links;
-   comportamento no Hero;
-   estado de autenticação;
-   responsividade.

A navbar deve ser visualmente discreta.

------------------------------------------------------------------------

# 13. Fase 04 --- Hero

Criar:

``` text
src/components/hero/
```

quando a fase começar.

O Hero será uma experiência cinematográfica controlada por scroll.

Requisitos:

-   viewport completo;
-   experiência visual principal;
-   navbar inicialmente invisível ou extremamente discreta;
-   navbar aparecendo progressivamente durante o primeiro scroll;
-   GSAP + ScrollTrigger;
-   scroll controla a progressão da animação;
-   scroll para baixo avança;
-   scroll para cima retrocede;
-   Hero permanece pinned;
-   a página não passa para a próxima seção antes do final da animação;
-   estado final permanece visível;
-   suporte a `prefers-reduced-motion`.

### Conceito visual

Um jovem sentado lendo um livro.

A cena começa com movimentos sutis:

-   personagem;
-   cadeira;
-   caneta;
-   ambiente.

Depois:

-   câmera se aproxima do livro;
-   enquadramento entra nas páginas;
-   câmera entra visualmente no livro;
-   termina nas páginas com tonalidade levemente amarelada.

O asset final poderá ser integrado posteriormente.

A arquitetura do Hero não deve depender de um asset específico.

------------------------------------------------------------------------

# 14. Fase 05 --- Supabase e Banco de Dados

Criar a estrutura necessária quando esta fase começar.

Exemplo:

``` text
src/lib/supabase/
supabase/migrations/
```

Responsabilidades:

-   cliente Supabase;
-   autenticação;
-   PostgreSQL;
-   Row Level Security;
-   Storage.

Dados privados deverão ser isolados por usuário.

------------------------------------------------------------------------

# 15. Fase 06 --- Autenticação

Criar a estrutura necessária, incluindo quando apropriado:

``` text
src/components/auth/
```

Utilizar Supabase Auth.

Funcionalidades:

-   cadastro;
-   login;
-   logout;
-   persistência da sessão;
-   identificação do usuário.

Usuários não autenticados podem visualizar o website público.

Operações privadas exigem autenticação.

------------------------------------------------------------------------

# 16. Fase 07 --- My Library

Criar, quando necessário:

``` text
src/components/library/
src/components/bookshelf/
src/components/book/
```

A biblioteca deverá:

-   apresentar uma estante visual;
-   crescer verticalmente;
-   gerar novas prateleiras conforme necessário;
-   mostrar livros do usuário;
-   funcionar responsivamente;
-   possuir estado vazio;
-   possuir estado para visitante não autenticado.

### Visitante não autenticado

Mostrar uma estante vazia e uma mensagem integrada visualmente, como:

"Entre ou crie sua conta para começar sua biblioteca."

A mensagem deve levar à autenticação.

### Usuário autenticado sem livros

Mostrar estante vazia, mas não pedir login.

O usuário deve conseguir adicionar livros.

### Usuário autenticado com livros

Mostrar os livros cadastrados.

------------------------------------------------------------------------

# 17. Livros

Cada livro deverá possuir, quando disponível:

-   título;
-   autor;
-   capa;
-   ISBN;
-   número de páginas;
-   ano de publicação;
-   progresso;
-   datas relevantes;
-   identificador externo.

Campos opcionais não devem impedir o cadastro.

------------------------------------------------------------------------

# 18. Progresso de Leitura

O progresso será de 0 a 100.

Estados derivados:

-   0% → Not Started
-   1--99% → Reading
-   100% → Finished

Não manter um campo separado de `isRead` se o estado puder ser derivado
do progresso.

O progresso é a fonte de verdade do estado de leitura.

------------------------------------------------------------------------

# 19. Visualização do Progresso nas Capas

A capa deverá representar o progresso:

-   0% → grayscale/desaturada;
-   progresso intermediário → cor aparece progressivamente;
-   100% → totalmente colorida.

A implementação pode utilizar:

-   layers;
-   clipping;
-   masks;
-   gradients;
-   técnicas CSS equivalentes.

Não é necessário alterar fisicamente os arquivos das capas.

------------------------------------------------------------------------

# 20. Interação com Prateleiras

Cada prateleira possuirá sua própria interação de adição.

Ao passar o mouse:

-   aparece um botão circular `+`;
-   a transição é suave;
-   o cursor indica interação.

O botão pertence à prateleira atualmente em interação.

Não utilizar um único botão fixo associado à primeira prateleira.

Em dispositivos sem hover, fornecer alternativa de interação adequada.

Clicar no `+` abre o modal de adição de livros.

------------------------------------------------------------------------

# 21. Fase 08 --- Gerenciamento de Livros

Criar quando a fase começar:

``` text
src/components/book-modal/
src/lib/books/
```

O sistema deverá permitir:

-   pesquisar livros;
-   selecionar edição;
-   adicionar livro;
-   adicionar manualmente;
-   editar;
-   remover;
-   atualizar progresso.

------------------------------------------------------------------------

# 22. Busca de Livros

Pesquisar por:

-   título;
-   autor;
-   ISBN.

Ordem:

1.  Google Books API;
2.  Open Library API como fallback.

Resultados devem apresentar informações suficientes para identificar a
edição correta.

Exibir, quando disponível:

-   capa;
-   título;
-   autor;
-   ano;
-   dados da edição;
-   ação de seleção.

Após seleção, mostrar confirmação antes de salvar.

------------------------------------------------------------------------

# 23. Confirmação do Livro

Permitir confirmar ou editar:

-   capa;
-   título;
-   autor;
-   páginas;
-   ano de publicação;
-   ISBN;
-   progresso.

A ação `Mark as Finished` define progresso como 100%.

------------------------------------------------------------------------

# 24. Adição Manual

Campos obrigatórios:

-   título;
-   autor.

Campos opcionais:

-   páginas;
-   ano;
-   ISBN;
-   capa.

Também permitir definir progresso.

------------------------------------------------------------------------

# 25. Capas Personalizadas

Capas enviadas pelo usuário serão armazenadas no Supabase Storage.

A referência do arquivo deverá ser associada ao livro no banco.

------------------------------------------------------------------------

# 26. Edição de Livros

Clicar em um livro abre um modal de edição.

Permitir:

-   alterar progresso;
-   alterar informações editáveis;
-   salvar;
-   remover.

Se o progresso chegar a 100%:

-   o livro é considerado concluído;
-   contribui para a contagem anual.

Se sair de 100%:

-   deixa de ser considerado concluído.

------------------------------------------------------------------------

# 27. Fase 09 --- Reading Progress

Criar:

``` text
src/components/reading-progress/
```

quando a fase começar.

A métrica principal é a quantidade de livros concluídos durante o ano.

Não utilizar simplesmente a quantidade de livros adicionados à
biblioteca.

------------------------------------------------------------------------

# 28. Referência Estatística

Fonte:

"Retratos da Leitura no Brasil" --- Instituto Pró-Livro --- edição de
2024.

O levantamento registrou média de aproximadamente 3,96 livros por ano
entre o conjunto de entrevistados, considerando livros lidos
integralmente ou em parte.

Para a visualização do website, a referência poderá ser apresentada como
aproximadamente 4 livros por ano.

A referência deve ser configurável.

Não espalhar o valor pelo código.

------------------------------------------------------------------------

# 29. Gráfico

O gráfico deverá apresentar:

-   quantidade de livros concluídos pelo usuário;
-   evolução;
-   referência estatística;
-   indicação visual quando o usuário ultrapassar a referência.

O objetivo é representar progresso pessoal.

Não criar ranking ou competição entre usuários.

------------------------------------------------------------------------

# 30. Fase 10 --- Footer

Criar:

``` text
src/components/footer/
```

quando a fase começar.

O Footer deverá conter:

-   navegação;
-   informações do website;
-   créditos;
-   referência estatística.

------------------------------------------------------------------------

# 31. Autenticação na Navbar

Usuário não autenticado:

-   Entrar;
-   Cadastrar.

Usuário autenticado:

-   identificação ou avatar;
-   opções da conta;
-   logout.

A navbar deve refletir o estado atual da sessão.

------------------------------------------------------------------------

# 32. Segurança

Cada usuário deve acessar somente seus próprios livros.

Essa regra deve ser garantida pelo banco.

Supabase Row Level Security é obrigatório.

Não confiar apenas em filtros no frontend.

Não expor secrets.

------------------------------------------------------------------------

# 33. Persistência

Livros selecionados através das APIs devem ser persistidos no banco.

As APIs externas servem principalmente para descoberta.

A biblioteca deve carregar os dados persistidos em vez de consultar as
APIs a cada carregamento.

------------------------------------------------------------------------

# 34. Responsividade

Todo o website deve considerar:

-   mobile;
-   tablet;
-   desktop.

Não criar desktop primeiro e simplesmente reduzir depois.

Cada nova funcionalidade deve considerar diferentes tamanhos de tela.

------------------------------------------------------------------------

# 35. Acessibilidade

Considerar:

-   HTML semântico;
-   teclado;
-   foco;
-   labels;
-   alt text;
-   contraste;
-   `prefers-reduced-motion`;
-   alternativas para interações dependentes de hover.

------------------------------------------------------------------------

# 36. Performance

Priorizar:

-   imagens otimizadas;
-   assets comprimidos;
-   formatos modernos quando apropriado;
-   Server Components quando apropriado;
-   Client Components somente quando necessários;
-   baixo número de requests;
-   animações eficientes;
-   evitar processamento pesado durante scroll.

------------------------------------------------------------------------

# 37. Princípios Arquiteturais

Evitar inicialmente:

-   Redux;
-   Express;
-   MongoDB;
-   microservices;
-   Three.js;
-   bibliotecas desnecessárias.

Somente introduzir uma dessas tecnologias se existir necessidade técnica
concreta e documentada.

Não criar abstrações prematuras.

Não criar arquivos apenas para preencher uma estrutura idealizada.

------------------------------------------------------------------------

# 38. Ordem de Desenvolvimento

Ordem inicial sugerida:

1.  Fundação
2.  Sistema visual
3.  Navbar
4.  Hero
5.  Supabase
6.  Banco de dados
7.  Autenticação
8.  My Library
9.  Gerenciamento de livros
10. Reading Progress
11. Footer
12. Responsividade e acessibilidade
13. Performance
14. Testes
15. Revisão final
16. Deploy

A ordem pode ser ajustada se uma dependência técnica justificar.

Mudanças relevantes devem ser documentadas.

------------------------------------------------------------------------

# 39. Regra de Evolução dos Arquivos

A arquitetura é planejada antecipadamente, mas os arquivos são
materializados incrementalmente.

Exemplo:

Não criar durante a fundação:

``` text
src/lib/books/google-books.ts
src/lib/books/open-library.ts
src/components/book-modal/AddBookModal.tsx
src/components/auth/LoginForm.tsx
```

se essas funcionalidades ainda não estiverem sendo implementadas.

Quando a fase correspondente começar, criar os arquivos necessários para
suas responsabilidades reais.

------------------------------------------------------------------------

# 40. Definition of Done

Uma funcionalidade somente está concluída quando:

-   funciona;
-   TypeScript está válido;
-   lint passa;
-   checks relevantes passam;
-   comportamento responsivo foi considerado;
-   acessibilidade foi considerada;
-   segurança foi considerada quando aplicável;
-   documentação relevante foi atualizada;
-   código morto foi removido;
-   dependências desnecessárias não foram adicionadas.

O website deve permanecer funcional ao final de cada fase.

------------------------------------------------------------------------

# 41. Regra para o Agente

Antes de cada fase:

1.  ler `AGENTS.md`;
2.  ler o `plan.md`;
3.  analisar o estado atual;
4.  verificar `tasks.md`;
5.  identificar arquivos necessários;
6.  verificar dependências.

Durante a fase:

-   criar somente os arquivos necessários;
-   respeitar a arquitetura;
-   manter o escopo;
-   evitar complexidade prematura.

Depois:

-   executar checks;
-   corrigir problemas;
-   atualizar `tasks.md`;
-   atualizar documentação relevante;
-   registrar decisões arquiteturais quando necessário.

O agente não deve tentar construir todo o website em uma única etapa.
