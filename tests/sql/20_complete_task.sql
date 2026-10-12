-- Pruebas de complete_task (SPEC §5.4, §16)
-- Usa los miembros A y B creados en 10_acceso_rls.sql.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);

create or replace function pg_temp.hoy() returns date language sql as $$
  select (now() at time zone 'America/Mexico_City')::date
$$;

do $$
declare
  t public.tasks;
  hoy date := pg_temp.hoy();
  a uuid := '00000000-0000-0000-0000-00000000000a';
  b uuid := '00000000-0000-0000-0000-00000000000b';
begin
  -- Sin repetición: alterna hecho / no hecho
  insert into public.tasks (text) values ('una vez') returning * into t;
  t := public.complete_task(t.id);
  assert t.done and t.done_on = hoy, 'sin repetición: queda hecha hoy';
  t := public.complete_task(t.id);
  assert not t.done and t.done_on is null, 'sin repetición: se puede desmarcar';

  -- Semanal adelantada: pasa a la siguiente semana
  insert into public.tasks (text, repeat, due_date) values ('basura', 'semanal', hoy + 2) returning * into t;
  t := public.complete_task(t.id);
  assert t.due_date = hoy + 9, format('semanal adelantada: esperaba %s, obtuvo %s', hoy + 9, t.due_date);
  assert t.last_done_on = hoy and t.last_done_by = a, 'registra quién y cuándo';
  assert not t.done, 'las rutinas nunca quedan hechas';

  -- Semanal atrasada varios periodos: primera ocurrencia >= hoy, contando desde la original
  insert into public.tasks (text, repeat, due_date) values ('riego', 'semanal', hoy - 20) returning * into t;
  t := public.complete_task(t.id);
  assert t.due_date = hoy + 1, format('semanal atrasada: esperaba %s, obtuvo %s', hoy + 1, t.due_date);

  -- Que vence hoy: se completa y pasa al siguiente periodo
  insert into public.tasks (text, repeat, due_date) values ('hoy', 'quincenal', hoy) returning * into t;
  t := public.complete_task(t.id);
  assert t.due_date = hoy + 14, 'quincenal que vence hoy';

  -- Sin fecha: cuenta desde hoy
  insert into public.tasks (text, repeat) values ('sin fecha', 'mensual') returning * into t;
  t := public.complete_task(t.id);
  assert t.due_date = (hoy + interval '1 month')::date, 'mensual sin fecha';

  -- Rotación de responsable (y que no rote si no está activada)
  insert into public.tasks (text, repeat, due_date, assignee_id, rotate)
    values ('platos', 'semanal', hoy, a, true) returning * into t;
  t := public.complete_task(t.id);
  assert t.assignee_id = b, 'rota de A a B';
  t := public.complete_task(t.id);
  assert t.assignee_id = a, 'rota de B a A';

  insert into public.tasks (text, repeat, due_date, assignee_id) values ('fija', 'semanal', hoy, b) returning * into t;
  t := public.complete_task(t.id);
  assert t.assignee_id = b, 'sin rotación se queda igual';

  insert into public.tasks (text, repeat, due_date, is_shared, rotate) values ('ambos', 'semanal', hoy, true, true) returning * into t;
  t := public.complete_task(t.id);
  assert t.assignee_id is null and t.is_shared, '"Ambos" no rota';

  delete from public.tasks;
end $$;

-- Mensual con fin de mes, desde la fecha ORIGINAL. Probamos la aritmética de fechas que usa la función
-- con fechas fijas, porque "hoy" cambia: 31 ene + k meses → 28 feb, 31 mar, 30 abr.
do $$ begin
  assert ('2026-01-31'::date + make_interval(months => 1))::date = '2026-02-28', '31 ene + 1 mes';
  assert ('2026-01-31'::date + make_interval(months => 2))::date = '2026-03-31', '31 ene + 2 meses (no arrastra el 28)';
  assert ('2026-01-31'::date + make_interval(months => 3))::date = '2026-04-30', '31 ene + 3 meses';
  assert ('2028-02-29'::date + make_interval(months => 12))::date = '2029-02-28', '29 feb + 1 año';
end $$;

-- Mensual atrasada con fecha original día 31: el resultado conserva el día 31 cuando existe.
do $$
declare t public.tasks; hoy date := pg_temp.hoy(); base date; esperado date; k int := 1;
begin
  base := (date_trunc('month', hoy - interval '5 months') + interval '1 month - 1 day')::date; -- último día de hace 5 meses
  loop
    esperado := (base + make_interval(months => k))::date;
    exit when esperado >= hoy;
    k := k + 1;
  end loop;
  insert into public.tasks (text, repeat, due_date) values ('colegiatura', 'mensual', base) returning * into t;
  t := public.complete_task(t.id);
  assert t.due_date = esperado, format('mensual atrasada: esperaba %s, obtuvo %s', esperado, t.due_date);
  delete from public.tasks;
end $$;

-- No encontrado
do $$ begin
  perform public.complete_task(gen_random_uuid());
  raise exception 'FALLO: no avisó que no existe';
exception when raise_exception then
  if sqlerrm not like 'Pendiente no encontrado' then raise; end if;
end $$;
reset role;
