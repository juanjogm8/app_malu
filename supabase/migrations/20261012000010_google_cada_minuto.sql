-- La sincronización con Google pasa de cada 15 minutos a cada minuto: un evento creado en la app
-- aparece en "Casa en Orden" de Google en menos de un minuto.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.alter_job(jobid, schedule := '* * * * *')
    from cron.job where jobname = 'casa-en-orden-google';
  end if;
end
$do$;
