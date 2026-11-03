-- LabFlow — RPCs, roles helpers y RLS reforzado
-- Ejecutar DESPUÉS de schema.sql

create schema if not exists private;

create or replace function private.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = (select auth.uid()) and active = true;
$$;

create or replace function private.is_lab_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() in ('jefa', 'tecnologo', 'toma'), false);
$$;

create or replace function private.is_jefa_or_tecnologo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() in ('jefa', 'tecnologo'), false);
$$;

create or replace function private.is_jefa()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() = 'jefa', false);
$$;

create or replace function private.is_medico()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() = 'medico', false);
$$;

create or replace function private.can_validate_results()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() in ('jefa', 'tecnologo'), false);
$$;

create or replace function private.can_collect_samples()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() in ('jefa', 'tecnologo', 'toma'), false);
$$;

grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_lab_staff() to authenticated;
grant execute on function private.is_jefa_or_tecnologo() to authenticated;
grant execute on function private.is_jefa() to authenticated;
grant execute on function private.is_medico() to authenticated;
grant execute on function private.can_validate_results() to authenticated;
grant execute on function private.can_collect_samples() to authenticated;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select private.current_app_role();
$$;
grant execute on function public.my_role() to authenticated;

create or replace function public.dashboard_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := private.current_app_role();
  v_today timestamptz := date_trunc('day', now());
  v_samples_today int; v_tests_today int; v_pending int; v_urgent int; v_validated_today int;
begin
  if v_role is null then raise exception 'No autenticado o sin perfil'; end if;

  if v_role = 'medico' then
    select count(*) into v_tests_today from public.tests t
      join public.exam_requests er on er.id = t.request_id
      where er.doctor_id = auth.uid() and t.created_at >= v_today;
    select count(*) into v_pending from public.tests t
      join public.exam_requests er on er.id = t.request_id
      where er.doctor_id = auth.uid() and t.stage not in ('Validado', 'Entregado');
    select count(*) into v_urgent from public.tests t
      join public.exam_requests er on er.id = t.request_id
      where er.doctor_id = auth.uid() and t.priority = 'Urgente' and t.stage not in ('Validado', 'Entregado');
    select count(*) into v_samples_today from public.samples s
      join public.exam_requests er on er.id = s.request_id
      where er.doctor_id = auth.uid() and s.created_at >= v_today;
    select count(*) into v_validated_today from public.tests t
      join public.exam_requests er on er.id = t.request_id
      where er.doctor_id = auth.uid() and t.validated_at >= v_today;
  else
    select count(*) into v_samples_today from public.samples where created_at >= v_today;
    select count(*) into v_tests_today from public.tests where created_at >= v_today;
    select count(*) into v_pending from public.tests where stage not in ('Validado', 'Entregado');
    select count(*) into v_urgent from public.tests where priority = 'Urgente' and stage not in ('Validado', 'Entregado');
    select count(*) into v_validated_today from public.tests where validated_at >= v_today;
  end if;

  return json_build_object(
    'role', v_role,
    'samplesToday', coalesce(v_samples_today, 0),
    'testsToday', coalesce(v_tests_today, 0),
    'pending', coalesce(v_pending, 0),
    'urgentOpen', coalesce(v_urgent, 0),
    'validatedToday', coalesce(v_validated_today, 0)
  );
end;
$$;
grant execute on function public.dashboard_stats() to authenticated;

create or replace function public.advance_test_stage(
  p_test_id uuid, p_stage text,
  p_result text default null, p_result_flag text default null, p_note text default null
)
returns public.tests language plpgsql security definer set search_path = public as $$
declare
  v_role text := private.current_app_role();
  v_row public.tests;
begin
  if v_role is null then raise exception 'No autenticado'; end if;
  if p_stage = 'Validado' and not private.can_validate_results() then
    raise exception 'Solo jefa o tecnologo pueden validar resultados';
  end if;
  if v_role = 'toma' and p_stage not in ('Solicitado', 'Muestra recolectada', 'Recibida en laboratorio') then
    raise exception 'Rol toma solo puede gestionar etapas de recoleccion';
  end if;
  if v_role = 'medico' then
    raise exception 'El medico no puede cambiar etapas de laboratorio';
  end if;

  update public.tests set
    stage = p_stage,
    result = coalesce(p_result, result),
    result_flag = coalesce(p_result_flag, result_flag),
    note = coalesce(p_note, note),
    stage_started_at = now(),
    updated_at = now(),
    tech_id = case when p_stage = 'Resultado ingresado' then auth.uid() else tech_id end,
    validator_id = case when p_stage = 'Validado' then auth.uid() else validator_id end,
    validated_at = case when p_stage = 'Validado' then now() else validated_at end
  where id = p_test_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Examen no encontrado o sin permiso'; end if;
  return v_row;
end;
$$;
grant execute on function public.advance_test_stage(uuid, text, text, text, text) to authenticated;

create or replace function public.create_exam_order(
  p_patient_id uuid, p_order_type text, p_priority text,
  p_facility_id uuid default null, p_diagnosis text default null, p_exams jsonb default '[]'::jsonb
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_role text := private.current_app_role();
  v_req_id uuid; v_code text; v_exam jsonb; v_sample_id uuid; v_tube text;
  v_samples json; v_tests json; v_sample_code text; v_test_code text; v_i int := 0;
begin
  if v_role is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo', 'toma', 'medico') then
    raise exception 'Rol no autorizado para crear ordenes';
  end if;

  v_code := 'REQ-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random()*9000)+1000)::text, 4, '0');

  insert into public.exam_requests (
    code, patient_id, doctor_id, order_type, priority, facility_id, diagnosis, status, created_by
  ) values (
    v_code, p_patient_id,
    case when v_role = 'medico' then auth.uid() else null end,
    p_order_type, p_priority, p_facility_id, p_diagnosis, 'registrada', auth.uid()
  ) returning id into v_req_id;

  for v_tube in select distinct e->>'tube_type' from jsonb_array_elements(p_exams) e
  loop
    v_i := v_i + 1;
    v_sample_code := 'M-' || to_char(now(), 'YYMMDD') || '-' || lpad(v_i::text, 3, '0') || '-' || substr(md5(random()::text), 1, 4);
    insert into public.samples (code, request_id, patient_id, tube_type, status)
    values (v_sample_code, v_req_id, p_patient_id, v_tube, 'generada')
    returning id into v_sample_id;

    for v_exam in select e from jsonb_array_elements(p_exams) e where e->>'tube_type' = v_tube
    loop
      v_test_code := 'T-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 6);
      insert into public.tests (
        code, request_id, patient_id, sample_id, exam_code, exam_name, category, stage, priority, result_range, result_unit
      ) values (
        v_test_code, v_req_id, p_patient_id, v_sample_id,
        v_exam->>'exam_code', v_exam->>'exam_name', v_exam->>'category',
        'Solicitado', p_priority, v_exam->>'range_text', v_exam->>'unit'
      );
    end loop;
  end loop;

  select coalesce(json_agg(row_to_json(s)), '[]'::json) into v_samples from public.samples s where s.request_id = v_req_id;
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into v_tests from public.tests t where t.request_id = v_req_id;

  return json_build_object(
    'request', (select row_to_json(r) from public.exam_requests r where r.id = v_req_id),
    'samples', v_samples,
    'tests', v_tests
  );
end;
$$;
grant execute on function public.create_exam_order(uuid, text, text, uuid, text, jsonb) to authenticated;

drop policy if exists tests_update on public.tests;
create policy tests_update on public.tests
  for update to authenticated
  using (
    (select private.is_jefa_or_tecnologo())
    or (
      (select private.current_app_role()) = 'toma'
      and stage in ('Solicitado', 'Muestra recolectada', 'Recibida en laboratorio')
    )
  )
  with check (
    (select private.is_jefa_or_tecnologo())
    or (
      (select private.current_app_role()) = 'toma'
      and stage in ('Solicitado', 'Muestra recolectada', 'Recibida en laboratorio')
    )
  );
