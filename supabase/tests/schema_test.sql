-- Testes de constraints, foreign keys, timestamps e policies (pgTAP).
-- Executar com: npx supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test');

insert into public.profiles (id) values
  ('11111111-1111-1111-1111-111111111111');

insert into public.books (id, title, author) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Livro 1', 'Autor 1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Livro 2', 'Autor 2');

insert into public.user_books (id, user_id, book_id) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ---------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------

select is(
  (select progress from public.user_books where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  0::smallint,
  'progress começa em 0'
);
select throws_ok(
  $$update public.user_books set progress = 101
    where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '23514', null,
  'progress não passa de 100'
);
select throws_ok(
  $$update public.user_books set progress = -1
    where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '23514', null,
  'progress não é negativo'
);
select throws_ok(
  $$insert into public.user_books (user_id, book_id)
    values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '23505', null,
  'o mesmo livro não entra duas vezes na biblioteca do usuário'
);
select throws_ok(
  $$insert into public.books (title, author) values ('  ', 'Autor')$$,
  '23514', null,
  'title não pode ser vazio'
);
select throws_ok(
  $$insert into public.user_books (user_id, book_id)
    values ('99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  '23503', null,
  'user_books exige um usuário existente em auth.users'
);

-- ---------------------------------------------------------------------
-- Exclusão
-- ---------------------------------------------------------------------

-- O SQLSTATE do RESTRICT muda entre versões do Postgres (23503 → 23001 no 18).
select throws_like(
  $$delete from public.books where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '%foreign key constraint "user_books_book_id_fkey"%',
  'um livro presente em user_books não pode ser removido'
);
select lives_ok(
  $$delete from public.books where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'um livro sem user_books pode ser removido'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is_empty(
  $$select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$,
  'remover o usuário remove seu profile'
);
select is_empty(
  $$select 1 from public.user_books where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'remover o usuário remove seus user_books'
);

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------

update public.books set updated_at = '2000-01-01', title = 'Livro 1'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Dentro de uma transação now() é constante: o trigger deve gravar now()
-- mesmo quando o update tenta definir outro valor.
select is(
  (select updated_at from public.books where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  now(),
  'updated_at é atualizado pelo trigger'
);

-- ---------------------------------------------------------------------
-- RLS e policies
-- ---------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS ativo em profiles'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.books'::regclass),
  'RLS ativo em books'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_books'::regclass),
  'RLS ativo em user_books'
);

select policies_are('public', 'profiles', array[
  'Users can view their own profile',
  'Users can create their own profile',
  'Users can update their own profile'
]);
select policies_are('public', 'books', array[
  'Authenticated users can view books'
]);
select policies_are('public', 'user_books', array[
  'Users can view their own library entries',
  'Users can add entries to their own library',
  'Users can update their own library entries',
  'Users can delete their own library entries'
]);

select * from finish();
rollback;
