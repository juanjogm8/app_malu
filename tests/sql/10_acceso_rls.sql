-- Pruebas de alta controlada y RLS (SPEC §5.3, §16)
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set X '00000000-0000-0000-0000-00000000000c'

-- Alta: los dos correos autorizados entran (sin importar mayúsculas), un tercero es rechazado.
insert into auth.users (id, email, raw_user_meta_data) values
  (:'A', 'JuanJoGamur@gmail.com', '{"full_name":"Juanjo G"}'),
  (:'B', 'm.rm91@hotmail.com', '{}');

do $$ begin
  assert (select count(*) from public.members) = 2, 'deben existir 2 miembros';
  assert (select name from public.members where email ilike 'juanjogamur@gmail.com') = 'Juanjo G', 'nombre desde Google';
  assert (select name from public.members where email = 'm.rm91@hotmail.com') = 'm.rm91', 'nombre desde el correo';
  assert (select count(distinct color) from public.members) = 2, 'colores distintos';
  assert (select color from public.members where email = 'm.rm91@hotmail.com') = 'teja', 'persona B = teja';
end $$;

do $$ begin
  insert into auth.users (email) values ('intruso@example.com');
  raise exception 'FALLO: un correo no autorizado pudo registrarse';
exception when raise_exception then
  if sqlerrm like 'FALLO%' then raise; end if;
end $$;
do $$ begin
  assert not exists (select 1 from auth.users where email = 'intruso@example.com'), 'el usuario rechazado no debe quedar';
end $$;

-- Una fila de ejemplo por tabla (como superusuario) y la sentencia para insertar otra.
create temp table casos (tbl text primary key, ins text not null);
insert into casos values
  ('tasks',            $$insert into public.tasks (text) values ('t')$$),
  ('events',           $$insert into public.events (title, date) values ('e', '2026-10-12')$$),
  ('important_dates',  $$insert into public.important_dates (name, date) values ('f', '1990-05-01')$$),
  ('meals',            $$insert into public.meals (date, meal, text) values ('2026-10-13', 'cena', 'm')$$),
  ('plans',            $$insert into public.plans (text) values ('p')$$),
  ('notes',            $$insert into public.notes (title) values ('n')$$),
  ('contacts',         $$insert into public.contacts (name) values ('c')$$),
  ('shopping_items',   $$insert into public.shopping_items (text) values ('s')$$),
  ('purchases',        $$insert into public.purchases (text) values ('c')$$),
  ('home_improvements',$$insert into public.home_improvements (text) values ('h')$$);
grant select on casos to public;

do $$ declare r record; begin
  for r in select * from casos loop
    execute replace(r.ins, $q$'2026-10-13'$q$, $q$'2026-10-12'$q$);
  end loop;
end $$;

-- Función de ayuda: para cada tabla intenta leer, insertar, actualizar y borrar como el rol actual.
create or replace function pg_temp.sin_acceso(etiqueta text) returns void language plpgsql as $$
declare r record; n int;
begin
  for r in select * from casos loop
    begin
      execute format('select count(*) from public.%I', r.tbl) into n;
      if n <> 0 then raise exception 'FALLO %: leyó % filas de %', etiqueta, n, r.tbl; end if;
    exception when insufficient_privilege then null;
    end;
    begin
      execute r.ins;
      raise exception 'FALLO %: insertó en %', etiqueta, r.tbl;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('update public.%I set created_at = now()', r.tbl);
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'FALLO %: actualizó % filas de %', etiqueta, n, r.tbl; end if;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('delete from public.%I', r.tbl);
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'FALLO %: borró % filas de %', etiqueta, n, r.tbl; end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  -- members, allowed_emails y app_settings
  begin
    execute 'select count(*) from public.members' into n;
    if n <> 0 then raise exception 'FALLO %: leyó members', etiqueta; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select count(*) from public.allowed_emails' into n;
    if n <> 0 then raise exception 'FALLO %: leyó allowed_emails', etiqueta; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select count(*) from public.app_settings' into n;
    if n <> 0 then raise exception 'FALLO %: leyó app_settings', etiqueta; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.complete_task((select null::uuid));
    raise exception 'FALLO %: complete_task respondió', etiqueta;
  exception when insufficient_privilege or raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
end $$;

-- 1) Anónimo: nada.
set role anon;
select set_config('request.jwt.claims', '', false);
select pg_temp.sin_acceso('anon');
reset role;

-- 2) Autenticado que no es miembro: nada.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'X')::text, false);
select pg_temp.sin_acceso('no miembro');
reset role;

-- 3) Miembro: lee y escribe todo.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
do $$ declare r record; n int; begin
  for r in select * from casos loop
    execute format('select count(*) from public.%I', r.tbl) into n;
    assert n = 1, format('miembro debe leer 1 fila de %s (leyó %s)', r.tbl, n);
    execute r.ins;
    execute format('update public.%I set created_at = now()', r.tbl);
    get diagnostics n = row_count;
    assert n = 2, format('miembro debe actualizar 2 filas de %s', r.tbl);
    execute format('delete from public.%I', r.tbl);
    get diagnostics n = row_count;
    assert n = 2, format('miembro debe borrar 2 filas de %s', r.tbl);
  end loop;
  assert (select count(*) from public.members) = 2, 'miembro ve a los 2 miembros';
  assert (select count(*) from public.app_settings) = 1, 'miembro ve los ajustes';
  assert (select telegram_digest_per_person from public.app_settings) = false, 'flag de Telegram apagado';
end $$;

-- created_by se llena solo con quien escribe.
do $$ begin
  insert into public.shopping_items (text) values ('leche');
  assert (select created_by from public.shopping_items where text = 'leche') = auth.uid(), 'created_by = auth.uid()';
  delete from public.shopping_items;
end $$;

-- 4) Un miembro edita su fila pero no la del otro, ni columnas protegidas.
do $$ declare n int; begin
  update public.members set name = 'Juanjo' where id = auth.uid();
  get diagnostics n = row_count;
  assert n = 1, 'debe poder editar su nombre';

  update public.members set name = 'Hackeado' where id <> auth.uid();
  get diagnostics n = row_count;
  assert n = 0, 'no debe editar la fila del otro';

  begin
    update public.members set telegram_chat_id = 123 where id = auth.uid();
    raise exception 'FALLO: editó telegram_chat_id';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.members set email = 'otro@x.com' where id = auth.uid();
    raise exception 'FALLO: editó su correo';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.members set color = (select color from public.members where id <> auth.uid()) where id = auth.uid();
    raise exception 'FALLO: los dos quedaron con el mismo color';
  exception when unique_violation then null;
  end;
  begin
    update public.members set color = '#ff0000' where id = auth.uid();
    raise exception 'FALLO: aceptó un color fuera de la paleta';
  exception when check_violation then null;
  end;
  update public.members set color = 'jade' where id = auth.uid();
  begin
    insert into public.members (id, email) values (gen_random_uuid(), 'x@x.com');
    raise exception 'FALLO: insertó en members';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select name from public.members where id = '00000000-0000-0000-0000-00000000000b') = 'm.rm91',
    'la fila del otro no cambió';
end $$;
