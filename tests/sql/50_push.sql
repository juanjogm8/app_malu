\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
insert into public.push_subscriptions (member_id, endpoint, p256dh, auth) values (:'B', 'https://push/b', 'k', 'a');

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
do $$ begin
  insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push/a', 'k', 'a');
  assert (select count(*) from public.push_subscriptions) = 1, 'solo ve sus dispositivos';
  begin
    insert into public.push_subscriptions (member_id, endpoint, p256dh, auth)
      values ('00000000-0000-0000-0000-00000000000b', 'https://push/x', 'k', 'a');
    raise exception 'FALLO: registró un dispositivo a nombre de otra persona';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Bitácora de recordatorios: solo funciones; cada quien puede apagar sus recordatorios.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a')::text, false);
do $$ declare n int; begin
  begin
    select count(*) into n from public.event_reminder_log;
    raise exception 'FALLO: leyó la bitácora de recordatorios';
  exception when insufficient_privilege then null;
  end;
  update public.members set event_reminders = false where id = auth.uid();
  assert (select event_reminders from public.members where id = auth.uid()) = false, 'apaga sus recordatorios';
  update public.members set event_reminders = true where id = auth.uid();
  begin
    select count(*) into n from public.task_reminder_log;
    raise exception 'FALLO: leyó la bitácora de pendientes';
  exception when insufficient_privilege then null;
  end;
  update public.members set task_reminders = false where id = auth.uid();
  assert (select task_reminders from public.members where id = auth.uid()) = false, 'apaga pendientes';
  update public.members set task_reminders = true where id = auth.uid();
end $$;
reset role;
