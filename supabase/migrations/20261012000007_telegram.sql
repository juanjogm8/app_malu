-- Fase 2 · Avisos por Telegram (SPEC §10)

-- Preferencias por persona. Solo cuentan si app_settings.telegram_digest_per_person está encendido;
-- si está apagado, las dos personas reciben el diario a las 8:00 y el semanal el domingo a las 19:00.
alter table public.members
  add column digest_daily boolean not null default true,
  add column digest_daily_hour smallint not null default 8 check (digest_daily_hour between 5 and 22),
  add column digest_weekly boolean not null default true;
grant update (digest_daily, digest_daily_hour, digest_weekly) on public.members to authenticated;

-- Códigos de un solo uso para vincular el chat (/start CÓDIGO). Sin acceso desde la API.
create table public.telegram_link_codes (
  code text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table public.telegram_link_codes enable row level security;
revoke all on public.telegram_link_codes from anon, authenticated;

create or replace function public.create_telegram_link_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_member() then
    raise exception 'No autorizado';
  end if;
  delete from public.telegram_link_codes where member_id = auth.uid() or expires_at < now();
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.telegram_link_codes (code, member_id) values (c, auth.uid());
  return c;
end $$;

create or replace function public.unlink_telegram() returns void
language sql security definer set search_path = public as $$
  update public.members set telegram_chat_id = null where id = auth.uid() and public.is_member();
$$;

revoke execute on function public.create_telegram_link_code() from public, anon;
revoke execute on function public.unlink_telegram() from public, anon;
grant execute on function public.create_telegram_link_code() to authenticated;
grant execute on function public.unlink_telegram() to authenticated;

-- Evita mandar dos veces el mismo resumen el mismo día.
create table public.telegram_digest_log (
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('diario', 'semanal')),
  sent_on date not null,
  primary key (member_id, kind, sent_on)
);
alter table public.telegram_digest_log enable row level security;
revoke all on public.telegram_digest_log from anon, authenticated;

-- Programación: cada hora en punto (pg_cron usa UTC) se llama a la función `digest`, que decide a
-- quién le toca según la hora de la Ciudad de México. La URL del proyecto y el secreto se leen de
-- Supabase Vault (ver docs/PASOS-DEL-USUARIO.md); mientras no existan, la llamada falla sin efectos.
-- Solo corre donde existen pg_cron y pg_net (Supabase), no en el Postgres de las pruebas.
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    perform cron.schedule(
      'casa-en-orden-resumenes',
      '0 * * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'casa_project_url')
                 || '/functions/v1/digest',
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
