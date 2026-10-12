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
