-- Lista de niños: renombrar actualiza los eventos; borrar los deja sin niño; sin nombres repetidos.
\set A '00000000-0000-0000-0000-00000000000a'

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
do $$ begin
  insert into public.kids (name) values ('Sofi'), ('Mateo');
  insert into public.events (title, date, kid, kid_kind) values
    ('Clase de piano', '2026-10-14', 'Sofi', 'actividad'),
    ('Refuerzo', '2026-10-16', 'Mateo', 'vacuna');

  update public.kids set name = 'Sofía' where name = 'Sofi';
  assert (select kid from public.events where title = 'Clase de piano') = 'Sofía', 'renombrar actualiza eventos';

  delete from public.kids where name = 'Mateo';
  assert exists (select 1 from public.events where title = 'Refuerzo' and kid is null and kid_kind is null),
         'borrar deja el evento sin niño';

  begin
    insert into public.kids (name) values (' sofía ');
    raise exception 'FALLO: aceptó un nombre repetido';
  exception when unique_violation then null;
  end;
  delete from public.events where title in ('Clase de piano', 'Refuerzo'); delete from public.kids;
end $$;
reset role;
