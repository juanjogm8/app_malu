do $$ begin
  assert (select array_agg(name order by name) from public.kids) = array['Mateo', 'Sofi'],
         'los nombres de los eventos quedan dados de alta, sin repetir ni espacios';
  assert (select count(*) from public.events where kid = 'Sofi') = 2, 'nombres limpios en los eventos';
  delete from public.events; delete from public.kids; delete from public.google_pending_deletes;
end $$;
