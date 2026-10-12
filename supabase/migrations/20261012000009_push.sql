-- Fase 4 · Notificaciones push (Web Push con VAPID). Una fila por dispositivo suscrito.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references public.members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- Cada quien maneja solo sus dispositivos.
create policy "mis dispositivos" on public.push_subscriptions for all to authenticated
  using (public.is_member() and member_id = auth.uid())
  with check (public.is_member() and member_id = auth.uid());
revoke all on public.push_subscriptions from anon;
