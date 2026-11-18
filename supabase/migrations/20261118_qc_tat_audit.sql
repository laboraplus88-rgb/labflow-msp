-- ============================================================
-- LabFlow — QC básico + auditoría de validación + helpers TAT
-- Fecha: 2026-11-18
-- Revisar antes de aplicar en labflow-msp.
-- ============================================================

-- ----- QC: definiciones de control por laboratorio / examen -----
create table if not exists public.qc_control_definitions (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  exam_code text not null,
  name text not null default 'Control',
  level text not null default 'N'
    check (level in ('1', '2', '3', 'N')),
  target numeric,
  sd numeric check (sd is null or sd > 0),
  min_value numeric,
  max_value numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (laboratory_id, exam_code, level, name)
);

create index if not exists qc_defs_lab_exam_idx
  on public.qc_control_definitions (laboratory_id, exam_code)
  where active = true;

-- ----- QC: corridas -----
create table if not exists public.qc_runs (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  definition_id uuid references public.qc_control_definitions(id) on delete set null,
  exam_code text not null,
  measured_value numeric not null,
  status text not null check (status in ('in_control', 'out_of_control')),
  rule_hit text,
  run_at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  user_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists qc_runs_lab_exam_idx
  on public.qc_runs (laboratory_id, exam_code, run_at desc);

alter table public.qc_control_definitions enable row level security;
alter table public.qc_runs enable row level security;

drop policy if exists qc_defs_select on public.qc_control_definitions;
create policy qc_defs_select on public.qc_control_definitions for select to authenticated
  using (laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma'));

drop policy if exists qc_defs_write on public.qc_control_definitions;
create policy qc_defs_write on public.qc_control_definitions for all to authenticated
  using (laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo'))
  with check (laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo'));

drop policy if exists qc_runs_select on public.qc_runs;
create policy qc_runs_select on public.qc_runs for select to authenticated
  using (laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma'));

drop policy if exists qc_runs_insert on public.qc_runs;
create policy qc_runs_insert on public.qc_runs for insert to authenticated
  with check (laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo'));

-- Evalúa valor vs definición (1-2s / límites min-max)
create or replace function public.qc_evaluate_value(
  p_value numeric,
  p_target numeric,
  p_sd numeric,
  p_min numeric,
  p_max numeric
)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_min is not null and p_value < p_min then
    return 'out_of_control';
  end if;
  if p_max is not null and p_value > p_max then
    return 'out_of_control';
  end if;
  if p_target is not null and p_sd is not null and p_sd > 0 then
    if abs(p_value - p_target) > (2 * p_sd) then
      return 'out_of_control';
    end if;
  end if;
  return 'in_control';
end;
$$;

-- Registrar corrida de control
create or replace function public.qc_register_run(
  p_definition_id uuid,
  p_measured_value numeric,
  p_notes text default null
)
returns public.qc_runs
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_def public.qc_control_definitions%rowtype;
  v_status text;
  v_rule text;
  v_name text;
  v_row public.qc_runs%rowtype;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso para registrar controles QC';
  end if;
  if v_lab is null then raise exception 'Usuario sin laboratorio'; end if;

  select * into v_def from public.qc_control_definitions
   where id = p_definition_id and laboratory_id = v_lab and active = true;
  if not found then raise exception 'Definición de control no encontrada'; end if;

  v_status := public.qc_evaluate_value(
    p_measured_value, v_def.target, v_def.sd, v_def.min_value, v_def.max_value
  );
  if v_status = 'out_of_control' then
    v_rule := 'limite_o_2sd';
  else
    v_rule := null;
  end if;

  select full_name into v_name from public.profiles where id = v_uid;

  insert into public.qc_runs (
    laboratory_id, definition_id, exam_code, measured_value,
    status, rule_hit, user_id, user_name, notes
  ) values (
    v_lab, v_def.id, v_def.exam_code, p_measured_value,
    v_status, v_rule, v_uid, coalesce(v_name, 'Usuario'), p_notes
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.qc_register_run(uuid, numeric, text) from public, anon;
grant execute on function public.qc_register_run(uuid, numeric, text) to authenticated;

-- Estado QC del analito (últimas 24 h por defecto)
create or replace function public.qc_status_for_exam(
  p_exam_code text,
  p_max_age_hours int default 24
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_lab uuid := private.my_laboratory_id();
  v_run public.qc_runs%rowtype;
  v_defs int;
begin
  if v_lab is null then
    return jsonb_build_object('configured', false, 'ok', true, 'message', 'Sin laboratorio');
  end if;

  select count(*) into v_defs from public.qc_control_definitions
   where laboratory_id = v_lab and exam_code = p_exam_code and active = true;

  if v_defs = 0 then
    return jsonb_build_object(
      'configured', false,
      'ok', true,
      'message', 'Sin controles configurados para este examen'
    );
  end if;

  select * into v_run from public.qc_runs
   where laboratory_id = v_lab and exam_code = p_exam_code
   order by run_at desc
   limit 1;

  if not found then
    return jsonb_build_object(
      'configured', true,
      'ok', false,
      'soft_block', true,
      'message', 'No hay corridas de control registradas para este examen'
    );
  end if;

  if v_run.run_at < now() - make_interval(hours => greatest(p_max_age_hours, 1)) then
    return jsonb_build_object(
      'configured', true,
      'ok', false,
      'soft_block', true,
      'last_status', v_run.status,
      'last_run_at', v_run.run_at,
      'message', format('Último control tiene más de %s h', p_max_age_hours)
    );
  end if;

  if v_run.status = 'out_of_control' then
    return jsonb_build_object(
      'configured', true,
      'ok', false,
      'soft_block', true,
      'last_status', v_run.status,
      'last_run_at', v_run.run_at,
      'rule_hit', v_run.rule_hit,
      'message', 'Control fuera de rango (regla 2SD o límites)'
    );
  end if;

  return jsonb_build_object(
    'configured', true,
    'ok', true,
    'soft_block', false,
    'last_status', v_run.status,
    'last_run_at', v_run.run_at,
    'message', 'Control en rango'
  );
end;
$$;

grant execute on function public.qc_status_for_exam(text, int) to authenticated;

-- ----- Bitácora: ampliar lectura a jefa + tecnólogo del lab -----
-- (si la tabla tiene laboratory_id en tests, filtramos por join)
drop policy if exists "jefa can read stage logs" on public.test_stage_logs;
drop policy if exists test_stage_logs_select on public.test_stage_logs;
create policy test_stage_logs_select on public.test_stage_logs
  for select to authenticated
  using (
    (select private.current_app_role()) in ('jefa', 'tecnologo')
    and exists (
      select 1 from public.tests t
      where t.id = test_stage_logs.test_id
        and (
          t.laboratory_id is null
          or t.laboratory_id = (select private.my_laboratory_id())
        )
    )
  );

-- ----- TAT: resumen de plazos vencidos / en riesgo -----
create or replace function public.tat_alerts_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_lab uuid := private.my_laboratory_id();
  v_urgente int := 0;
  v_rutina int := 0;
  v_control int := 0;
  v_overdue int := 0;
  v_warn int := 0;
begin
  if private.current_app_role() is null then
    raise exception 'No autenticado';
  end if;

  select
    count(*) filter (where t.priority = 'Urgente'),
    count(*) filter (where t.priority = 'Rutina'),
    count(*) filter (where t.priority = 'Control'),
    count(*) filter (where
      extract(epoch from (now() - coalesce(t.stage_started_at, t.created_at))) / 60
      > case t.priority
          when 'Urgente' then 60
          when 'Control' then 2880
          else 1440
        end
    ),
    count(*) filter (where
      extract(epoch from (now() - coalesce(t.stage_started_at, t.created_at))) / 60
      > 0.8 * case t.priority
          when 'Urgente' then 60
          when 'Control' then 2880
          else 1440
        end
      and extract(epoch from (now() - coalesce(t.stage_started_at, t.created_at))) / 60
      <= case t.priority
          when 'Urgente' then 60
          when 'Control' then 2880
          else 1440
        end
    )
  into v_urgente, v_rutina, v_control, v_overdue, v_warn
  from public.tests t
  where t.stage not in ('Validado', 'Entregado')
    and (v_lab is null or t.laboratory_id is null or t.laboratory_id = v_lab);

  return jsonb_build_object(
    'open_urgente', coalesce(v_urgente, 0),
    'open_rutina', coalesce(v_rutina, 0),
    'open_control', coalesce(v_control, 0),
    'overdue', coalesce(v_overdue, 0),
    'at_risk', coalesce(v_warn, 0),
    'limits_minutes', jsonb_build_object(
      'Urgente', 60,
      'Rutina', 1440,
      'Control', 2880
    )
  );
end;
$$;

revoke all on function public.tat_alerts_summary() from public, anon;
grant execute on function public.tat_alerts_summary() to authenticated;

notify pgrst, 'reload schema';
