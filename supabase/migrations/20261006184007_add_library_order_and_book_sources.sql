-- Ordem persistida da estante e escrita controlada do catálogo de livros.
-- Decisão: decisions.md, 011. Modelo e regras: docs/banco-de-dados.md.

-- ---------------------------------------------------------------------
-- user_books.position: ordem da estante, por usuário
-- ---------------------------------------------------------------------

alter table public.user_books add column position integer;

-- Ordem inicial dos registros existentes: a ordem de adição.
update public.user_books ub
set position = ordered.position
from (
  select id, row_number() over (partition by user_id order by created_at, id) - 1 as position
  from public.user_books
) ordered
where ub.id = ordered.id;

alter table public.user_books alter column position set not null;
alter table public.user_books add constraint user_books_position_check check (position >= 0);

-- Uma posição por livro na estante de cada usuário. Verificada no fim do
-- comando, para que uma reordenação possa trocar posições de uma só vez.
-- O índice também atende à ordenação por usuário.
alter table public.user_books
  add constraint user_books_user_id_position_key unique (user_id, position)
  deferrable initially immediate;

-- Livro novo sem posição explícita vai para o fim da estante do usuário.
-- O lock por usuário impede que duas inserções simultâneas recebam a mesma
-- posição. Roda como quem insere: o RLS limita a consulta à própria estante.
create function public.set_user_book_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select coalesce(max(ub.position) + 1, 0)
    into new.position
    from public.user_books ub
    where ub.user_id = new.user_id;
  end if;

  return new;
end;
$$;

revoke execute on function public.set_user_book_position()
from public, anon, authenticated;

create trigger user_books_set_position
before insert on public.user_books
for each row execute function public.set_user_book_position();

-- ---------------------------------------------------------------------
-- books: origem externa e ISBN canônico, para evitar duplicatas no catálogo
-- ---------------------------------------------------------------------

-- Identificador do livro na fonte de onde veio (Google Books ou Open
-- Library). Livros adicionados manualmente não têm origem.
alter table public.books
  add column source text,
  add column source_id text;

alter table public.books
  add constraint books_source_check
    check (source in ('google_books', 'open_library')),
  add constraint books_source_pair_check
    check ((source is null) = (source_id is null)),
  add constraint books_source_id_check
    check (source_id is null or char_length(source_id) between 1 and 100),
  add constraint books_source_source_id_key unique (source, source_id);

-- O ISBN é guardado em uma única forma: ISBN-13, só dígitos (um ISBN-10 é
-- convertido para o ISBN-13 equivalente antes de chegar ao banco). A mesma
-- edição nunca aparece duas vezes no catálogo.
alter table public.books
  add constraint books_isbn_check check (isbn ~ '^97[89][0-9]{10}$'),
  add constraint books_isbn_key unique (isbn);

-- Capas são carregadas pelo navegador do website, que usa HTTPS.
alter table public.books
  add constraint books_cover_url_check
    check (cover_url ~ '^https://' and char_length(cover_url) <= 2000);

-- ---------------------------------------------------------------------
-- add_book_to_library: único caminho de escrita em books para os usuários
-- ---------------------------------------------------------------------

-- Valida os dados, reutiliza o livro do catálogo (pelo ISBN ou pela origem
-- externa) ou o cria, e adiciona o livro à estante de quem chama, no fim e
-- com progresso 0. Se o livro já estiver na estante, não duplica.
--
-- security definer: books continua sem grant de escrita para os usuários.
-- O usuário é sempre auth.uid(); nenhum parâmetro escolhe o dono.
create function public.add_book_to_library(
  p_title text,
  p_author text,
  p_cover_url text default null,
  p_pages integer default null,
  p_publication_year integer default null,
  p_isbn text default null,
  p_source text default null,
  p_source_id text default null,
  out user_book_id uuid,
  out already_in_library boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean_title text := btrim(p_title, E' \t\r\n');
  clean_author text := btrim(p_author, E' \t\r\n');
  catalog_book_id uuid;
begin
  if current_user_id is null then
    raise exception 'Autenticação necessária.' using errcode = '42501';
  end if;

  if clean_title is null or clean_title = '' or char_length(clean_title) > 300 then
    raise exception 'Título inválido.' using errcode = '22023';
  end if;
  if clean_author is null or clean_author = '' or char_length(clean_author) > 300 then
    raise exception 'Autor inválido.' using errcode = '22023';
  end if;
  if p_pages is not null and p_pages not between 1 and 20000 then
    raise exception 'Número de páginas inválido.' using errcode = '22023';
  end if;
  if p_publication_year is not null
    and p_publication_year not between 1 and extract(year from now())::integer + 1 then
    raise exception 'Ano de publicação inválido.' using errcode = '22023';
  end if;
  -- ISBN, origem e capa também são verificados pelas constraints de books.
  if p_isbn is not null and p_isbn !~ '^97[89][0-9]{10}$' then
    raise exception 'ISBN inválido.' using errcode = '22023';
  end if;
  if (p_source is null) <> (p_source_id is null) then
    raise exception 'Origem incompleta.' using errcode = '22023';
  end if;

  -- Identificadores bibliográficos primeiro; título e autor nunca bastam.
  if p_isbn is not null then
    select b.id into catalog_book_id from public.books b where b.isbn = p_isbn;
  end if;
  if catalog_book_id is null and p_source is not null then
    select b.id into catalog_book_id
    from public.books b
    where b.source = p_source and b.source_id = p_source_id;
  end if;

  if catalog_book_id is null then
    insert into public.books (title, author, cover_url, pages, publication_year, isbn, source, source_id)
    values (clean_title, clean_author, p_cover_url, p_pages, p_publication_year, p_isbn, p_source, p_source_id)
    on conflict do nothing
    returning id into catalog_book_id;

    -- Outra pessoa criou o mesmo livro ao mesmo tempo.
    if catalog_book_id is null then
      select b.id into catalog_book_id
      from public.books b
      where (p_isbn is not null and b.isbn = p_isbn)
        or (p_source is not null and b.source = p_source and b.source_id = p_source_id)
      limit 1;
    end if;
  end if;

  -- A posição vem do trigger user_books_set_position; progress começa em 0.
  insert into public.user_books (user_id, book_id)
  values (current_user_id, catalog_book_id)
  on conflict (user_id, book_id) do nothing
  returning id into user_book_id;

  already_in_library := user_book_id is null;
  if already_in_library then
    select ub.id into user_book_id
    from public.user_books ub
    where ub.user_id = current_user_id and ub.book_id = catalog_book_id;
  end if;
end;
$$;

revoke execute on function public.add_book_to_library(text, text, text, integer, integer, text, text, text)
from public, anon;
grant execute on function public.add_book_to_library(text, text, text, integer, integer, text, text, text)
to authenticated;

-- ---------------------------------------------------------------------
-- set_library_order: grava a ordem da estante em um único comando
-- ---------------------------------------------------------------------

-- Os ids recebidos ocupam as posições 0, 1, 2…; livros da estante que não
-- estão na lista (ex.: adicionados em outra aba) vão para o fim, na ordem em
-- que já estavam. security invoker: o RLS de user_books garante que só a
-- estante de quem chama é alterada.
create function public.set_library_order(p_user_book_ids uuid[])
returns void
language sql
strict
security invoker
set search_path = ''
as $$
  with listed as (
    select o.id, o.ordinality - 1 as position
    from unnest(p_user_book_ids) with ordinality as o(id, ordinality)
  ),
  rest as (
    select
      ub.id,
      cardinality(p_user_book_ids) + row_number() over (order by ub.position, ub.id) - 1 as position
    from public.user_books ub
    where ub.user_id = (select auth.uid())
      and ub.id <> all (p_user_book_ids)
  )
  update public.user_books ub
  set position = ordered.position
  from (select * from listed union all select * from rest) ordered
  where ub.id = ordered.id
    and ub.user_id = (select auth.uid());
$$;

revoke execute on function public.set_library_order(uuid[]) from public, anon;
grant execute on function public.set_library_order(uuid[]) to authenticated;
