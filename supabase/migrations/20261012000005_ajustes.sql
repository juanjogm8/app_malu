-- Ajustes de la casa (una sola fila). Flags que se activan más adelante.

create table public.app_settings (
  id boolean primary key default true check (id),
  -- Fase 2 (Telegram). Apagado: los resúmenes llegan a las dos personas siempre.
  -- Encendido: cada persona elige en Ajustes si recibe cada resumen y a qué hora.
  telegram_digest_per_person boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;

create trigger set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
create policy "ver ajustes" on public.app_settings for select to authenticated using (public.is_member());
create policy "editar ajustes" on public.app_settings for update to authenticated
  using (public.is_member()) with check (public.is_member());

revoke all on public.app_settings from anon, authenticated;
grant select, update (telegram_digest_per_person) on public.app_settings to authenticated;
