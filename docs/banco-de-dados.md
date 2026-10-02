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

Não existe trigger que cria o profile no cadastro. Como e quando o
profile é criado será decidido na Fase 06 (Autenticação).

### `books`

| Coluna             | Tipo          | Regras                                  |
| ------------------ | ------------- | --------------------------------------- |
| `id`               | `uuid`        | PK, default `gen_random_uuid()`         |
| `title`            | `text`        | obrigatório, não vazio                  |
| `author`           | `text`        | obrigatório, não vazio                  |
| `cover_url`        | `text`        | opcional                                |
| `isbn`             | `text`        | opcional, **sem** `unique`              |
| `pages`            | `integer`     | opcional, maior que 0                   |
| `publication_year` | `integer`     | opcional                                |
| `created_at`       | `timestamptz` | `not null`, default `now()`             |
| `updated_at`       | `timestamptz` | `not null`, default `now()`, trigger    |

- O mesmo registro de `books` pode estar na biblioteca de vários
  usuários.
- `isbn` não é único: edições diferentes de uma obra têm identificadores
  diferentes, nem toda fonte fornece ISBN, e a estratégia de
  normalização de edições ainda não foi definida.
- `publication_year` não tem faixa válida: qualquer limite seria uma
  regra de negócio ainda não definida.
- O identificador externo (Google Books/Open Library) citado no
  `plan.md` (seção 17) ainda não existe; ele entra com a integração
  (Fase 08), junto com a estratégia de deduplicação.

### `user_books`

| Coluna        | Tipo          | Regras                                                 |
| ------------- | ------------- | ------------------------------------------------------ |
| `id`          | `uuid`        | PK, default `gen_random_uuid()`                        |
| `user_id`     | `uuid`        | `not null`; FK → `auth.users.id`, `on delete cascade`  |
| `book_id`     | `uuid`        | `not null`; FK → `books.id`, `on delete restrict`      |
| `progress`    | `smallint`    | `not null`, default `0`, entre 0 e 100                 |
| `started_at`  | `timestamptz` | opcional                                               |
| `finished_at` | `timestamptz` | opcional                                               |
| `feedback`    | `text`        | opcional, até 5000 caracteres                          |
| `created_at`  | `timestamptz` | `not null`, default `now()`                            |
| `updated_at`  | `timestamptz` | `not null`, default `now()`, trigger                   |

`unique (user_id, book_id)`: um usuário não adiciona o mesmo registro de
livro duas vezes.

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

Além das chaves primárias, existe somente o índice da constraint
`unique (user_id, book_id)`. Como `user_id` é a primeira coluna, ele
também atende às consultas da biblioteca e às policies (`user_id =
auth.uid()`).

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
- **Escrita em `books` está fechada** para usuários: não há grant nem
  policy de `insert`/`update`/`delete`. A forma de criar e atualizar
  livros será definida com a integração Google Books/Open Library
  (Fase 08). Até lá, só o `service_role` (que ignora RLS e nunca vai ao
  navegador) consegue escrever.
- Profiles públicos, visibilidade entre amigos e busca de usuários não
  existem nesta fase.

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

`supabase/tests/rls_test.sql` cobre o isolamento entre usuários e o
acesso anônimo; `supabase/tests/schema_test.sql` cobre constraints,
foreign keys, `updated_at`, RLS ativo e o conjunto exato de policies.

Última validação (2026-09-30, Fase 05A): Supabase CLI 2.119.0,
PostgreSQL 17.11 local; `start` e `db reset` aplicaram a migration do
zero e `test db` passou com 38/38 testes (21 de RLS, 17 de schema).

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

## Acesso pelo Next.js

O website acessa o banco somente pelos clientes de `src/lib/supabase/`
(`decisions.md`, 007), sempre com a chave publishable e sujeito ao RLS:

- `client.ts`: Client Components;
- `server.ts`: Server Components, Server Functions e Route Handlers
  (um cliente por request, sessão lida dos cookies).

Nenhum código do website usa a secret key ou a `service_role`.

## Variáveis de ambiente

Documentadas em `.env.example`; os valores locais ficam em `.env.local`,
ignorado pelo Git.

| Variável                               | Uso                                   |
| -------------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable (pode ir ao navegador) |

Nunca versionar nem expor ao navegador: senha do banco, secret key,
`service_role` key ou qualquer outra credencial privada.

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
