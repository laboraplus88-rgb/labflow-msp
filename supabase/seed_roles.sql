-- Ejecutar DESPUES de crear los 4 usuarios en Authentication -> Users

update public.profiles
set role = 'jefa', full_name = 'Dra. Tatiana Mejia', active = true
where email = 'jefatura@labflow.msp.gob.ec';

update public.profiles
set role = 'tecnologo', full_name = 'Bq. Diana Pillajo', active = true
where email = 'tecnologo@labflow.msp.gob.ec';

update public.profiles
set role = 'toma', full_name = 'Lcda. Andrea Bravo', active = true
where email = 'muestras@labflow.msp.gob.ec';

update public.profiles
set role = 'medico', full_name = 'Dr. Mauricio Quishpe', active = true
where email = 'medico@labflow.msp.gob.ec';

update public.profiles p
set facility_id = f.id
from public.facilities f
where f.code = '493'
  and p.email in (
    'jefatura@labflow.msp.gob.ec',
    'tecnologo@labflow.msp.gob.ec',
    'muestras@labflow.msp.gob.ec',
    'medico@labflow.msp.gob.ec'
  );

select email, full_name, role, active from public.profiles order by role;
