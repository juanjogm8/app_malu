-- Completar una tarea de forma atómica (SPEC §5.4)
-- Los meses se cuentan desde la fecha ORIGINAL (base + k meses), igual que nth() del prototipo,
-- para que "31 ene + 1 mes" no arrastre el 28 de febrero a los meses siguientes.

create or replace function public.complete_task(p_id uuid) returns public.tasks
language plpgsql security invoker set search_path = public as $$
declare
  t public.tasks;
  n int;
  k int := 1;
  nxt date;
  base date;
  today date := (now() at time zone 'America/Mexico_City')::date;
begin
  select * into t from public.tasks where id = p_id for update;
  if not found then
    raise exception 'Pendiente no encontrado';
  end if;

  if t.repeat is null then            -- sin repetición: alternar hecho / no hecho
    update public.tasks
       set done = not t.done,
           done_on = case when t.done then null else today end
     where id = p_id
    returning * into t;
    return t;
  end if;

  n := case t.repeat
         when 'semanal' then 7 when 'quincenal' then 14
         when 'mensual' then 1 when 'bimestral' then 2 when 'trimestral' then 3
         when 'semestral' then 6 when 'anual' then 12
       end;
  base := coalesce(t.due_date, today);
  loop                                 -- primera ocurrencia >= hoy (y posterior a la fecha actual)
    nxt := case when t.repeat in ('semanal', 'quincenal') then base + (n * k)
                else (base + make_interval(months => n * k))::date end;
    exit when nxt >= today;
    k := k + 1;
  end loop;

  update public.tasks
     set due_date = nxt,
         last_done_on = today,
         last_done_by = auth.uid(),
         assignee_id = case
           when t.rotate and t.assignee_id is not null then coalesce(
             (select m.id from public.members m where m.id <> t.assignee_id order by m.created_at limit 1),
             t.assignee_id)
           else t.assignee_id
         end
   where id = p_id
  returning * into t;
  return t;
end $$;

revoke execute on function public.complete_task(uuid) from public, anon;
grant execute on function public.complete_task(uuid) to authenticated;
