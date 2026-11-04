-- LabFlow 07 (ya aplicada en Supabase). Orden: schema -> 03 -> 04 -> 05 -> 06 -> ESTE archivo.
-- Panel del medico: busqueda de pacientes del laboratorio, resultados solo validados, RPC doctor_panel.

-- 1) Buscar pacientes: cualquier usuario activo del laboratorio ve los pacientes de SU laboratorio
drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id())
  and (select private.current_app_role()) in ('jefa','tecnologo','toma','medico')
);

-- 2) Resultados: el medico solo ve examenes ya validados de SUS ordenes
drop policy if exists tests_select on public.tests;
create policy tests_select on public.tests for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id())
  and (
    (select private.is_lab_staff())
    or (
      stage in ('Validado','Entregado')
      and exists (select 1 from public.exam_requests er where er.id = tests.request_id and er.doctor_id = (select auth.uid()))
    )
  )
);

-- 3) Panel del medico: ordenes emitidas / entregadas en la ventana de su guardia + pendientes
create or replace function public.doctor_panel(p_from timestamptz, p_to timestamptz)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_lab uuid := private.my_laboratory_id();
  v_res json;
begin
  if private.current_app_role() is distinct from 'medico' then
    raise exception 'Solo medicos';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '8 days' then
    raise exception 'Rango de fechas invalido';
  end if;

  with ord as (
    select er.id, er.code, er.created_at, er.order_type, er.priority, er.diagnosis,
           p.id as patient_id,
           trim(concat_ws(' ', p.apellido_paterno, p.apellido_materno, p.primer_nombre, p.segundo_nombre)) as patient_name,
           p.cedula, p.edad, p.sexo
    from public.exam_requests er
    join public.patients p on p.id = er.patient_id
    where er.doctor_id = v_uid and er.laboratory_id = v_lab
  ),
  agg as (
    select o.*, a.exams_total, a.exams_ready, a.last_validated_at
    from ord o
    cross join lateral (
      select count(*)::int as exams_total,
             (count(*) filter (where t.stage in ('Validado','Entregado')))::int as exams_ready,
             max(t.validated_at) filter (where t.stage in ('Validado','Entregado')) as last_validated_at
      from public.tests t where t.request_id = o.id
    ) a
  ),
  kp as (
    select
      (count(*) filter (where created_at >= p_from and created_at < p_to))::int as issued,
      (count(*) filter (where exams_total > 0 and exams_ready = exams_total
                         and last_validated_at >= p_from and last_validated_at < p_to))::int as delivered,
      (count(*) filter (where exams_ready < exams_total))::int as open_orders,
      avg(extract(epoch from (last_validated_at - created_at)) / 60.0)
        filter (where exams_total > 0 and exams_ready = exams_total
                  and last_validated_at >= p_from and last_validated_at < p_to) as avg_tat
    from agg
  ),
  urg as (
    select count(*)::int as n
    from public.tests t join agg a on a.id = t.request_id
    where t.priority = 'Urgente' and t.stage not in ('Validado','Entregado')
  ),
  sel as (
    select * from agg
    where (created_at >= p_from and created_at < p_to)
       or (exams_total > 0 and exams_ready = exams_total and last_validated_at >= p_from and last_validated_at < p_to)
       or exams_ready < exams_total
    order by created_at desc
    limit 300
  )
  select json_build_object(
    'from', p_from,
    'to', p_to,
    'kpis', (select json_build_object(
        'issued', issued, 'delivered', delivered, 'open', open_orders,
        'urgentOpen', (select n from urg),
        'avgTatMin', case when avg_tat is null then null else round(avg_tat)::int end
      ) from kp),
    'orders', (select coalesce(json_agg(json_build_object(
        'id', s.id, 'code', s.code, 'createdAt', s.created_at,
        'orderType', s.order_type, 'priority', s.priority, 'diagnosis', s.diagnosis,
        'patient', json_build_object('id', s.patient_id, 'name', s.patient_name, 'cedula', s.cedula, 'age', s.edad, 'sex', s.sexo),
        'examsTotal', s.exams_total, 'examsReady', s.exams_ready, 'lastValidatedAt', s.last_validated_at,
        'tests', (select coalesce(json_agg(json_build_object(
            'id', t.id, 'examName', t.exam_name, 'category', t.category, 'stage', t.stage, 'priority', t.priority,
            'ready', (t.stage in ('Validado','Entregado')),
            'result', case when t.stage in ('Validado','Entregado') then t.result end,
            'unit', t.result_unit, 'range', t.result_range,
            'flag', case when t.stage in ('Validado','Entregado') then t.result_flag end,
            'validatedAt', case when t.stage in ('Validado','Entregado') then t.validated_at end
          ) order by t.category, t.exam_name), '[]'::json)
          from public.tests t where t.request_id = s.id)
      ) order by s.created_at desc), '[]'::json) from sel s)
  ) into v_res;

  return v_res;
end;
$$;

revoke execute on function public.doctor_panel(timestamptz, timestamptz) from public, anon;
grant execute on function public.doctor_panel(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
