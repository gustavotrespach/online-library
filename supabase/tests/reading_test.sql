-- Testes da leitura no livro aberto (pgTAP): páginas lidas, progresso,
-- datas e feedback. Executar com: npx supabase test db
-- Usuários fictícios: A = 1111…, B = 2222….

begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.test');

insert into public.books (id, title, author, pages) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Com páginas', 'Autor 1', 320),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sem páginas', 'Autor 2', null);

insert into public.user_books (id, user_id, book_id) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ---------------------------------------------------------------------
-- Coluna e estado inicial
-- ---------------------------------------------------------------------

select col_type_is('public', 'user_books', 'pages_read', 'integer', 'pages_read é integer');
select col_is_null('public', 'user_books', 'pages_read', 'pages_read é opcional');
select is(
  (select pages_read from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  0,
  'livro novo com páginas começa com 0 páginas lidas'
);
select is(
  (select pages_read from public.user_books where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'),
  null,
  'livro novo sem páginas não tem páginas lidas'
);
select ok(
  (select started_at is null and finished_at is null from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'livro novo (0%) não tem datas de leitura'
);

-- ---------------------------------------------------------------------
-- Como A, sob RLS
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Páginas lidas → progresso derivado.
update public.user_books set pages_read = 137 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select progress from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  43::smallint,
  '137 de 320 páginas = 43% (arredondado)'
);
select ok(
  (select started_at is not null and finished_at is null from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'sair de 0% preenche started_at'
);

-- Guarda o início para conferir que não é sobrescrito.
create temporary table first_start on commit drop as
  select started_at from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

update public.user_books set pages_read = 1 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select progress from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  1::smallint,
  'uma página lida já conta como iniciado (1%, não 0%)'
);
update public.user_books set pages_read = 319 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select progress from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  99::smallint,
  'faltando uma página não é concluído (99%, não 100%)'
);
select ok(
  (select finished_at is null from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  '99% não preenche finished_at'
);

select throws_ok(
  $$update public.user_books set pages_read = -1 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '23514', null,
  'páginas lidas negativas são recusadas'
);
select throws_ok(
  $$update public.user_books set pages_read = 321 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '22023', null,
  'páginas lidas acima do total são recusadas'
);
select throws_ok(
  $$update public.user_books set pages_read = 10 where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'$$,
  '22023', null,
  'livro sem páginas não aceita páginas lidas'
);

-- Concluir: 100% e finished_at.
update public.user_books set pages_read = 320 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select progress from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  100::smallint,
  'todas as páginas = 100%'
);
select ok(
  (select finished_at is not null from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'chegar a 100% preenche finished_at'
);
select is(
  (select started_at from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  (select started_at from first_start),
  'started_at não é sobrescrito'
);

-- Sair de 100%.
update public.user_books set pages_read = 160 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select ok(
  (select progress = 50 and finished_at is null from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'voltar de 100% para 50% limpa finished_at'
);

-- Voltar a 0% mantém o início registrado.
update public.user_books set pages_read = 0 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select ok(
  (select progress = 0 and started_at = (select started_at from first_start) from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'voltar a 0% não apaga started_at'
);

-- Progresso gravado diretamente num livro com páginas vira páginas.
update public.user_books set progress = 50 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select pages_read from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  160,
  'progresso direto (50%) vira as páginas equivalentes (160)'
);

-- Livro sem páginas: porcentagem direta.
update public.user_books set progress = 0 where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
select is(
  (select progress from public.user_books where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'),
  0::smallint,
  'livro sem páginas aceita 0%'
);
update public.user_books set progress = 43 where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
select ok(
  (select progress = 43 and pages_read is null and started_at is not null from public.user_books where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'),
  'livro sem páginas: 43% direto, sem páginas lidas, iniciado'
);
update public.user_books set progress = 100 where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
select ok(
  (select finished_at is not null from public.user_books where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'),
  'livro sem páginas: 100% preenche finished_at'
);
select throws_ok(
  $$update public.user_books set progress = 101 where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'$$,
  '23514', null,
  'progresso acima de 100 continua recusado'
);

-- Datas só mudam com o progresso.
create temporary table dates_before on commit drop as
  select started_at, finished_at from public.user_books where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
update public.user_books
set started_at = '2000-01-01', finished_at = null
where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
select ok(
  (select ub.started_at = d.started_at and ub.finished_at = d.finished_at
   from public.user_books as ub, dates_before as d
   where ub.id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'),
  'o cliente não define as datas diretamente'
);
select lives_ok(
  $$select public.set_library_order(array['a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'::uuid, 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::uuid])$$,
  'reordenar continua funcionando'
);
select ok(
  (select ub.finished_at = d.finished_at and ub.progress = 100
   from public.user_books as ub, dates_before as d
   where ub.id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'),
  'reordenar não mexe em progresso nem datas'
);

-- Feedback.
update public.user_books set feedback = '  Gostei muito.  ' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select feedback from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'Gostei muito.',
  'feedback é gravado sem espaços nas pontas'
);
select lives_ok(
  $$update public.user_books set feedback = repeat('a', 5000) where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  'feedback com 5000 caracteres é aceito'
);
select throws_ok(
  $$update public.user_books set feedback = repeat('a', 5001) where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '23514', null,
  'feedback acima de 5000 caracteres é recusado'
);
update public.user_books set feedback = '   ' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(
  (select feedback from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  null,
  'feedback só com espaços é apagado (null)'
);

-- Atualização combinada (salvar e fechar): uma operação.
update public.user_books
set pages_read = 240, feedback = 'Releitura.'
where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select ok(
  (select progress = 75 and feedback = 'Releitura.' from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'progresso e feedback juntos em uma atualização'
);

-- Isolamento: A não vê nem altera a leitura de B.
update public.user_books set pages_read = 300, feedback = 'invasão' where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
select is(
  (select count(*) from public.user_books where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'),
  0::bigint,
  'A não vê o user_books de B'
);
select throws_ok(
  $$update public.user_books set user_id = '22222222-2222-2222-2222-222222222222' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '42501', null,
  'A não transfere a própria leitura para B'
);

-- add_book_to_library continua começando em 0, com páginas lidas coerentes.
select lives_ok(
  $$select public.add_book_to_library('Novo', 'Autora', null, 200)$$,
  'adicionar livro continua funcionando'
);
select ok(
  (select ub.progress = 0 and ub.pages_read = 0 and ub.started_at is null
   from public.user_books as ub join public.books as b on b.id = ub.book_id
   where b.title = 'Novo'),
  'livro adicionado: 0%, 0 páginas lidas, sem datas'
);

reset role;

select ok(
  (select progress = 0 and pages_read = 0 and feedback is null from public.user_books where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'),
  'a leitura de B continua intacta'
);

-- Como B: não altera a leitura de A.
set local role authenticated;
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
update public.user_books set progress = 10, feedback = 'invasão' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
reset role;
select ok(
  (select progress = 75 and feedback = 'Releitura.' from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'B não altera progresso nem feedback de A'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.sync_user_book_reading()'::regprocedure),
  false,
  'o trigger de leitura não é security definer'
);

select * from finish();
rollback;
