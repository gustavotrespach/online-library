-- Cria o profile de cada novo usuário na mesma transação do cadastro.
-- Decisão e fluxo de Auth: decisions.md, 008; docs/banco-de-dados.md.

-- raw_user_meta_data.display_name é apenas o transporte do nome digitado no
-- cadastro; depois da criação, a fonte de verdade é profiles.display_name.
-- security definer: o Auth (supabase_auth_admin) não tem acesso a profiles.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Nomes acima de 80 caracteres são truncados; vazio ou ausente vira null.
  name text := left(
    btrim(new.raw_user_meta_data ->> 'display_name', E' \t\r\n'),
    80
  );
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(name, E' \t\r\n'), ''));

  return new;
end;
$$;

-- Só o trigger executa a função; nenhum papel da API pode chamá-la.
revoke execute on function public.create_profile_for_new_user()
from public, anon, authenticated, service_role;

create trigger users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
