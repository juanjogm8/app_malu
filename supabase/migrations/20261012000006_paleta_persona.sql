-- Colores de persona del diseño 2b: se guarda el id de la paleta (azul, ciruela, jade, teja, ocre, rosa)
-- en lugar de un hex, porque cada color tiene una versión para claro y otra para oscuro (tokens.css).

alter table public.members drop constraint members_color_key;

update public.members set color = case
  when color = '#0A6B58' then 'azul'
  when color = '#C2410C' then 'teja'
  else 'azul'
end;

alter table public.members
  alter column color set default 'azul',
  add constraint members_color_paleta check (color in ('azul','ciruela','jade','teja','ocre','rosa')),
  add constraint members_color_key unique (color);

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
    -- Persona A: azul (grupo frío). Persona B: teja (grupo cálido).
    case when (select count(*) from public.members) = 0 then 'azul' else 'teja' end,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;
