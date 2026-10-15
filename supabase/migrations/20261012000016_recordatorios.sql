-- Recordatorios de eventos 30 min antes (push y Telegram) a la persona del evento, o a las dos si es
-- de "Ambos". Cada quien puede apagarlos. La función `digest` los manda; pg_cron la llama cada minuto.

alter table public.members add column event_reminders boolean not null default true;
grant update (event_reminders) on public.members to authenticated;

-- Bitácora para no mandar dos veces el mismo recordatorio (si cambia la hora, se vuelve a mandar).
create table public.event_reminder_log (
  event_id uuid not null references public.events(id) on delete cascade,
  fecha date not null,
  hora time not null,
  member_id uuid not null references public.members(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, fecha, hora, member_id)
);
alter table public.event_reminder_log enable row level security;
revoke all on public.event_reminder_log from anon, authenticated;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule(
      'casa-en-orden-recordatorios',
      '* * * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'casa_project_url')
                 || '/functions/v1/digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'casa_digest_secret')
          ),
          body := '{"tipo":"recordatorios"}'::jsonb
        );
        delete from public.event_reminder_log where sent_at < now() - interval '3 days';
      $job$
    );
  end if;
end
$do$;
