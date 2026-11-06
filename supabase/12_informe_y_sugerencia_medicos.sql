-- LabFlow 12 (ya aplicada). Sugerencias de medico solicitante e informe de resultados.
create or replace function public.lab_doctor_names(p_q text default '')
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(n order by n), '{}')
  from (
    select distinct n
    from (
      select p.full_name as n from public.profiles p
       where p.laboratory_id = private.my_laboratory_id() and p.role = 'medico' and p.active
      union
      select er.requesting_doctor from public.exam_requests er
       where er.laboratory_id = private.my_laboratory_id() and er.requesting_doctor is not null
    ) s
    where private.current_app_role() in ('jefa','tecnologo','toma','medico')
      and n is not null and btrim(n) <> '' and (coalesce(p_q, '') = '' or n ilike '%' || p_q || '%')
    order by n limit 15
  ) t;
$$;
revoke execute on function public.lab_doctor_names(text) from public, anon;
grant execute on function public.lab_doctor_names(text) to authenticated;

-- public.report_data(p_request_id): datos completos del informe de UNA orden.
-- Acceso: personal del laboratorio de la orden, o el medico que la solicito. Solo resultados validados.
-- (Definicion completa aplicada en Supabase: migracion labflow_12_informe_y_sugerencia_medicos.)
