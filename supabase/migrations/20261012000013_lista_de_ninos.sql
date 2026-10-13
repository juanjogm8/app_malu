-- Lista de niños: se dan de alta en la vista Niños y se eligen en los eventos.
-- events.kid sigue guardando el nombre; renombrar un niño actualiza sus eventos y borrarlo los deja
-- sin niño (los eventos se quedan en el calendario).

create table public.kids (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_by uuid references public.members(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index kids_nombre_unico on public.kids (lower(btrim(name)));

create trigger set_updated_at before update on public.kids
  for each row execute function public.set_updated_at();

alter table public.kids enable row level security;
create policy "solo miembros" on public.kids for all to authenticated
  using (public.is_member()) with check (public.is_member());
revoke all on public.kids from anon;
alter publication supabase_realtime add table public.kids;

-- Los nombres que ya se usaban en eventos quedan dados de alta.
insert into public.kids (name)
select distinct on (lower(btrim(kid))) btrim(kid)
  from public.events
 where kid is not null and btrim(kid) <> ''
 order by lower(btrim(kid)), btrim(kid);
update public.events set kid = btrim(kid) where kid is not null and kid <> btrim(kid);

create or replace function public.kids_renombrar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name then
    update public.events set kid = new.name where kid = old.name;
  end if;
  return new;
end $$;
create trigger kids_renombrar after update on public.kids
  for each row execute function public.kids_renombrar();

create or replace function public.kids_borrar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.events set kid = null, kid_kind = null where kid = old.name;
  return old;
end $$;
create trigger kids_borrar after delete on public.kids
  for each row execute function public.kids_borrar();
