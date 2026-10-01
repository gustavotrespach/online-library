-- Testes de Row Level Security (pgTAP). Executar com: npx supabase test db
-- Usuários fictícios: A = 1111…, B = 2222…, C = 3333… (C não possui profile).

begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Dados iniciais, inseridos como postgres (ignora RLS).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'user-c@example.test');

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Usuário A'),
  ('22222222-2222-2222-2222-222222222222', 'Usuário B');

insert into public.books (id, title, author) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Livro 1', 'Autor 1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Livro 2', 'Autor 2');

insert into public.user_books (id, user_id, book_id, progress) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20);

-- ---------------------------------------------------------------------
-- Visitante anônimo
-- ---------------------------------------------------------------------

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select throws_ok(
  'select * from public.user_books', '42501', null,
  'anon não acessa user_books'
);
select throws_ok(
  'select * from public.profiles', '42501', null,
  'anon não acessa profiles'
);
select throws_ok(
  'select * from public.books', '42501', null,
  'anon não acessa books'
);

reset role;

-- ---------------------------------------------------------------------
-- Usuário A autenticado
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- user_books
select results_eq(
  'select id from public.user_books',
  $$values ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::uuid)$$,
  'A vê somente os próprios user_books'
);
select is_empty(
  $$select 1 from public.user_books where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'A não vê user_books de B'
);

-- Sem erro: o RLS apenas não encontra a linha. O efeito é verificado no fim.
update public.user_books set progress = 100
where id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
delete from public.user_books
where id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

select throws_ok(
  $$insert into public.user_books (user_id, book_id)
    values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'A não insere user_book atribuído a B'
);
select lives_ok(
  $$insert into public.user_books (user_id, book_id)
    values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  'A adiciona um livro à própria biblioteca'
);
select lives_ok(
  $$update public.user_books set progress = 50
    where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  'A atualiza o próprio user_book'
);
select throws_ok(
  $$update public.user_books set user_id = '22222222-2222-2222-2222-222222222222'
    where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '42501', null,
  'A não transfere o próprio user_book para B'
);

-- profiles
select results_eq(
  'select id from public.profiles',
  $$values ('11111111-1111-1111-1111-111111111111'::uuid)$$,
  'A vê somente o próprio profile'
);

update public.profiles set display_name = 'Alterado por A'
where id = '22222222-2222-2222-2222-222222222222';

select lives_ok(
  $$update public.profiles set display_name = 'Novo nome de A'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  'A atualiza o próprio profile'
);
select throws_ok(
  $$insert into public.profiles (id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501', null,
  'A não cria profile para outro usuário'
);

-- books
select results_eq(
  'select count(*) from public.books',
  $$values (2::bigint)$$,
  'usuário autenticado lê books'
);
select throws_ok(
  $$insert into public.books (title, author) values ('Título', 'Autor')$$,
  '42501', null,
  'usuário autenticado não insere em books'
);
select throws_ok(
  $$update public.books set title = 'Título alterado'$$,
  '42501', null,
  'usuário autenticado não altera books'
);
select throws_ok(
  'delete from public.books', '42501', null,
  'usuário autenticado não remove books'
);

reset role;

-- ---------------------------------------------------------------------
-- Efeitos das operações de A, verificados como postgres
-- ---------------------------------------------------------------------

select is(
  (select progress from public.user_books where id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'),
  20::smallint,
  'o update de A não alterou o user_book de B'
);
select ok(
  exists (select 1 from public.user_books where id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'),
  'o delete de A não removeu o user_book de B'
);
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Usuário B',
  'o update de A não alterou o profile de B'
);
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Novo nome de A',
  'o update de A alterou o próprio profile'
);
select is(
  (select progress from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  50::smallint,
  'o update de A alterou o próprio user_book'
);

select * from finish();
rollback;
