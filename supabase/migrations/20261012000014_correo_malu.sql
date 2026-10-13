-- Malu entra con su cuenta de Google maria.rodriguez@gmail.com en lugar del Hotmail.
update public.allowed_emails set email = 'maria.rodriguez@gmail.com' where email = 'm.rm91@hotmail.com';
insert into public.allowed_emails (email) values ('maria.rodriguez@gmail.com') on conflict do nothing;
