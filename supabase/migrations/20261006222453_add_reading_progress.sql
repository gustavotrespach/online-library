-- Leitura no livro aberto (Fase 09B): páginas lidas, progresso coerente com
-- elas, datas de início e conclusão e feedback normalizado.
-- Modelo e motivos: docs/banco-de-dados.md e decisions.md (013).

-- ---------------------------------------------------------------------
-- user_books.pages_read
-- ---------------------------------------------------------------------

-- Páginas lidas, quando o livro tem número de páginas. O limite superior
-- (books.pages) está em outra tabela e é verificado pelo trigger abaixo.
alter table public.user_books
  add column pages_read integer constraint user_books_pages_read_check check (pages_read >= 0);

-- Registros existentes: páginas equivalentes ao progresso atual, arredondadas.
-- progress não muda, e updated_at também não (o preenchimento não é uma
-- alteração feita pelo usuário).
alter table public.user_books disable trigger user_books_set_updated_at;

update public.user_books as ub
set pages_read = round(b.pages * ub.progress / 100.0)
from public.books as b
where b.id = ub.book_id
  and b.pages is not null;

alter table public.user_books enable trigger user_books_set_updated_at;

-- ---------------------------------------------------------------------
-- Leitura sempre coerente, por qualquer caminho de escrita
-- ---------------------------------------------------------------------

-- Regras (vale para o website, RPCs e escrita direta sob RLS):
-- - Livro com páginas: pages_read é a fonte; progress é derivado dele
--   (0 só sem nenhuma página, 100 só com todas, 1–99 no meio). Um progress
--   gravado diretamente vira as páginas equivalentes.
-- - Livro sem páginas: pages_read fica nulo e progress é editado direto.
-- - started_at: preenchido quando o progresso sai de 0 pela primeira vez.
-- - finished_at: preenchido ao chegar a 100; limpo ao sair de 100.
-- - As datas só mudam junto com o progresso; o cliente não as define.
-- - feedback: espaços nas pontas removidos; vazio vira null.
create function public.sync_user_book_reading()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total integer;
  progress_changed boolean :=
    tg_op = 'INSERT'
    or new.pages_read is distinct from old.pages_read
    or new.progress is distinct from old.progress;
begin
  if tg_op = 'INSERT' or new.feedback is distinct from old.feedback then
    new.feedback := nullif(btrim(new.feedback), '');
  end if;

  if progress_changed then
    select b.pages into total from public.books as b where b.id = new.book_id;

    if total is null then
      if new.pages_read is not null then
        raise exception 'pages_read requires a book with a page count' using errcode = '22023';
      end if;
    else
      -- Sem páginas informadas (ou só o progresso mudou): as equivalentes.
      if new.pages_read is null
        or (tg_op = 'UPDATE' and new.pages_read is not distinct from old.pages_read) then
        new.pages_read := round(total * new.progress / 100.0);
      end if;

      if new.pages_read > total then
        raise exception 'pages_read cannot exceed the book page count' using errcode = '22023';
      end if;

      new.progress := case
        when new.pages_read <= 0 then 0
        when new.pages_read >= total then 100
        else least(99, greatest(1, round(new.pages_read * 100.0 / total)))
      end;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.started_at := case when new.progress > 0 then now() end;
    new.finished_at := case when new.progress = 100 then now() end;
  elsif new.progress is distinct from old.progress then
    new.started_at := case
      when old.started_at is null and new.progress > 0 then now()
      else old.started_at
    end;
    new.finished_at := case when new.progress = 100 then now() end;
  else
    new.started_at := old.started_at;
    new.finished_at := old.finished_at;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_user_book_reading()
  from public, anon, authenticated;

create trigger user_books_sync_reading
before insert or update on public.user_books
for each row execute function public.sync_user_book_reading();
