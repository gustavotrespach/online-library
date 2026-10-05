-- Testes do trigger que cria o profile no cadastro (pgTAP).
-- Executar com: npx supabase test db
-- O acesso ao profile (próprio/de outro usuário/anônimo) é testado em rls_test.sql.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_trigger('auth', 'users', 'users_create_profile', 'auth.users tem o trigger de criação de profile');

-- ---------------------------------------------------------------------
-- Criação e display_name
-- ---------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'nome@example.test', '{"display_name": "  Ana Souza  "}'),
  ('22222222-2222-2222-2222-222222222222', 'sem-metadata@example.test', null),
  ('33333333-3333-3333-3333-333333333333', 'sem-chave@example.test', '{"name": "Outra chave"}'),
  ('44444444-4444-4444-4444-444444444444', 'vazio@example.test', E'{"display_name": " \\t\\n "}'),
  ('55555555-5555-5555-5555-555555555555', 'longo@example.test', json_build_object('display_name', repeat('a', 100))::jsonb);

select ok(
  exists (select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'inserir em auth.users cria o profile com o mesmo id'
);
select is(
  (select count(*) from public.profiles),
  5::bigint,
  'cada usuário recebe exatamente um profile'
);
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ana Souza',
  'display_name vem de raw_user_meta_data.display_name, sem espaços nas extremidades'
);
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'sem metadata, display_name é null'
);
select is(
  (select display_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  null,
  'somente a chave display_name é lida'
);
select is(
  (select display_name from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  null,
  'nome só com espaços vira null'
);
select is(
  (select char_length(display_name) from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  80,
  'nomes longos são truncados em 80 caracteres'
);
select is(
  (select avatar_url from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  null,
  'nenhum outro campo é preenchido pelo trigger'
);

-- ---------------------------------------------------------------------
-- Privilégios da função. O Auth insere usuários como supabase_auth_admin,
-- sem EXECUTE: o trigger dispara mesmo assim (verificado com um cadastro
-- real pela API do Auth local).
-- ---------------------------------------------------------------------

select ok(
  (select prosecdef from pg_proc where oid = 'public.create_profile_for_new_user()'::regprocedure),
  'a função é security definer'
);
select is(
  (select proconfig from pg_proc where oid = 'public.create_profile_for_new_user()'::regprocedure),
  array['search_path=""'],
  'a função fixa search_path vazio'
);
select ok(
  not exists (
    select 1
    from pg_proc, aclexplode(proacl) as acl
    where oid = 'public.create_profile_for_new_user()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC não executa a função'
);
select ok(
  not has_function_privilege('anon', 'public.create_profile_for_new_user()', 'execute'),
  'anon não executa a função'
);
select ok(
  not has_function_privilege('authenticated', 'public.create_profile_for_new_user()', 'execute'),
  'authenticated não executa a função'
);
select ok(
  not has_function_privilege('service_role', 'public.create_profile_for_new_user()', 'execute'),
  'service_role não executa a função'
);
select ok(
  not has_function_privilege('supabase_auth_admin', 'public.create_profile_for_new_user()', 'execute'),
  'supabase_auth_admin não executa a função diretamente'
);

select * from finish();
rollback;
