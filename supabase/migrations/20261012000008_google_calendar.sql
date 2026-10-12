-- Fase 3 · Google Calendar (SPEC §11)
-- Paso 1: cada persona conecta su Google Calendar en solo lectura; sus eventos se copian a
--         google_events y la app los muestra como capa "Google".
-- Paso 2: una persona habilita la escritura; la app crea un calendario "Casa en Orden" en su cuenta
--         y publica ahí los eventos de la app. Se comparte con la otra persona desde Google Calendar.

-- Cuenta de Google conectada por persona. El token de actualización vive cifrado en Supabase Vault;
-- aquí solo se guarda el id del secreto, que nunca se expone a la API.
create table public.google_accounts (
  member_id uuid primary key references public.members(id) on delete cascade,
  google_email text not null,
  token_secret_id uuid,
  can_write boolean not null default false,
  status text not null default 'ok' check (status in ('ok', 'error')),
  last_error text,
  last_sync_at timestamptz,
  connected_at timestamptz not null default now()
);
alter table public.google_accounts enable row level security;
create policy "ver cuentas de google" on public.google_accounts for select to authenticated
  using (public.is_member());
revoke all on public.google_accounts from anon, authenticated;
grant select (member_id, google_email, can_write, status, last_error, last_sync_at, connected_at)
  on public.google_accounts to authenticated;

-- Estado de la sincronización incremental (solo funciones).
create table public.google_sync_state (
  member_id uuid not null references public.members(id) on delete cascade,
  calendar_id text not null,
  sync_token text,
  primary key (member_id, calendar_id)
);
alter table public.google_sync_state enable row level security;
revoke all on public.google_sync_state from anon, authenticated;

-- Eventos leídos de Google (solo lectura para las personas).
create table public.google_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  calendar_id text not null,
  google_event_id text not null,
  etag text,
  title text not null,
  date date not null,
  time time,
  html_link text,
  updated_at timestamptz not null default now(),
  unique (member_id, calendar_id, google_event_id)
);
alter table public.google_events enable row level security;
create policy "ver eventos de google" on public.google_events for select to authenticated
  using (public.is_member());
revoke all on public.google_events from anon, authenticated;
grant select on public.google_events to authenticated;
alter publication supabase_realtime add table public.google_events, public.google_accounts;

-- Paso 2: calendario compartido y eventos publicados.
alter table public.app_settings
  add column gcal_calendar_id text,
  add column gcal_writer_id uuid references public.members(id) on delete set null;
alter table public.events
  add column google_event_id text,
  add column google_etag text,
  add column google_synced_at timestamptz;

-- Eventos borrados en la app que hay que borrar también en Google.
create table public.google_pending_deletes (
  google_event_id text primary key,
  created_at timestamptz not null default now()
);
alter table public.google_pending_deletes enable row level security;
revoke all on public.google_pending_deletes from anon, authenticated;

create or replace function public.events_google_borrado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.google_event_id is not null then
    insert into public.google_pending_deletes (google_event_id) values (old.google_event_id)
    on conflict do nothing;
  end if;
  return old;
end $$;
create trigger events_google_borrado after delete on public.events
  for each row execute function public.events_google_borrado();

-- Un cambio hecho en la app vuelve a marcar el evento como pendiente de publicar.
create or replace function public.events_google_pendiente() returns trigger
language plpgsql as $$
begin
  if (new.title, new.date, new.time, new.repeat, new.place, new.notes)
     is distinct from (old.title, old.date, old.time, old.repeat, old.place, old.notes) then
    new.google_synced_at := null;
  end if;
  return new;
end $$;
create trigger events_google_pendiente before update on public.events
  for each row execute function public.events_google_pendiente();

-- Tokens en Vault: solo la service_role (Edge Functions) puede guardar y leer.
create or replace function public.gcal_guardar_token(p_member uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  select token_secret_id into sid from public.google_accounts where member_id = p_member;
  if sid is null then
    sid := vault.create_secret(p_token, 'gcal_refresh_' || p_member::text);
    update public.google_accounts set token_secret_id = sid where member_id = p_member;
  else
    perform vault.update_secret(sid, p_token);
  end if;
end $$;

create or replace function public.gcal_leer_token(p_member uuid) returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select s.decrypted_secret into t
    from public.google_accounts a join vault.decrypted_secrets s on s.id = a.token_secret_id
   where a.member_id = p_member;
  return t;
end $$;

-- Desconectar (lo llama la propia persona desde la app).
create or replace function public.gcal_desconectar() returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not public.is_member() then
    raise exception 'No autorizado';
  end if;
  select token_secret_id into sid from public.google_accounts where member_id = auth.uid();
  delete from public.google_events where member_id = auth.uid();
  delete from public.google_sync_state where member_id = auth.uid();
  delete from public.google_accounts where member_id = auth.uid();
  update public.app_settings set gcal_writer_id = null where gcal_writer_id = auth.uid();
  if sid is not null then
    begin
      execute 'delete from vault.secrets where id = $1' using sid;
    exception when others then
      null; -- si Vault no permite borrar, el secreto queda huérfano pero sin cuenta que lo use
    end;
  end if;
end $$;

revoke execute on function public.gcal_guardar_token(uuid, text) from public, anon, authenticated;
revoke execute on function public.gcal_leer_token(uuid) from public, anon, authenticated;
revoke execute on function public.gcal_desconectar() from public, anon;
grant execute on function public.gcal_desconectar() to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.gcal_guardar_token(uuid, text) to service_role;
    grant execute on function public.gcal_leer_token(uuid) to service_role;
  end if;
end $$;

-- Sincronización cada 15 minutos (solo donde existen pg_cron y pg_net).
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule(
      'casa-en-orden-google',
      '*/15 * * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'casa_project_url')
                 || '/functions/v1/gcal-sync',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'casa_digest_secret')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;
end
$do$;
