-- Pruebas de Google Calendar: lectura de miembros, nada de tokens desde la API, tombstones.
\set A '00000000-0000-0000-0000-00000000000a'
\set X '00000000-0000-0000-0000-00000000000c'

insert into public.google_accounts (member_id, google_email, token_secret_id)
  values (:'A', 'juanjo@gmail.com', gen_random_uuid());
insert into public.google_events (member_id, calendar_id, google_event_id, title, date)
  values (:'A', 'primary', 'g1', 'Junta de trabajo', '2026-10-13');

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
do $$ declare n int; begin
  assert (select count(*) from public.google_events) = 1, 'miembro lee eventos de google';
  assert (select google_email from public.google_accounts) = 'juanjo@gmail.com', 'miembro ve la cuenta';
  begin
    perform token_secret_id from public.google_accounts;
    raise exception 'FALLO: leyó token_secret_id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.google_events (member_id, calendar_id, google_event_id, title, date)
      values (auth.uid(), 'primary', 'g2', 'x', '2026-10-13');
    raise exception 'FALLO: escribió en google_events';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.gcal_leer_token(auth.uid());
    raise exception 'FALLO: leyó el token';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.google_sync_state;
    raise exception 'FALLO: leyó google_sync_state';
  exception when insufficient_privilege then null;
  end;

  -- Cambiar un evento lo marca para publicar; borrarlo deja pendiente el borrado en Google.
  insert into public.events (title, date, google_event_id, google_synced_at)
    values ('Cena', '2026-10-20', 'ge1', now());
  update public.events set title = 'Cena con amigos' where google_event_id = 'ge1';
  assert (select google_synced_at from public.events where google_event_id = 'ge1') is null, 'pendiente de publicar';
  delete from public.events where google_event_id = 'ge1';

  -- Cambiar el niño de un evento también lo vuelve a publicar.
  insert into public.events (title, date, google_event_id, google_synced_at)
    values ('Natación', '2026-10-20', 'ge2', now());
  update public.events set kid = 'Sofi' where google_event_id = 'ge2';
  assert (select google_synced_at from public.events where google_event_id = 'ge2') is null, 'evento con niño pendiente';
  update public.events set kid_kind = 'actividad' where google_event_id = 'ge2';
  begin
    update public.events set kid_kind = 'inventado' where google_event_id = 'ge2';
    raise exception 'FALLO: aceptó un tipo de niño inválido';
  exception when check_violation then null;
  end;
end $$;
reset role;

do $$ begin
  assert exists (select 1 from public.google_pending_deletes where google_event_id = 'ge1'), 'borrado pendiente en Google';
end $$;

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'X')::text, false);
do $$ begin
  assert (select count(*) from public.google_events) = 0, 'no miembro no lee eventos de google';
  assert (select count(*) from public.google_accounts) = 0, 'no miembro no ve cuentas';
end $$;
reset role;
