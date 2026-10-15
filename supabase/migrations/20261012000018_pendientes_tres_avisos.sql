-- El día del vencimiento llegan tres avisos (9:00, 14:00 y 19:00) en lugar de uno.
alter table public.task_reminder_log drop constraint task_reminder_log_tipo_check;
alter table public.task_reminder_log
  add constraint task_reminder_log_tipo_check check (tipo in ('antes','hoy','hoy2','hoy3','tarde'));
