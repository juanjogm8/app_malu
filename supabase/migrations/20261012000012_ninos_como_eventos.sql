-- Niños pasa a ser una vista de los eventos que tienen niño (events.kid), con un tipo opcional.
-- Lo guardado en kid_items se mueve: con fecha → evento; sin fecha y sin hacer → pendiente.
-- Después se elimina kid_items (y lo que la migración anterior le agregó para Google).

alter table public.events
  add column kid_kind text check (kid_kind in ('cita','vacuna','actividad','escuela','fiesta','otro'));

-- Con fecha → evento de los dos, con su niño, tipo, hora y notas. Lo que ya estaba publicado en
-- Google se borra allá; el evento nuevo se publica solo en la siguiente sincronización.
insert into public.events (title, date, time, kid, kid_kind, notes, is_shared, created_by, created_at)
select text, date, time, kid, kind, notes, true, created_by, created_at
  from public.kid_items
 where date is not null;

insert into public.google_pending_deletes (google_event_id)
select google_event_id from public.kid_items where google_event_id is not null
on conflict do nothing;

-- Sin fecha y sin hacer → pendiente sin asignar, tipo "Niños", con el nombre del niño en el texto.
insert into public.tasks (text, category, notes, created_by, created_at)
select left(case when kid is null or position(lower(kid) in lower(text)) > 0 then text
                 else text || ' · ' || kid end, 120),
       'Niños', notes, created_by, created_at
  from public.kid_items
 where date is null and not done;

drop table public.kid_items;
drop function if exists public.kid_items_google_pendiente();
