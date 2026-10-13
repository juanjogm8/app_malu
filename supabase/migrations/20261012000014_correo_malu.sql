-- Malu entra con su cuenta de Google maria.rodriguezm.91@gmail.com en lugar del Hotmail
-- (también corrige las versiones mal escritas que se dieron de alta antes).
update public.allowed_emails set email = 'maria.rodriguezm.91@gmail.com'
 where email in ('m.rm91@hotmail.com', 'maria.rodriguez@gmail.com', 'maria.rodriguez.91@gmail.com');
insert into public.allowed_emails (email) values ('maria.rodriguezm.91@gmail.com') on conflict do nothing;
