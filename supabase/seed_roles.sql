-- LabFlow: asignar roles DESPUES de crear usuarios en Auth
-- 1) Crear usuarios en Authentication → Users (Auto Confirm)
-- 2) Ejecutar este SQL

-- Admin global (todos los laboratorios)
update public.profiles
set
  role = 'superadmin',
  full_name = 'Admin Global LabFlow',
  laboratory_id = null,
  facility_id = null,
  active = true
where email = 'laboraplus88@gmail.com';

-- Jefa demo del laboratorio C.S. El Paraiso
update public.profiles
set
  role = 'jefa',
  full_name = 'Dra. Tatiana Mejia',
  active = true
where email = 'jefatura@labflow.msp.gob.ec';

-- Personal demo (opcional)
update public.profiles
set role = 'tecnologo', full_name = 'Bq. Diana Pillajo', active = true
where email = 'tecnologo@labflow.msp.gob.ec';

update public.profiles
set role = 'toma', full_name = 'Lcda. Andrea Bravo', active = true
where email = 'muestras@labflow.msp.gob.ec';

update public.profiles
set role = 'medico', full_name = 'Dr. Mauricio Quishpe', active = true
where email = 'medico@labflow.msp.gob.ec';

-- Vincular jefa y staff al laboratorio LAB-493 (si existe 04_multitenant)
update public.profiles p
set laboratory_id = l.id
from public.laboratories l
where l.code = 'LAB-493'
  and p.email in (
    'jefatura@labflow.msp.gob.ec',
    'tecnologo@labflow.msp.gob.ec',
    'muestras@labflow.msp.gob.ec',
    'medico@labflow.msp.gob.ec'
  );

-- Facility C.S. El Paraiso
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

-- Verificar
select email, full_name, role, active, laboratory_id, facility_id
from public.profiles
order by role;
