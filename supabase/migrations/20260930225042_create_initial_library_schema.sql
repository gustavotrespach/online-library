-- Schema inicial da biblioteca: profiles, books e user_books.
-- Modelo, comportamento de exclusão e RLS: docs/banco-de-dados.md.

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: dados complementares de auth.users (a identidade fica no Auth)
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- books: dados do livro, compartilháveis entre usuários (sem dados de leitura)
-- ---------------------------------------------------------------------

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  author text not null check (btrim(author) <> ''),
  cover_url text,
  -- Sem UNIQUE: a estratégia de normalização de edições ainda não foi definida.
  isbn text,
  pages integer check (pages > 0),
  publication_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_books: um livro na biblioteca de um usuário. O status de leitura é
-- derivado de progress (0 = Not Started, 1–99 = Reading, 100 = Finished).
-- ---------------------------------------------------------------------

create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete restrict,
  progress smallint not null default 0 check (progress between 0 and 100),
  started_at timestamptz,
  finished_at timestamptz,
  -- Limite apenas de proteção contra entradas excessivas, não regra de produto.
  feedback text check (char_length(feedback) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- O índice desta constraint também atende às consultas por user_id (RLS).
  unique (user_id, book_id)
);

create trigger user_books_set_updated_at
before update on public.user_books
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Privilégios explícitos, sem depender dos defaults da plataforma.
-- anon não acessa estas tabelas; o RLS restringe as linhas de authenticated.
-- ---------------------------------------------------------------------

revoke all on table public.profiles, public.books, public.user_books from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.books to authenticated;
grant select, insert, update, delete on table public.user_books to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;

-- (select auth.uid()) é avaliado uma vez por consulta, e não por linha.

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Escrita em books fica fechada até a estratégia de criação de livros ser
-- definida com a integração Google Books / Open Library.
create policy "Authenticated users can view books"
on public.books for select
to authenticated
using (true);

create policy "Users can view their own library entries"
on public.user_books for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add entries to their own library"
on public.user_books for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own library entries"
on public.user_books for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own library entries"
on public.user_books for delete
to authenticated
using ((select auth.uid()) = user_id);
