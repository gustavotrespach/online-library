# AGENTS.md

## 1. Identidade do Projeto

O Online Library é um WEBSITE.

Ele não é um aplicativo mobile, aplicativo desktop ou aplicativo nativo.

O projeto utiliza Next.js como framework. O Next.js utiliza uma pasta
técnica chamada `src/app/` quando o App Router é utilizado. Essa
nomenclatura é uma convenção do framework e não significa que o produto
seja um aplicativo.

Sempre trate o Online Library como um website.

------------------------------------------------------------------------

## 2. Função deste Arquivo

Este arquivo define como agentes de IA devem trabalhar neste
repositório.

O `plan.md` define principalmente:

-   o que o website deve ser;
-   seus requisitos;
-   sua arquitetura planejada;
-   sua estrutura;
-   suas fases de desenvolvimento.

Este arquivo define principalmente:

-   como o agente deve trabalhar;
-   como deve modificar o projeto;
-   como deve criar arquivos;
-   como deve respeitar a arquitetura;
-   como deve validar suas alterações.

------------------------------------------------------------------------

## 3. Idioma

Toda documentação do projeto e todas as instruções destinadas aos
agentes devem ser escritas em português do Brasil.

O código-fonte deve seguir as convenções técnicas do ecossistema
JavaScript/TypeScript.

Preferir inglês para:

-   variáveis;
-   funções;
-   componentes;
-   hooks;
-   tipos;
-   interfaces;
-   nomes de arquivos de código;
-   nomes de diretórios de código.

Exemplo:

``` ts
interface Book {
  title: string;
  author: string;
  progress: number;
}
```

Evitar:

``` ts
interface Livro {
  titulo: string;
  autor: string;
  progresso: number;
}
```

Comentários no código devem ser utilizados com moderação e
principalmente quando explicarem decisões ou comportamentos que não
sejam óbvios.

------------------------------------------------------------------------

## 4. Stack Principal

Utilizar preferencialmente:

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

Não adicionar tecnologias importantes sem uma necessidade técnica
concreta e uma justificativa documentada.

------------------------------------------------------------------------

## 5. Antes de Modificar o Projeto

Sempre:

1.  leia o `AGENTS.md`;
2.  leia o `plan.md`;
3.  consulte `tasks.md`, quando existir;
4.  consulte a documentação relevante;
5.  inspecione a implementação existente;
6.  procure funcionalidades reutilizáveis;
7.  determine o menor conjunto de alterações necessário.

Nunca modificar arquivos sem compreender sua função.

------------------------------------------------------------------------

## 6. Regra de Escopo

Cada solicitação deve ser tratada como uma tarefa delimitada.

Implemente somente:

-   o que foi solicitado;
-   o que for tecnicamente necessário para que a solicitação funcione;
-   dependências imediatas da própria tarefa.

Não aproveite uma tarefa para:

-   reescrever componentes não relacionados;
-   alterar toda a arquitetura;
-   trocar bibliotecas;
-   reorganizar o projeto inteiro;
-   criar abstrações prematuras.

Se uma mudança fora do escopo for realmente necessária, explique o
motivo antes de realizá-la quando possível.

------------------------------------------------------------------------

## 7. Estrutura de Pastas

A arquitetura principal deve seguir o `plan.md`.

Estrutura principal:

``` text
src/
├── app/
├── components/
├── lib/
├── types/
└── styles/

supabase/
└── migrations/

docs/
```

A estrutura deverá evoluir de forma incremental.

Não criar antecipadamente todos os arquivos futuros.

------------------------------------------------------------------------

## 8. Regra de Criação de Arquivos

Criar uma pasta ou arquivo somente quando:

-   a fase correspondente começar;
-   existir uma responsabilidade concreta para ele;
-   o código realmente precisar dele.

Não criar arquivos vazios apenas para reservar espaço.

Exemplo: se a integração com Google Books ainda não estiver sendo
implementada, não criar antecipadamente:

``` text
src/lib/books/google-books.ts
```

Quando a integração começar, criar os arquivos necessários para essa
responsabilidade.

A estrutura é planejada antecipadamente, mas materializada
incrementalmente.

------------------------------------------------------------------------

## 9. Não Alterar a Arquitetura Arbitrariamente

O agente deve seguir a estrutura estabelecida no `plan.md`.

Caso identifique uma alternativa tecnicamente melhor:

1.  explique o problema;
2.  apresente a alternativa;
3.  avalie o impacto;
4.  registre uma decisão quando apropriado;
5.  somente então altere a arquitetura.

Não substituir uma arquitetura definida por preferência pessoal.

------------------------------------------------------------------------

## 10. Organização dos Componentes

Componentes devem ser organizados por responsabilidade.

Estrutura esperada conforme o website evoluir:

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

Essas pastas não precisam existir desde o início.

Criá-las quando as respectivas funcionalidades forem implementadas.

Não criar dezenas de componentes pequenos apenas para fragmentar
visualmente o JSX.

------------------------------------------------------------------------

## 11. `src/app/`

`src/app/` é uma pasta técnica do Next.js.

Ela deve conter principalmente:

-   páginas;
-   layouts;
-   rotas;
-   arquivos especiais do Next.js;
-   estilos globais quando apropriado.

Não concentrar toda a lógica do website em `src/app/`.

------------------------------------------------------------------------

## 12. `src/components/`

Responsável pela interface visual e pelas interações do website.

Componentes devem representar responsabilidades reais.

------------------------------------------------------------------------

## 13. `src/lib/`

Responsável por lógica reutilizável, integrações e utilitários.

Exemplos futuros:

``` text
src/lib/
├── supabase/
├── books/
├── validation/
└── utils/
```

Criar essas estruturas conforme forem necessárias.

------------------------------------------------------------------------

## 14. `src/types/`

Responsável por tipos compartilhados e modelos do domínio.

Evitar duplicação de tipos equivalentes.

Criar tipos quando representarem uma entidade importante ou quando
houver necessidade de compartilhamento.

------------------------------------------------------------------------

## 15. `src/styles/`

Utilizar somente para estilos que realmente precisem existir fora dos
estilos globais ou do Tailwind.

Não criar arquivos de estilo separados sem necessidade.

------------------------------------------------------------------------

## 16. Supabase

A integração com Supabase deverá ficar organizada em:

``` text
src/lib/supabase/
```

As migrations deverão ficar em:

``` text
supabase/migrations/
```

Supabase será utilizado para:

-   autenticação;
-   PostgreSQL;
-   armazenamento de capas.

Row Level Security é obrigatório para dados privados dos usuários.

------------------------------------------------------------------------

## 17. Segurança

Nunca confiar somente no frontend para autorização.

Nunca expor:

-   service role keys;
-   secrets;
-   credenciais privadas;
-   tokens sensíveis.

Não inventar credenciais.

Quando uma variável de ambiente for necessária, documentar seu nome sem
expor seu valor.

------------------------------------------------------------------------

## 18. Banco de Dados

Alterações estruturais do banco devem ser realizadas por migrations.

Quando houver alteração relevante:

-   criar ou atualizar a migration apropriada;
-   revisar as políticas de RLS;
-   atualizar `docs/banco-de-dados.md`;
-   verificar os impactos no código existente.

Não alterar o banco de forma silenciosa.

------------------------------------------------------------------------

## 19. APIs Externas

Google Books API e Open Library são utilizadas principalmente para
descoberta de livros.

Depois que o usuário selecionar um livro:

-   os dados relevantes devem ser persistidos;
-   a biblioteca deve utilizar os dados persistidos;
-   não fazer chamadas externas desnecessárias em cada carregamento.

Falhas de APIs externas devem ser tratadas de maneira previsível.

------------------------------------------------------------------------

## 20. Formulários e Validação

Usar:

-   React Hook Form para formulários complexos;
-   Zod para validação.

Dados provenientes de usuários ou APIs externas devem ser considerados
não confiáveis até serem validados.

------------------------------------------------------------------------

## 21. Responsividade

Toda interface nova deve considerar:

-   mobile;
-   tablet;
-   desktop.

Não tratar responsividade como uma tarefa exclusivamente final.

Hover não deve ser o único mecanismo para acessar uma funcionalidade
importante.

------------------------------------------------------------------------

## 22. Acessibilidade

Utilizar:

-   HTML semântico;
-   navegação por teclado;
-   foco adequado;
-   labels;
-   textos alternativos;
-   contraste adequado;
-   `prefers-reduced-motion`.

------------------------------------------------------------------------

## 23. Performance

Priorizar:

-   Server Components quando apropriado;
-   Client Components somente quando necessários;
-   imagens otimizadas;
-   carregamento adequado;
-   baixo número de requests;
-   animações eficientes;
-   evitar trabalho pesado durante scroll;
-   evitar dependências desnecessárias.

------------------------------------------------------------------------

## 24. TypeScript

TypeScript deve ser utilizado em todo o código do projeto.

Evitar `any`.

Quando uma exceção for realmente necessária, sua razão deve ser clara.

Manter tipos de domínio explícitos e consistentes.

------------------------------------------------------------------------

## 25. Novas Dependências

Antes de adicionar uma dependência:

1.  verificar se o projeto já possui uma solução;
2.  verificar se o stack atual resolve o problema;
3.  avaliar o impacto;
4.  justificar tecnicamente a introdução.

Não adicionar bibliotecas apenas por conveniência.

------------------------------------------------------------------------

## 26. Processo de Implementação

### Antes

1.  compreender a tarefa;
2.  ler a documentação relevante;
3.  analisar o código existente;
4.  identificar arquivos que deverão ser criados;
5.  identificar arquivos que deverão ser modificados;
6.  verificar dependências e efeitos colaterais.

### Durante

-   manter o escopo;
-   criar somente arquivos necessários;
-   respeitar a arquitetura;
-   reutilizar código existente;
-   evitar duplicação;
-   manter tipos claros;
-   evitar abstrações prematuras.

### Depois

Executar os checks apropriados:

-   TypeScript;
-   lint;
-   testes existentes;
-   build, quando apropriado.

Depois:

-   corrigir problemas introduzidos;
-   revisar o código;
-   remover código morto;
-   atualizar documentação relevante;
-   atualizar `tasks.md`.

------------------------------------------------------------------------

## 27. Decisões Arquiteturais

Decisões importantes devem ser registradas em:

``` text
decisions.md
```

Registrar decisões que alterem significativamente:

-   arquitetura;
-   stack;
-   banco;
-   autenticação;
-   integrações;
-   estrutura do projeto;
-   comportamento fundamental do website.

Não criar registros para detalhes triviais.

Cada decisão relevante deve explicar:

-   contexto;
-   decisão;
-   motivo;
-   alternativas consideradas;
-   consequências.

------------------------------------------------------------------------

## 28. Documentação

A documentação deve registrar informações que não possam ser inferidas
com segurança a partir do código.

Não duplicar todo o código em documentação.

Documentar principalmente:

-   decisões;
-   arquitetura;
-   comportamento de produto;
-   integrações;
-   modelo de dados;
-   convenções importantes.

------------------------------------------------------------------------

## 29. Não Inventar Informações

Não inventar:

-   credenciais;
-   chaves;
-   URLs privadas;
-   dados de usuários;
-   resultados de APIs;
-   dados de banco;
-   informações ausentes.

Quando algo necessário não estiver disponível, sinalizar claramente.

------------------------------------------------------------------------

## 30. Comunicação ao Final da Tarefa

Ao concluir uma tarefa, informar objetivamente:

1.  o que foi implementado;
2.  quais arquivos foram criados;
3.  quais arquivos foram modificados;
4.  quais checks foram executados;
5.  quais problemas foram encontrados;
6.  quais decisões relevantes foram tomadas;
7.  quais limitações ou dependências permanecem;
8.  qual é o próximo passo natural, quando relevante.

Nunca afirmar que algo foi testado se o teste não foi executado.

------------------------------------------------------------------------

## 31. Regra de Ouro

O projeto deve evoluir incrementalmente.

Sempre priorizar:

clareza \> complexidade

manutenibilidade \> velocidade

arquitetura simples \> abstração prematura

segurança \> conveniência

comportamento verificável \> suposições

O objetivo é manter o website em um estado funcional, compreensível e
continuável por desenvolvedores humanos e futuros agentes de IA.
