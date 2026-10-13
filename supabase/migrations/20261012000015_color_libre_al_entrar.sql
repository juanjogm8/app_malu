-- La segunda persona recibía siempre "teja"; si la primera ya había elegido ese color, el alta
-- fallaba (color único) y no podía entrar. Ahora recibe el primer color libre: azul u otro frío para
-- la primera; teja u otro cálido para la segunda (y si no, cualquiera libre).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare libre text;
begin
  if not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'Correo no autorizado';
  end if;
  select p.c into libre
    from unnest(case when exists (select 1 from public.members)
                     then array['teja','ocre','rosa','azul','ciruela','jade']
                     else array['azul','ciruela','jade','teja','ocre','rosa'] end)
         with ordinality as p(c, orden)
   where not exists (select 1 from public.members m where m.color = p.c)
   order by p.orden
   limit 1;
  insert into public.members (id, email, name, color, avatar_url)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    libre,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;
