# Banco de Dados — Online Library

Modelo de dados, Row Level Security e fluxo de migrations do website. O
schema é definido **somente** pelas migrations em `supabase/migrations/`,
que são a fonte de verdade. Este documento explica as regras e os
motivos que não aparecem diretamente no SQL.

Decisão relacionada: `decisions.md`, 006.

## Visão geral

``` text
auth.users            (Supabase Auth: identidade, e-mail, senha)
    │
    ├── profiles      (1:1, dados complementares)
    │
    └── user_books    (N, um livro na biblioteca do usuário)
              │
              ▼
            books     (dados do livro, compartilháveis)
```

- **`auth.users` é a fonte da identidade.** O projeto não cria tabela
  própria de usuários nem armazena senhas ou e-mails fora do Auth.
- `profiles` e `user_books` referenciam `auth.users.id` diretamente.
  `user_books.user_id` **não** referencia `profiles.id`: a biblioteca
  funciona mesmo sem profile, e o RLS compara direto com `auth.uid()`.
- `books` guarda somente dados do livro. Tudo o que é pessoal (progresso,
  datas, opinião) fica em `user_books`.

## Tabelas

### `profiles`

| Coluna         | Tipo          | Regras                                        |
| -------------- | ------------- | --------------------------------------------- |
| `id`           | `uuid`        | PK; FK → `auth.users.id`, `on delete cascade` |
| `display_name` | `text`        | opcional                                      |
| `avatar_url`   | `text`        | opcional                                      |
| `created_at`   | `timestamptz` | `not null`, default `now()`                   |
| `updated_at`   | `timestamptz` | `not null`, default `now()`, trigger          |

O profile é criado pelo trigger `users_create_profile` em `auth.users`
(`decisions.md`, 008), na mesma transação do cadastro, com
`display_name` vindo de `raw_user_meta_data.display_name`:

- espaços nas extremidades são removidos;
- o nome é truncado em 80 caracteres;
- vazio ou ausente vira `null`.

Depois disso, `profiles.display_name` é a fonte de verdade; a metadata do
Auth não é sincronizada. A função `create_profile_for_new_user()` é
`security definer` e nenhum papel da API pode executá-la.

### `books`

| Coluna             | Tipo          | Regras                                  |
| ------------------ | ------------- | --------------------------------------- |
| `id`               | `uuid`        | PK, default `gen_random_uuid()`         |
| `title`            | `text`        | obrigatório, não vazio                  |
| `author`           | `text`        | obrigatório, não vazio                  |
| `cover_url`        | `text`        | opcional, somente `https://`            |
| `isbn`             | `text`        | opcional, `unique`, ISBN-13 (só dígitos) |
| `pages`            | `integer`     | opcional, maior que 0                   |
| `publication_year` | `integer`     | opcional                                |
| `source`           | `text`        | opcional: `google_books` ou `open_library` |
| `source_id`        | `text`        | opcional; obrigatório com `source`      |
| `created_at`       | `timestamptz` | `not null`, default `now()`             |
| `updated_at`       | `timestamptz` | `not null`, default `now()`, trigger    |

- O mesmo registro de `books` pode estar na biblioteca de vários
  usuários.
- `isbn` identifica a edição e é único. É guardado sempre como ISBN-13,
  só dígitos: um ISBN-10 é convertido para o ISBN-13 equivalente antes de
  chegar ao banco (`docs/integracoes.md`). Edições diferentes de uma obra
  têm ISBNs diferentes e são livros diferentes.
- `source` + `source_id` identificam o livro na fonte externa de onde veio
  (id do volume no Google Books; edição `OL…M` ou obra `OL…W` no Open
  Library) e são únicos em par. Livros adicionados manualmente não têm
  origem (`decisions.md`, 011).
- Título e autor nunca identificam um livro: dois registros podem ter o
  mesmo título.
- `publication_year` não tem faixa válida: qualquer limite seria uma
  regra de negócio ainda não definida.
- `cover_url` guarda a URL da capa escolhida, sem cópia no Storage.

### `user_books`

| Coluna        | Tipo          | Regras                                                 |
| ------------- | ------------- | ------------------------------------------------------ |
| `id`          | `uuid`        | PK, default `gen_random_uuid()`                        |
| `user_id`     | `uuid`        | `not null`; FK → `auth.users.id`, `on delete cascade`  |
| `book_id`     | `uuid`        | `not null`; FK → `books.id`, `on delete restrict`      |
| `progress`    | `smallint`    | `not null`, default `0`, entre 0 e 100                 |
| `position`    | `integer`     | `not null`, ≥ 0, única por usuário; ordem da estante   |
| `started_at`  | `timestamptz` | opcional                                               |
| `finished_at` | `timestamptz` | opcional                                               |
| `feedback`    | `text`        | opcional, até 5000 caracteres                          |
| `created_at`  | `timestamptz` | `not null`, default `now()`                            |
| `updated_at`  | `timestamptz` | `not null`, default `now()`, trigger                   |

`unique (user_id, book_id)`: um usuário não adiciona o mesmo registro de
livro duas vezes.

**Ordem da estante.** `position` define a ordem dos livros na estante de
cada usuário (`decisions.md`, 011):

- `unique (user_id, position)` é `deferrable initially immediate`: a
  unicidade é verificada no fim de cada comando, para que uma
  reordenação troque posições de uma só vez.
- Inserção sem `position`: o trigger `user_books_set_position` coloca o
  livro no fim da estante do usuário (maior posição + 1), com um lock por
  usuário (`pg_advisory_xact_lock`) contra inserções simultâneas.
- Remover um livro deixa um buraco na sequência; só a ordem relativa
  importa.
- Registros anteriores à migration receberam posições pela ordem de
  adição (`created_at`, `id`).

**Status de leitura.** Não existe `status` nem `is_read`. O status é
derivado de `progress`, que é a fonte de verdade:

| `progress` | Status      |
| ---------- | ----------- |
| 0          | Not Started |
| 1–99       | Reading     |
| 100        | Finished    |

**Datas de leitura.** `started_at` e `finished_at` são opcionais e não
são preenchidas automaticamente. A regra de quando uma leitura começa ou
termina será implementada com a lógica da biblioteca. Por serem
`timestamptz`, a contagem anual (Fase 09) deve considerar o fuso horário
do usuário ao extrair o ano de `finished_at`.

**Feedback.** Opinião pessoal do usuário sobre o livro. Pertence ao
relacionamento usuário ↔ livro, por isso fica em `user_books`. O limite
de 5000 caracteres existe apenas para proteger o banco contra entradas
excessivas; não é regra de produto e pode ser revisto. Comentários
públicos, ratings e reviews sociais não fazem parte do modelo atual.

## Timestamps

`created_at` e `updated_at` usam default `now()`. Um único trigger
reutilizável, `public.set_updated_at()`, grava `now()` em `updated_at`
em todo `update` das três tabelas, inclusive quando o próprio `update`
tenta definir outro valor.

## Exclusão

| Relação                        | `on delete` | Efeito                                              |
| ------------------------------ | ----------- | --------------------------------------------------- |
| `profiles.id` → `auth.users`   | `cascade`   | Remover o usuário remove seu profile                |
| `user_books.user_id` → `auth.users` | `cascade` | Remover o usuário remove sua biblioteca          |
| `user_books.book_id` → `books` | `restrict`  | Um livro presente em alguma biblioteca não é removido |

`books` não é removido em cascata com o usuário: o mesmo registro pode
estar na biblioteca de outras pessoas.

## Índices

Além das chaves primárias, existem somente os índices das constraints
únicas:

- `user_books (user_id, book_id)`: atende às policies (`user_id =
  auth.uid()`) e à verificação de duplicata;
- `user_books (user_id, position)`: atende à ordenação da estante;
- `books (isbn)` e `books (source, source_id)`: atendem à busca do livro
  no catálogo antes de criá-lo.

Não há índice em `user_books.book_id`. Ele só seria usado ao remover um
livro (verificação do `restrict`) ou ao consultar quem possui um livro,
e nenhuma dessas operações existe ainda. O Performance Advisor do
Supabase pode sinalizar essa FK sem índice; criar o índice quando a
remoção ou deduplicação de `books` for implementada.

## Privilégios e Row Level Security

Os privilégios de tabela são definidos explicitamente na migration, sem
depender dos defaults da plataforma:

| Tabela       | `anon`    | `authenticated`                      |
| ------------ | --------- | ------------------------------------ |
| `profiles`   | nenhum    | `select`, `insert`, `update`         |
| `books`      | nenhum    | `select`                             |
| `user_books` | nenhum    | `select`, `insert`, `update`, `delete` |

RLS está ativo nas três tabelas. Policies (todas para `authenticated`;
`auth.uid()` é usado como `(select auth.uid())`, avaliado uma vez por
consulta):

| Tabela       | Operação | Regra                                                   |
| ------------ | -------- | ------------------------------------------------------- |
| `profiles`   | select   | `auth.uid() = id`                                       |
| `profiles`   | insert   | `auth.uid() = id`                                       |
| `profiles`   | update   | `auth.uid() = id` (linha atual e linha nova)            |
| `books`      | select   | qualquer usuário autenticado                            |
| `user_books` | select   | `auth.uid() = user_id`                                  |
| `user_books` | insert   | `auth.uid() = user_id`                                  |
| `user_books` | update   | `auth.uid() = user_id` (impede transferir para outro)   |
| `user_books` | delete   | `auth.uid() = user_id`                                  |

- Visitantes anônimos não acessam nenhuma das tabelas.
- Não há policy de `delete` em `profiles`: o profile é removido junto com
  o usuário.
- **Escrita direta em `books` está fechada** para usuários: não há grant
  nem policy de `insert`/`update`/`delete`. Livros entram no catálogo só
  pela função `add_book_to_library` (abaixo).
- Profiles públicos, visibilidade entre amigos e busca de usuários não
  existem nesta fase.

## Funções

| Função | Segurança | Quem executa | O que faz |
| ------ | --------- | ------------ | --------- |
| `add_book_to_library(p_title, p_author, p_cover_url, p_pages, p_publication_year, p_isbn, p_source, p_source_id)` | `security definer`, `search_path` vazio | `authenticated` | Valida os dados, reutiliza o livro do catálogo (por ISBN ou origem) ou o cria, e adiciona à estante de `auth.uid()` com progresso 0, no fim. Devolve `user_book_id` e `already_in_library` |
| `set_library_order(p_user_book_ids uuid[])` | `security invoker` (sob RLS), `strict` | `authenticated` | Grava a ordem da estante: os ids recebidos ocupam as posições 0, 1, 2…; os demais livros do usuário vão para o fim |
| `set_user_book_position()` | trigger, como quem insere | nenhum papel da API | Posição padrão de livros novos |

- `anon` não executa nenhuma das funções.
- `add_book_to_library` nunca recebe o dono como parâmetro: usa sempre
  `auth.uid()`. Erros de validação usam o SQLSTATE `22023`.
- Nenhuma policy nova: `set_library_order` só altera linhas que o RLS de
  `user_books` permite ao usuário atualizar.

## Storage

Nenhum bucket foi criado. As capas personalizadas (Fase 08) usarão o
Supabase Storage, com bucket e policies criados por migration e acesso
restrito ao dono do arquivo.

## Migrations

- Toda alteração estrutural é uma nova migration, criada com
  `npx supabase migration new <nome>`. Migrations já aplicadas no
  projeto remoto não devem ser editadas.
- Nada é criado manualmente pelo Dashboard.
- O Supabase CLI é uma dev dependency (`npx supabase …`); não é
  necessário instalá-lo globalmente.

### Ambiente local

Requer um runtime compatível com Docker (Docker Desktop, OrbStack,
Colima…).

``` bash
npx supabase start      # sobe o stack local
npx supabase db reset   # recria o banco local a partir das migrations
npx supabase test db    # executa os testes pgTAP de supabase/tests/
npx supabase stop
```

Se o CLI não encontrar o Docker Desktop, ative o socket padrão do
Docker (Settings → Advanced) ou exporte `DOCKER_HOST` apontando para o
socket do Docker Desktop (`unix://$HOME/.docker/run/docker.sock`).

`supabase/tests/library_test.sql` cobre a posição (trigger, unicidade,
troca em um comando), `set_library_order` (inclusive com ids de outro
usuário), o isolamento da posição entre usuários e `add_book_to_library`
(validação, duplicatas, reaproveitamento do catálogo, permissões);
`supabase/tests/rls_test.sql` cobre o isolamento entre usuários e o
acesso anônimo; `supabase/tests/schema_test.sql` cobre constraints,
foreign keys, `updated_at`, RLS ativo e o conjunto exato de policies;
`supabase/tests/profile_trigger_test.sql` cobre a criação do profile e
os privilégios da função do trigger.

Última validação (2026-10-06, Fase 08): Supabase CLI 2.119.0,
PostgreSQL 17.11 local; `db reset` aplicou as três migrations do zero e
`test db` passou com 90/90 testes (36 da estante, 16 do trigger, 21 de
RLS, 17 de schema). O preenchimento de `position` em registros
existentes foi verificado aplicando a migration sobre dados das fases
anteriores.

### Projeto remoto

O projeto remoto (Online Library, `sa-east-1`, PostgreSQL 17.11) aplica
as mesmas migrations, de forma controlada:

``` bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

O `login` é feito pelo fluxo do navegador, no terminal de quem opera o
projeto; o token fica fora do repositório. Com a sessão ativa, o CLI
2.119 conecta ao banco remoto com uma role temporária ("Initialising
login role…"), sem pedir a senha do banco. A senha, se algum dia for
usada, nunca deve ser salva no repositório. O vínculo fica em
`supabase/.temp/`, ignorado pelo Git. O `major_version` em
`supabase/config.toml` (17) deve corresponder à versão do Postgres
remoto.

Estado atual (2026-09-30): projeto vinculado e migration
`20260930225042_create_initial_library_schema.sql` aplicada (`migration
list --linked` mostra local = remoto). A validação remota foi somente
leitura (catálogo do Postgres via `npx supabase db query --linked` e
`npx supabase db advisors --linked`): schema, constraints, foreign keys,
RLS, policies, grants e triggers conferem com a migration. Os testes
pgTAP não são executados no remoto.

A migration `20261002160116_create_profile_on_signup.sql` (Fase 06B) foi
aplicada no remoto em 2026-10-05 (`db push`, após `--dry-run`). Trigger,
função (`security definer`, sem `EXECUTE` para os papéis da API) e
policies foram conferidos no catálogo, sem inserir dados.

A migration `20261006184007_add_library_order_and_book_sources.sql`
(Fase 08) foi aplicada no remoto em 2026-10-06 (`db push`, após
`--dry-run`; as tabelas estavam vazias). Colunas, constraints, trigger,
funções (segurança, `search_path` vazio, `EXECUTE` só para
`authenticated`), grants de `books` e as 8 policies foram conferidos no
catálogo. O fluxo das funções foi exercitado no remoto dentro de um
bloco PL/pgSQL encerrado por `raise exception`, que desfaz tudo; depois
dele, `books`, `user_books`, `profiles` e `auth.users` continuaram com 0
linhas.

## Supabase Auth

Configuração não sensível (remoto conferido com `npx supabase config
diff`, somente leitura):

| Item | Remoto | Local (`config.toml`) |
| --- | --- | --- |
| Cadastro por e-mail e senha | ativo | ativo |
| Confirmação de e-mail | ativa | ativa |
| Senha mínima | 6 caracteres | 6 caracteres |
| Site URL | `http://localhost:3000` | `http://localhost:3000` |
| Redirect URLs | nenhuma | nenhuma |
| Template de confirmação | igual a `supabase/templates/confirmation.html`, configurado no Dashboard (o `config diff` compara só o assunto; o corpo foi validado por e-mail real) | `supabase/templates/confirmation.html` (`token_hash`) |
| SMTP | personalizado (Gmail SMTP, provisório) | Mailpit (local) |

O fluxo de confirmação está em `decisions.md` (008 e 009). Ficam
pendentes a Site URL de produção e um SMTP definitivo com domínio
próprio.

## Acesso pelo Next.js

O website acessa o banco somente pelos clientes de `src/lib/supabase/`
(`decisions.md`, 007), sempre com a chave publishable e sujeito ao RLS:

- `client.ts`: Client Components;
- `server.ts`: Server Components, Server Functions e Route Handlers
  (um cliente por request, sessão lida dos cookies);
- `proxy.ts`: usado por `src/proxy.ts` para renovar a sessão em cada
  request (`decisions.md`, 009).

Nenhum código do website usa a secret key ou a `service_role`.

A estante (My Library) usa o browser client, somente para usuários
autenticados (`src/lib/books/user-books.ts`):

- leitura: `user_books` com o livro embutido, ordenado por `position`
  (depois `created_at`, `id`); o RLS devolve apenas as linhas do próprio
  usuário;
- adicionar: `rpc("add_book_to_library")`;
- reordenar: `rpc("set_library_order")`, uma chamada por drop;
- remover: `delete` em `user_books` (sob RLS).

As buscas externas (Google Books, Open Library) não tocam o banco; ver
`docs/integracoes.md`.

## Variáveis de ambiente

Documentadas em `.env.example`; os valores locais ficam em `.env.local`,
ignorado pelo Git.

| Variável                               | Uso                                   |
| -------------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable (pode ir ao navegador) |

Nunca versionar nem expor ao navegador: senha do banco, secret key,
`service_role` key ou qualquer outra credencial privada.

As variáveis das fontes de livros (`GOOGLE_BOOKS_API_KEY`,
`BOOKS_API_CONTACT`), somente do servidor, estão em
`docs/integracoes.md`.

## Tipos TypeScript

`src/types/database.ts` é gerado pela Supabase CLI a partir do projeto
remoto vinculado e não deve ser editado manualmente. Depois de aplicar
uma nova migration no remoto, regenerar com:

``` bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

A geração a partir do banco local (`--local`) produz os mesmos tipos,
mas sem formatação e sem o bloco `__InternalSupabase`; por isso o
arquivo versionado usa `--linked`.
