-- Reglas de acceso y tiempo real (SPEC §5.3)

do $$
declare t text;
begin
  foreach t in array array['tasks','events','important_dates','kid_items','meals','plans','notes',
                           'contacts','shopping_items','purchases','home_improvements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo miembros" on public.%I for all to authenticated
         using (public.is_member()) with check (public.is_member())', t);
    -- Los anónimos no tienen nada que hacer aquí, ni siquiera con RLS de por medio.
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

alter publication supabase_realtime add table
  public.tasks, public.events, public.important_dates, public.kid_items, public.meals,
  public.plans, public.notes, public.contacts, public.shopping_items, public.purchases,
  public.home_improvements, public.members;
