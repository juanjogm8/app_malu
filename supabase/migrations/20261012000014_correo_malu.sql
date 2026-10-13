-- Malu entra con su cuenta de Google maria.rodriguez.91@gmail.com en lugar del Hotmail
-- (también corrige maria.rodriguez@gmail.com, que se dio de alta por error).
update public.allowed_emails set email = 'maria.rodriguez.91@gmail.com'
 where email in ('m.rm91@hotmail.com', 'maria.rodriguez@gmail.com');
insert into public.allowed_emails (email) values ('maria.rodriguez.91@gmail.com') on conflict do nothing;
