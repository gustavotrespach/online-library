# Integrações — Online Library

Fontes externas de livros, normalização dos dados e capas. Decisão
relacionada: `decisions.md`, 011.

As APIs externas servem para **descoberta**. Depois que o usuário escolhe
um livro, os dados vão para o banco (`books`), e a estante só lê o banco:
nenhuma API externa é consultada ao carregar a biblioteca.

## Arquitetura

``` text
Navegador (AddBookDialog)
   │  src/lib/books/catalog.ts       ← valida a resposta com Zod
   ▼
Route Handlers (servidor, só usuários autenticados)
   ├── GET /api/books/search?q=…            busca
   └── GET /api/books/details?provider=…&id=…  edição escolhida
   │  src/lib/books/book-sources.ts   ← lê as variáveis de ambiente
   │  src/lib/books/book-search.ts    ← fallback entre fontes
   ▼
Google Books (google-books.ts)  →  Open Library (open-library.ts)
```

- A interface nunca chama as APIs diretamente nem vê o formato bruto
  delas: tudo chega como `BookSearchResult` (`src/types/book.ts`).
- As respostas externas são validadas com Zod campo a campo; um item
  malformado ou sem título/autor é descartado, sem derrubar a busca.
- A gravação usa a função `add_book_to_library` do banco
  (`docs/banco-de-dados.md`).

## Busca

- Envio explícito (botão ou Enter), sem busca a cada tecla e sem
  autocomplete. Espaços são normalizados; mínimo de 2 e máximo de 200
  caracteres.
- Um ISBN-10 ou ISBN-13 válido (com ou sem hífens) vira busca por ISBN;
  o resto busca por título e autor ao mesmo tempo.
- No máximo 10 resultados por fonte.
- Ordem das fontes: Google Books, depois Open Library. A primeira fonte
  com resultados utilizáveis encerra a busca. Erro (rede, tempo limite de
  6s, HTTP, limite de uso, JSON inválido) ou lista vazia passa para a
  próxima. Se todas falharem, a busca é "indisponível"; se alguma
  respondeu vazio, "nenhum livro encontrado". Nos dois casos a interface
  oferece a entrada manual.
- Cache simples do Next.js nas chamadas externas (`revalidate` de um
  dia): a mesma busca não volta à API. Sem Redis ou banco de cache.

### Detalhes da edição

Ao **selecionar** um resultado (nunca durante a busca), uma chamada busca
os detalhes daquela edição:

- Open Library: `/books/{OL…M}.json`, que traz o número de páginas da
  edição (a busca só traz a mediana da obra, que não é usada).
- Google Books: `/volumes/{id}`, que costuma trazer capas maiores.

Os detalhes completam o resultado sem apagar dados. Se a chamada falhar,
a revisão segue com os dados da busca.

## Google Books (fonte principal)

- Endpoint: `https://www.googleapis.com/books/v1/volumes`, com `fields`
  restrito aos campos usados e `printType=books`.
- **Exige chave.** Sem chave, a API respondeu 429 com cota diária zero no
  projeto compartilhado das chamadas anônimas (verificado em
  2026-10-06). A chave fica em `GOOGLE_BOOKS_API_KEY`, lida somente no
  servidor. Sem ela, a busca usa só o Open Library.
- Normalização:
  - `id` → `externalId`;
  - autores únicos, separados por vírgula;
  - ano: os 4 primeiros dígitos de `publishedDate`;
  - `pageCount` maior que 0 (até 20000), senão `null`;
  - ISBN: `ISBN_13` válido; senão `ISBN_10` válido convertido para
    ISBN-13; senão `null`;
  - capa: a maior de `imageLinks` (`extraLarge` → … →
    `smallThumbnail`), em HTTPS e sem o efeito `edge=curl`.

## Open Library (fallback)

- Endpoints: `https://openlibrary.org/search.json` (descoberta) e
  `https://openlibrary.org/books/{id}.json` (edição escolhida). Sem chave.
- Política de uso: baixo volume (1 requisição/s por padrão; 3/s com
  User-Agent identificado), sem download em massa e sem uso como banco de
  dados do website. As chamadas enviam `User-Agent: OnlineLibrary`, mais o
  contato de `BOOKS_API_CONTACT` quando definido. Em produção, definir
  esse contato.
- A busca pede a obra (`author_name`) e a edição mais relevante
  (`editions.key`, `title`, `isbn`, `cover_i`, `publish_year`). O
  resultado usa a **edição**: título, ISBN, capa e ano dela. Sem edição,
  usa a obra.
- `externalId`: a chave da edição (`OL…M`) ou, sem edição, da obra
  (`OL…W`).

## ISBN

O catálogo guarda o ISBN sempre como **ISBN-13, só dígitos**
(`src/lib/books/isbn.ts`):

- ISBN-13 válido: mantido;
- ISBN-10 válido: convertido para o ISBN-13 equivalente (prefixo 978),
  que identifica a mesma edição;
- dígito verificador errado: descartado. Nenhum ISBN é inventado.

Quando a fonte traz vários, o primeiro ISBN-13 válido tem prioridade.

## Capas

- A capa é guardada como URL em `books.cover_url`, sempre HTTPS.
  Prioridade: a capa da fonte do resultado; sem capa, o fallback visual
  da estante (título e autor sobre um tom de encadernação).
- Open Library: `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`. O
  acesso por id não entra no limite de 100 requisições/5 min por IP que
  vale para ISBN/OLID.
- As capas **não são baixadas nem re-hospedadas** (nem no Supabase
  Storage) nesta fase.
- `next/image` otimiza somente os hosts configurados em `next.config.ts`
  (`images.remotePatterns`, a partir de `src/lib/books/cover-hosts.ts`):
  - `https://books.google.com/books/**`
  - `https://covers.openlibrary.org/b/**`
- Uma URL informada na entrada manual pode ser de qualquer host, que não
  pode estar na lista sem um curinga. Essas capas são exibidas como estão
  (`unoptimized`), sem passar pelo otimizador.
- Capa que não carrega (404, host fora do ar): a estante mostra o
  fallback.

## Entrada manual

- Título e autor obrigatórios. Páginas (1–20000), ano (1 até o ano que
  vem), ISBN (10 ou 13, validado) e URL da capa (somente `https://`) são
  opcionais. A validação usa Zod (`src/lib/validation/book.ts`) e é
  repetida pela função do banco.
- Livros manuais não têm origem (`source` nulo). Com ISBN, um livro já
  existente no catálogo é reutilizado; sem ISBN, cada adição cria um
  registro novo no catálogo.
- Upload de capa (Supabase Storage) fica para uma etapa própria.

## Limitações conhecidas

- O Google Books só entra com `GOOGLE_BOOKS_API_KEY` configurada; o
  caminho dele foi verificado com testes de normalização (formato
  documentado da API), não com chamadas reais.
- As chamadas saem do servidor do website: os limites por IP das APIs
  são compartilhados entre todos os usuários.
- O tempo limite é de 6s por chamada externa.
