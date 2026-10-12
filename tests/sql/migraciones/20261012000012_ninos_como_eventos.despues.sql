do $$ begin
  assert to_regclass('public.kid_items') is null, 'kid_items ya no existe';
  assert (select count(*) from public.events where kid is not null) = 2, 'lo que tenía fecha pasó a eventos';
  assert exists (select 1 from public.events where title = 'Vacuna' and kid = 'Mateo' and kid_kind = 'vacuna'
                 and date = '2026-10-21' and time = '09:30' and notes = 'Llevar cartilla' and is_shared),
         'evento con niño, tipo, hora y notas';
  assert exists (select 1 from public.google_pending_deletes where google_event_id = 'gk1'),
         'lo publicado como Niños se borra de Google';
  assert (select count(*) from public.tasks where category = 'Niños') = 2, 'sin fecha y sin hacer → pendiente';
  assert exists (select 1 from public.tasks where text = 'Comprar uniforme · Sofi' and notes = 'Talla 8'), 'con nombre';
  assert exists (select 1 from public.tasks where text = 'Regalo para Sofi'), 'sin repetir el nombre';
  delete from public.events; delete from public.tasks; delete from public.google_pending_deletes;
end $$;
