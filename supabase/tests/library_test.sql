-- Testes da ordem da estante e da adição de livros (pgTAP).
-- Executar com: npx supabase test db
-- Usuários fictícios: A = 1111…, B = 2222….

begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.test');

insert into public.books (id, title, author) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Livro 1', 'Autor 1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Livro 2', 'Autor 2'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Livro 3', 'Autor 3');

-- ---------------------------------------------------------------------
-- Coluna position
-- ---------------------------------------------------------------------

select col_not_null('public', 'user_books', 'position', 'position é obrigatória');
select col_type_is('public', 'user_books', 'position', 'integer', 'position é integer');
select hasnt_column('public', 'books', 'position', 'books não tem position');

-- Livros novos vão para o fim da estante de cada usuário.
insert into public.user_books (id, user_id, book_id) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select results_eq(
  $$select position from public.user_books
    where user_id = '11111111-1111-1111-1111-111111111111' order by created_at, id$$,
  $$values (0), (1), (2)$$,
  'livros novos recebem posições 0, 1, 2 na estante de A'
);
select is(
  (select position from public.user_books where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'),
  0,
  'a posição é por usuário: o primeiro livro de B também é 0'
);
select throws_ok(
  $$insert into public.user_books (user_id, book_id, position)
    values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0)$$,
  '23505', null,
  'duas entradas do mesmo usuário não ocupam a mesma posição'
);
select throws_ok(
  $$update public.user_books set position = -1 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  '23514', null,
  'position não é negativa'
);
select lives_ok(
  $$update public.user_books
    set position = case id
      when 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' then 1
      when 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2' then 0
    end
    where id in ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2')$$,
  'trocar duas posições em um único comando é permitido (verificação no fim do comando)'
);

-- ---------------------------------------------------------------------
-- Escrita direta em books continua fechada
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$insert into public.books (title, author) values ('Direto', 'Autor')$$,
  '42501', null,
  'authenticated não insere em books diretamente'
);

-- ---------------------------------------------------------------------
-- set_library_order (A autenticado)
-- ---------------------------------------------------------------------

select lives_ok(
  $$select public.set_library_order(array[
    'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3',
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'
  ]::uuid[])$$,
  'A grava a nova ordem da estante'
);
select results_eq(
  'select id from public.user_books order by position',
  $$values ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'::uuid),
           ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::uuid),
           ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'::uuid)$$,
  'a ordem gravada é a ordem recebida'
);
select lives_ok(
  $$select public.set_library_order(array['a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2']::uuid[])$$,
  'lista parcial é aceita'
);
select results_eq(
  'select id from public.user_books order by position',
  $$values ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'::uuid),
           ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'::uuid),
           ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::uuid)$$,
  'livros fora da lista vão para o fim, na ordem em que estavam'
);
select lives_ok(
  $$select public.set_library_order(array[
    'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
  ]::uuid[])$$,
  'um id de outro usuário na lista é ignorado'
);
select is(
  (select count(*)::integer from public.user_books where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'),
  0,
  'A continua sem ver a entrada de B'
);

-- RLS: A não altera a posição de B, nem diretamente.
update public.user_books set position = 7 where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';

reset role;
select is(
  (select position from public.user_books where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'),
  0,
  'a posição de B não muda com update nem com set_library_order de A'
);

-- ---------------------------------------------------------------------
-- add_book_to_library
-- ---------------------------------------------------------------------

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok(
  $$select * from public.add_book_to_library('Anônimo', 'Autor')$$,
  '42501', null,
  'anon não executa add_book_to_library'
);
select throws_ok(
  $$select public.set_library_order(array[]::uuid[])$$,
  '42501', null,
  'anon não executa set_library_order'
);
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

create temporary table added on commit drop as
select * from public.add_book_to_library(
  '  Crime e Castigo ', 'Fiódor Dostoiévski',
  'https://covers.openlibrary.org/b/id/9411862-L.jpg', 576, 2003,
  '9780140449136', 'open_library', 'OL7355481M'
);

select is((select already_in_library from added), false, 'livro novo entra na estante');
select is(
  (select row(ub.progress, ub.position)::text from public.user_books ub join added a on a.user_book_id = ub.id),
  '(0,4)',
  'progresso começa em 0 e a posição é o fim da estante'
);
select is(
  (select b.title from public.books b join public.user_books ub on ub.book_id = b.id join added a on a.user_book_id = ub.id),
  'Crime e Castigo',
  'o título é gravado sem espaços nas extremidades'
);
select is(
  (select already_in_library from public.add_book_to_library('Crime e Castigo', 'Fiódor Dostoiévski', null, null, null, '9780140449136')),
  true,
  'o mesmo ISBN não entra duas vezes na estante'
);
select is(
  (select count(*)::integer from public.user_books),
  4,
  'nenhuma linha duplicada em user_books'
);
select is(
  (select already_in_library from public.add_book_to_library('Outro título', 'Outro autor', null, null, null, null, 'open_library', 'OL7355481M')),
  true,
  'a mesma origem externa também é reconhecida'
);
select is(
  (select already_in_library from public.add_book_to_library('Crime e Castigo', 'Fiódor Dostoiévski')),
  false,
  'sem identificadores, mesmo título não é considerado o mesmo livro'
);

select throws_ok($$select * from public.add_book_to_library('   ', 'Autor')$$, '22023', null, 'título vazio é rejeitado');
select throws_ok($$select * from public.add_book_to_library('Título', '')$$, '22023', null, 'autor vazio é rejeitado');
select throws_ok($$select * from public.add_book_to_library('Título', 'Autor', null, 0)$$, '22023', null, 'páginas fora da faixa são rejeitadas');
select throws_ok($$select * from public.add_book_to_library('Título', 'Autor', null, null, 3000)$$, '22023', null, 'ano fora da faixa é rejeitado');
select throws_ok($$select * from public.add_book_to_library('Título', 'Autor', null, null, null, '0140449132')$$, '22023', null, 'ISBN fora da forma canônica é rejeitado');
select throws_ok($$select * from public.add_book_to_library('Título', 'Autor', null, null, null, null, 'open_library')$$, '22023', null, 'origem sem id é rejeitada');
select throws_ok($$select * from public.add_book_to_library('Título', 'Autor', 'javascript:alert(1)')$$, '23514', null, 'capa sem HTTPS é rejeitada');
select throws_ok($$select * from public.add_book_to_library('Título', 'Autor', null, null, null, null, 'outra_api', 'x')$$, '23514', null, 'origem desconhecida é rejeitada');

reset role;

-- B adiciona o mesmo ISBN: reutiliza o livro do catálogo.
set local role authenticated;
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(
  (select already_in_library from public.add_book_to_library('Crime and Punishment', 'Dostoevsky', null, null, null, '9780140449136')),
  false,
  'B adiciona o mesmo ISBN à própria estante'
);
reset role;

select is(
  (select count(*)::integer from public.books where isbn = '9780140449136'),
  1,
  'o catálogo tem um único registro para o ISBN'
);

-- Remover da estante não remove o livro do catálogo.
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
delete from public.user_books ub using added a where ub.id = a.user_book_id;
reset role;
select isnt_empty(
  $$select 1 from public.books where isbn = '9780140449136'$$,
  'o livro continua no catálogo depois de sair da estante'
);

select * from finish();
rollback;
