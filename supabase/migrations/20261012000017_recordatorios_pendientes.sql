-- Recordatorios de pendientes con fecha: la víspera (20:00), el día (9:00) y, si nadie lo marcó, al
-- día siguiente (9:00). Al responsable o a los dos. Cada quien puede apagarlos.

alter table public.members add column task_reminders boolean not null default true;
grant update (task_reminders) on public.members to authenticated;

create table public.task_reminder_log (
  task_id uuid not null references public.tasks(id) on delete cascade,
  due_date date not null,
  tipo text not null check (tipo in ('antes','hoy','tarde')),
  member_id uuid not null references public.members(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (task_id, due_date, tipo, member_id)
);
alter table public.task_reminder_log enable row level security;
revoke all on public.task_reminder_log from anon, authenticated;

-- La misma llamada de cada minuto ahora también limpia esta bitácora.
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
        delete from public.task_reminder_log where sent_at < now() - interval '7 days';
      $job$
    );
  end if;
end
$do$;
