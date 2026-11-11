-- ============================================================
-- LabFlow — Módulo Agenda y Citas (fase 1: schema + RLS)
-- Fecha: 2026-11-09
-- Requiere: laboratories, profiles, patients, facilities
--           private.my_laboratory_id(), private.current_app_role()
-- Idempotente donde es posible.
-- ============================================================

-- ----- Recursos de agenda (boxes / áreas de toma) -----
create table if not exists public.appointment_resources (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  facility_id uuid references public.facilities(id),
  name text not null,
  code text,
  resource_type text not null default 'toma'
    check (resource_type in ('toma', 'consulta', 'especial', 'otro')),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, name)
);

create index if not exists appointment_resources_lab_idx
  on public.appointment_resources (laboratory_id);

-- ----- Citas -----
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  resource_id uuid references public.appointment_resources(id),
  patient_id uuid references public.patients(id),
  -- datos mínimos si el paciente aún no está en el sistema
  patient_name text,
  patient_cedula text,
  patient_phone text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 15 check (duration_minutes > 0 and duration_minutes <= 240),
  status text not null default 'scheduled'
    check (status in (
      'scheduled', 'confirmed', 'checked_in', 'in_progress',
      'completed', 'cancelled', 'no_show'
    )),
  -- particular | prioritario | programa_publico
  priority text not null default 'normal'
    check (priority in ('normal', 'prioritario', 'programa_publico', 'urgente')),
  program_name text,
  notes text,
  preparation_notes text,
  exam_request_id uuid references public.exam_requests(id),
  created_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_patient_ref check (
    patient_id is not null or (patient_name is not null and length(trim(patient_name)) > 0)
  )
);

create index if not exists appointments_lab_idx on public.appointments (laboratory_id);
create index if not exists appointments_sched_idx on public.appointments (laboratory_id, scheduled_at);
create index if not exists appointments_status_idx on public.appointments (laboratory_id, status);
create index if not exists appointments_patient_idx on public.appointments (patient_id);
create index if not exists appointments_resource_idx on public.appointments (resource_id);

-- ----- Lista de espera -----
create table if not exists public.appointment_waitlist (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  patient_id uuid references public.patients(id),
  patient_name text,
  patient_cedula text,
  patient_phone text,
  preferred_date date,
  preferred_period text check (preferred_period is null or preferred_period in ('manana', 'tarde', 'cualquiera')),
  priority text not null default 'normal'
    check (priority in ('normal', 'prioritario', 'programa_publico', 'urgente')),
  program_name text,
  notes text,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'scheduled', 'cancelled', 'expired')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_waitlist_lab_idx
  on public.appointment_waitlist (laboratory_id, status);

-- ============================================================
-- RLS
-- Lectura: jefa | tecnologo | toma | medico (su lab)
-- Escritura: jefa | tecnologo | toma
-- superadmin: sin agenda operativa (mismo criterio clínico)
-- ============================================================

alter table public.appointment_resources enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_waitlist enable row level security;

alter table public.appointment_resources force row level security;
alter table public.appointments force row level security;
alter table public.appointment_waitlist force row level security;

-- resources
drop policy if exists appt_resources_select on public.appointment_resources;
drop policy if exists appt_resources_write on public.appointment_resources;

create policy appt_resources_select on public.appointment_resources
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma', 'medico')
  );

create policy appt_resources_write on public.appointment_resources
  for all to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

-- appointments
drop policy if exists appointments_select on public.appointments;
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;

create policy appointments_select on public.appointments
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma', 'medico')
  );

create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
    and created_by = (select auth.uid())
  );

create policy appointments_update on public.appointments
  for update to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
  );

-- waitlist
drop policy if exists appt_waitlist_select on public.appointment_waitlist;
drop policy if exists appt_waitlist_write on public.appointment_waitlist;

create policy appt_waitlist_select on public.appointment_waitlist
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy appt_waitlist_write on public.appointment_waitlist
  for all to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

-- ============================================================
-- RPC: crear cita
-- ============================================================
create or replace function public.appointment_create(
  p_scheduled_at timestamptz,
  p_duration_minutes int default 15,
  p_resource_id uuid default null,
  p_patient_id uuid default null,
  p_patient_name text default null,
  p_patient_cedula text default null,
  p_patient_phone text default null,
  p_priority text default 'normal',
  p_program_name text default null,
  p_notes text default null,
  p_preparation_notes text default null,
  p_exam_request_id uuid default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_row public.appointments%rowtype;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo', 'toma') then
    raise exception 'Sin permiso para agendar';
  end if;
  if v_lab is null then raise exception 'Usuario sin laboratorio'; end if;
  if p_scheduled_at is null then raise exception 'Fecha/hora requerida'; end if;
  if p_patient_id is null and (p_patient_name is null or length(trim(p_patient_name)) = 0) then
    raise exception 'Indique paciente o nombre';
  end if;
  if p_priority not in ('normal', 'prioritario', 'programa_publico', 'urgente') then
    raise exception 'Prioridad inválida';
  end if;

  if p_resource_id is not null then
    if not exists (
      select 1 from public.appointment_resources
      where id = p_resource_id and laboratory_id = v_lab and active = true
    ) then
      raise exception 'Recurso no válido para este laboratorio';
    end if;
  end if;

  if p_patient_id is not null then
    if not exists (
      select 1 from public.patients
      where id = p_patient_id and laboratory_id = v_lab
    ) then
      raise exception 'Paciente no pertenece a este laboratorio';
    end if;
  end if;

  insert into public.appointments (
    laboratory_id, resource_id, patient_id,
    patient_name, patient_cedula, patient_phone,
    scheduled_at, duration_minutes, status, priority, program_name,
    notes, preparation_notes, exam_request_id, created_by
  ) values (
    v_lab, p_resource_id, p_patient_id,
    nullif(trim(p_patient_name), ''), nullif(trim(p_patient_cedula), ''), nullif(trim(p_patient_phone), ''),
    p_scheduled_at, coalesce(p_duration_minutes, 15), 'scheduled', p_priority, p_program_name,
    p_notes, p_preparation_notes, p_exam_request_id, v_uid
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.appointment_create(
  timestamptz, int, uuid, uuid, text, text, text, text, text, text, text, uuid
) to authenticated;
revoke execute on function public.appointment_create(
  timestamptz, int, uuid, uuid, text, text, text, text, text, text, text, uuid
) from public, anon;

-- ============================================================
-- RPC: cancelar cita
-- ============================================================
create or replace function public.appointment_cancel(
  p_appointment_id uuid,
  p_reason text default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_row public.appointments%rowtype;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo', 'toma') then
    raise exception 'Sin permiso para cancelar';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_uid,
      cancel_reason = p_reason,
      updated_at = now()
  where id = p_appointment_id
    and laboratory_id = v_lab
    and status in ('scheduled', 'confirmed')
  returning * into v_row;

  if not found then
    raise exception 'Cita no encontrada o no se puede cancelar';
  end if;

  return v_row;
end;
$$;

grant execute on function public.appointment_cancel(uuid, text) to authenticated;
revoke execute on function public.appointment_cancel(uuid, text) from public, anon;

-- ============================================================
-- RPC: reprogramar cita
-- ============================================================
create or replace function public.appointment_reschedule(
  p_appointment_id uuid,
  p_scheduled_at timestamptz,
  p_resource_id uuid default null,
  p_duration_minutes int default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_row public.appointments%rowtype;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo', 'toma') then
    raise exception 'Sin permiso para reprogramar';
  end if;
  if p_scheduled_at is null then raise exception 'Nueva fecha/hora requerida'; end if;

  if p_resource_id is not null then
    if not exists (
      select 1 from public.appointment_resources
      where id = p_resource_id and laboratory_id = v_lab and active = true
    ) then
      raise exception 'Recurso no válido';
    end if;
  end if;

  update public.appointments
  set scheduled_at = p_scheduled_at,
      resource_id = coalesce(p_resource_id, resource_id),
      duration_minutes = coalesce(p_duration_minutes, duration_minutes),
      status = case when status = 'confirmed' then 'confirmed' else 'scheduled' end,
      updated_at = now()
  where id = p_appointment_id
    and laboratory_id = v_lab
    and status in ('scheduled', 'confirmed', 'no_show')
  returning * into v_row;

  if not found then
    raise exception 'Cita no encontrada o no se puede reprogramar';
  end if;

  return v_row;
end;
$$;

grant execute on function public.appointment_reschedule(uuid, timestamptz, uuid, int) to authenticated;
revoke execute on function public.appointment_reschedule(uuid, timestamptz, uuid, int) from public, anon;
