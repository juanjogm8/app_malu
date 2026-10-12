-- Datos de Niños como estaban antes de pasarlos a eventos y pendientes.
insert into public.kid_items (text, kind, kid, date, time, notes, done, google_event_id) values
  ('Vacuna', 'vacuna', 'Mateo', '2026-10-21', '09:30', 'Llevar cartilla', false, 'gk1'),
  ('Festival', 'escuela', 'Sofi', '2026-09-01', null, null, true, null),
  ('Comprar uniforme', 'escuela', 'Sofi', null, null, 'Talla 8', false, null),
  ('Regalo para Sofi', 'fiesta', 'Sofi', null, null, null, false, null),
  ('Ya comprado', 'otro', null, null, null, null, true, null);
