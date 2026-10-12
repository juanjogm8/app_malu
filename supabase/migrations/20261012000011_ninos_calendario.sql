-- Niños ↔ calendario.
-- 1. Un evento puede ser de un niño (campo "Niño"): aparece también en la sección Niños.
-- 2. Lo de Niños con fecha se publica en el calendario "Casa en Orden" de Google, igual que los eventos.

alter table public.events add column kid text;

alter table public.kid_items
  add column google_event_id text,
  add column google_etag text,
  add column google_synced_at timestamptz;

-- El nombre del niño va en el título que se publica: cambiarlo vuelve a publicar el evento.
create or replace function public.events_google_pendiente() returns trigger
language plpgsql as $$
begin
  if (new.title, new.date, new.time, new.repeat, new.place, new.notes, new.kid)
     is distinct from (old.title, old.date, old.time, old.repeat, old.place, old.notes, old.kid) then
    new.google_synced_at := null;
  end if;
  return new;
end $$;

-- Borrar algo de Niños ya publicado lo borra también en Google (misma función que los eventos).
create trigger kid_items_google_borrado after delete on public.kid_items
  for each row execute function public.events_google_borrado();

-- Un cambio lo vuelve a publicar; si le quitan la fecha, se quita de Google.
create or replace function public.kid_items_google_pendiente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.date is null then
    if old.google_event_id is not null then
      insert into public.google_pending_deletes (google_event_id) values (old.google_event_id)
      on conflict do nothing;
    end if;
    new.google_event_id := null;
    new.google_etag := null;
    new.google_synced_at := null;
  elsif (new.text, new.kid, new.date, new.time, new.notes)
        is distinct from (old.text, old.kid, old.date, old.time, old.notes) then
    new.google_synced_at := null;
  end if;
  return new;
end $$;
create trigger kid_items_google_pendiente before update on public.kid_items
  for each row execute function public.kid_items_google_pendiente();
