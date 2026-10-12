-- Pruebas de vinculación de Telegram
\set A '00000000-0000-0000-0000-00000000000a'
\set X '00000000-0000-0000-0000-00000000000c'

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
do $$
declare c1 text; c2 text; n int;
begin
  c1 := public.create_telegram_link_code();
  assert length(c1) = 8, 'código de 8 caracteres';
  c2 := public.create_telegram_link_code();
  assert c1 <> c2, 'código nuevo';
  begin
    select count(*) into n from public.telegram_link_codes;
    raise exception 'FALLO: leyó telegram_link_codes';
  exception when insufficient_privilege then null;
  end;
  update public.members set digest_daily_hour = 9, digest_weekly = false where id = auth.uid();
  begin
    update public.members set digest_daily_hour = 3 where id = auth.uid();
    raise exception 'FALLO: aceptó una hora fuera de rango';
  exception when check_violation then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select count(*) from public.telegram_link_codes) = 1, 'solo queda el último código';
  update public.members set telegram_chat_id = 123 where id = '00000000-0000-0000-0000-00000000000a';
end $$;

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
select public.unlink_telegram();
reset role;
do $$ begin
  assert (select telegram_chat_id from public.members where id = '00000000-0000-0000-0000-00000000000a') is null,
    'desvinculó su chat';
end $$;

-- Quien no es miembro no puede generar códigos
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'X')::text, false);
do $$ begin
  perform public.create_telegram_link_code();
  raise exception 'FALLO: un no miembro generó código';
exception when raise_exception then
  if sqlerrm like 'FALLO%' then raise; end if;
end $$;
reset role;
