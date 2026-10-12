-- Acceso y personas (SPEC §5.1)

-- Lista de correos autorizados. Con RLS y sin políticas ni permisos: la API no puede leerla ni escribirla.
create table public.allowed_emails (email text primary key);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

insert into public.allowed_emails (email) values
  ('juanjogamur@gmail.com'),
  ('m.rm91@hotmail.com');

create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  color text not null default '#0A6B58' unique,   -- color de persona; único para que no coincidan
  avatar_url text,
  telegram_chat_id bigint unique,
  created_at timestamptz not null default now()
);

-- Alta controlada: solo correos autorizados. La excepción revierte la creación del usuario.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'Correo no autorizado';
  end if;
  insert into public.members (id, email, name, color, avatar_url)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when (select count(*) from public.members) = 0 then '#0A6B58' else '#C2410C' end,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid())
$$;

-- members: lectura para miembros; cada quien edita solo su fila y solo nombre, color y avatar.
alter table public.members enable row level security;
create policy "ver miembros" on public.members for select to authenticated using (public.is_member());
create policy "editar mi fila" on public.members for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
grant update (name, color, avatar_url) on public.members to authenticated;
