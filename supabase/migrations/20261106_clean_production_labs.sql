-- ============================================================
-- LIMPIEZA DE DATOS DE PRODUCCIÓN
-- Laboratorios: Sano y El Paraíso (dejar en cero)
-- Ejecutar en SQL Editor de Supabase con cuidado.
-- ============================================================

-- 1) Ver laboratorios existentes
select id, name, code, city from public.laboratories order by name;

-- 2) Identificar IDs (ajusta los nombres si difieren)
-- Ejemplo:
-- select id, name from public.laboratories
-- where name ilike '%sano%' or name ilike '%paraíso%' or name ilike '%paraiso%';

do $$
declare
  lab_ids uuid[];
begin
  select array_agg(id) into lab_ids
  from public.laboratories
  where name ilike '%sano%'
     or name ilike '%paraíso%'
     or name ilike '%paraiso%';

  if lab_ids is null or array_length(lab_ids, 1) is null then
    raise notice 'No se encontraron laboratorios Sano / El Paraíso. Revisa los nombres.';
    return;
  end if;

  raise notice 'Laboratorios a limpiar: %', lab_ids;

  -- Orden: hijos primero
  -- Logs de etapas (si existe)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'test_stage_logs') then
    delete from public.test_stage_logs
    where test_id in (
      select t.id from public.tests t
      join public.exam_requests r on r.id = t.request_id
      where r.laboratory_id = any(lab_ids)
         or exists (
           select 1 from public.profiles p
           where p.id = r.created_by and p.laboratory_id = any(lab_ids)
         )
    );
  end if;

  -- Tests vinculados a solicitudes del lab (vía created_by / laboratory_id si existe)
  delete from public.tests
  where request_id in (
    select r.id from public.exam_requests r
    where (
      (r.laboratory_id is not null and r.laboratory_id = any(lab_ids))
      or exists (
        select 1 from public.profiles p
        where p.id = coalesce(r.created_by, r.doctor_id) and p.laboratory_id = any(lab_ids)
      )
    )
  );

  delete from public.samples
  where request_id in (
    select r.id from public.exam_requests r
    where (
      (r.laboratory_id is not null and r.laboratory_id = any(lab_ids))
      or exists (
        select 1 from public.profiles p
        where p.id = coalesce(r.created_by, r.doctor_id) and p.laboratory_id = any(lab_ids)
      )
    )
  );

  delete from public.exam_requests
  where (
    (laboratory_id is not null and laboratory_id = any(lab_ids))
    or exists (
      select 1 from public.profiles p
      where p.id = coalesce(created_by, doctor_id) and p.laboratory_id = any(lab_ids)
    )
  );

  -- Pacientes creados por personal de esos labs (opcional: solo si no se comparten entre labs)
  delete from public.patients
  where created_by in (
    select id from public.profiles where laboratory_id = any(lab_ids)
  );

  raise notice 'Limpieza completada para laboratorios Sano / El Paraíso.';
end $$;

-- 3) Verificación (debe dar 0 en conteos de trabajo)
-- select count(*) from public.exam_requests;
-- select count(*) from public.tests;
-- select count(*) from public.samples;
-- select count(*) from public.patients;
