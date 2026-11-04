-- LabFlow 05: seguridad multi-tenant
-- Orden: schema.sql -> 03_rpc_roles_rls.sql -> 04_multitenant.sql -> ESTE archivo.
-- Objetivos: (1) aislar los datos clinicos por laboratorio, (2) el superadmin NO ve datos clinicos,
-- (3) cerrar escaladas de rol, (4) laboratorio inactivo = sin acceso, (5) quitar laboratorios demo.

-- ===== 0) Laboratorios demo de 04 (no son reales) =====
delete from public.laboratories where code in ('LAB-HC-01', 'LAB-NORTE')
  and not exists (select 1 from public.profiles p where p.laboratory_id = laboratories.id);

-- ===== 1) Rol efectivo: un laboratorio inactivo bloquea a su personal =====
create or replace function private.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select p.role
  from public.profiles p
  left join public.laboratories l on l.id = p.laboratory_id
  where p.id = (select auth.uid())
    and p.active = true
    and (p.role = 'superadmin' or p.laboratory_id is null or l.active = true);
$$;

-- ===== 2) laboratory_id en tablas clinicas =====
alter table public.patients      add column if not exists laboratory_id uuid references public.laboratories(id);
alter table public.exam_requests add column if not exists laboratory_id uuid references public.laboratories(id);
alter table public.samples       add column if not exists laboratory_id uuid references public.laboratories(id);
alter table public.tests         add column if not exists laboratory_id uuid references public.laboratories(id);

-- Datos existentes (si los hay) pasan al laboratorio base LAB-493
do $$
declare v_lab uuid;
begin
  select id into v_lab from public.laboratories where code = 'LAB-493';
  if v_lab is not null then
    update public.patients      set laboratory_id = v_lab where laboratory_id is null;
    update public.exam_requests set laboratory_id = v_lab where laboratory_id is null;
    update public.samples       set laboratory_id = v_lab where laboratory_id is null;
    update public.tests         set laboratory_id = v_lab where laboratory_id is null;
  end if;
end $$;

alter table public.patients      alter column laboratory_id set default private.my_laboratory_id();
alter table public.exam_requests alter column laboratory_id set default private.my_laboratory_id();
alter table public.samples       alter column laboratory_id set default private.my_laboratory_id();
alter table public.tests         alter column laboratory_id set default private.my_laboratory_id();

create index if not exists patients_lab_idx on public.patients (laboratory_id);
create index if not exists exam_requests_lab_idx on public.exam_requests (laboratory_id);
create index if not exists samples_lab_idx on public.samples (laboratory_id);
create index if not exists tests_lab_idx on public.tests (laboratory_id, stage);

-- La cedula es unica por laboratorio, no global
drop index if exists public.patients_cedula_uidx;
create unique index if not exists patients_lab_cedula_uidx on public.patients (laboratory_id, cedula);

-- ===== 3) Politicas RLS por laboratorio =====
-- patients
drop policy if exists patients_select on public.patients;
drop policy if exists patients_insert on public.patients;
drop policy if exists patients_update on public.patients;
create policy patients_select on public.patients for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id())
  and ((select private.is_lab_staff()) or created_by = (select auth.uid())
       or exists (select 1 from public.exam_requests er where er.patient_id = patients.id and er.doctor_id = (select auth.uid())))
);
create policy patients_insert on public.patients for insert to authenticated with check (
  laboratory_id = (select private.my_laboratory_id())
  and (select private.current_app_role()) in ('jefa','tecnologo','toma','medico')
  and created_by = (select auth.uid())
);
create policy patients_update on public.patients for update to authenticated
  using (laboratory_id = (select private.my_laboratory_id()) and ((select private.is_lab_staff()) or created_by = (select auth.uid())))
  with check (laboratory_id = (select private.my_laboratory_id()));

-- exam_requests
drop policy if exists requests_select on public.exam_requests;
drop policy if exists requests_insert on public.exam_requests;
drop policy if exists requests_update on public.exam_requests;
create policy requests_select on public.exam_requests for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id())
  and ((select private.is_lab_staff()) or doctor_id = (select auth.uid()) or created_by = (select auth.uid()))
);
create policy requests_insert on public.exam_requests for insert to authenticated with check (
  laboratory_id = (select private.my_laboratory_id())
  and (select private.current_app_role()) in ('jefa','tecnologo','toma','medico')
  and created_by = (select auth.uid())
  and ((select private.current_app_role()) <> 'medico' or doctor_id = (select auth.uid()))
);
create policy requests_update on public.exam_requests for update to authenticated
  using (laboratory_id = (select private.my_laboratory_id()) and ((select private.is_lab_staff()) or doctor_id = (select auth.uid())))
  with check (laboratory_id = (select private.my_laboratory_id()));

-- samples
drop policy if exists samples_select on public.samples;
drop policy if exists samples_insert on public.samples;
drop policy if exists samples_update on public.samples;
create policy samples_select on public.samples for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id())
  and ((select private.is_lab_staff()) or exists (
    select 1 from public.exam_requests er where er.id = samples.request_id and er.doctor_id = (select auth.uid())))
);
create policy samples_insert on public.samples for insert to authenticated with check (
  laboratory_id = (select private.my_laboratory_id())
  and ((select private.is_lab_staff()) or (select private.current_app_role()) = 'medico')
);
create policy samples_update on public.samples for update to authenticated
  using (laboratory_id = (select private.my_laboratory_id()) and (select private.is_lab_staff()))
  with check (laboratory_id = (select private.my_laboratory_id()));

-- tests
drop policy if exists tests_select on public.tests;
drop policy if exists tests_insert on public.tests;
drop policy if exists tests_update on public.tests;
create policy tests_select on public.tests for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id())
  and ((select private.is_lab_staff()) or exists (
    select 1 from public.exam_requests er where er.id = tests.request_id and er.doctor_id = (select auth.uid())))
);
create policy tests_insert on public.tests for insert to authenticated with check (
  laboratory_id = (select private.my_laboratory_id())
  and ((select private.is_lab_staff()) or (select private.current_app_role()) = 'medico')
);
create policy tests_update on public.tests for update to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and ((select private.is_jefa_or_tecnologo())
         or ((select private.current_app_role()) = 'toma' and stage in ('Solicitado','Muestra recolectada','Recibida en laboratorio')))
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and ((select private.is_jefa_or_tecnologo())
         or ((select private.current_app_role()) = 'toma' and stage in ('Solicitado','Muestra recolectada','Recibida en laboratorio')))
  );

-- facilities: solo las del propio laboratorio (el superadmin ve todas)
drop policy if exists facilities_select on public.facilities;
drop policy if exists facilities_write_jefa on public.facilities;
create policy facilities_select on public.facilities for select to authenticated using (
  (select private.is_superadmin()) or laboratory_id is null or laboratory_id = (select private.my_laboratory_id())
);
create policy facilities_write on public.facilities for all to authenticated
  using ((select private.is_superadmin()) or ((select private.is_jefa()) and laboratory_id = (select private.my_laboratory_id())))
  with check ((select private.is_superadmin()) or ((select private.is_jefa()) and laboratory_id = (select private.my_laboratory_id())));

-- ===== 4) Perfiles: sin escaladas de rol ni cruce entre laboratorios =====
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_jefa on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or (select private.is_superadmin())
  or ((select private.is_lab_staff()) and laboratory_id = (select private.my_laboratory_id()))
);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_jefa on public.profiles for update to authenticated
  using ((select private.is_jefa()) and laboratory_id = (select private.my_laboratory_id()) and role <> 'superadmin')
  with check (laboratory_id = (select private.my_laboratory_id()) and role in ('jefa','tecnologo','toma','medico'));
create policy profiles_update_super on public.profiles for update to authenticated
  using ((select private.is_superadmin())) with check ((select private.is_superadmin()));

-- Nadie cambia rol, estado, sede, correo ni laboratorio salvo jefa/superadmin (o SQL Editor / service role)
create or replace function private.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is not null and not (private.is_superadmin() or private.is_jefa()) then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.facility_id is distinct from old.facility_id
       or new.laboratory_id is distinct from old.laboratory_id
       or new.email is distinct from old.email then
      raise exception 'No autorizado para cambiar rol, estado, sede o laboratorio';
    end if;
  end if;
  -- una jefa no puede mover a nadie a otro laboratorio
  if (select auth.uid()) is not null and private.is_jefa() and not private.is_superadmin()
     and new.laboratory_id is distinct from old.laboratory_id then
    raise exception 'La jefa no puede cambiar el laboratorio de un usuario';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- ===== 5) RPCs: security invoker para que apliquen las politicas RLS =====
alter function public.dashboard_stats() security invoker;
alter function public.advance_test_stage(uuid, text, text, text, text) security invoker;
alter function public.create_exam_order(uuid, text, text, uuid, text, jsonb) security invoker;

-- ===== 6) Asignar personal / admin de laboratorio sin cruzar tenants =====
create or replace function public.assign_staff_to_lab(p_email text, p_role text, p_laboratory_id uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_lab uuid; v_my text := private.current_app_role(); v_n int;
begin
  if v_my = 'superadmin' then
    if p_laboratory_id is null then raise exception 'Indique el laboratorio'; end if;
    v_lab := p_laboratory_id;
  elsif v_my = 'jefa' then
    v_lab := private.my_laboratory_id();
  else
    raise exception 'No autorizado';
  end if;
  if p_role not in ('tecnologo','toma','medico','jefa') then raise exception 'Rol invalido'; end if;
  update public.profiles
     set role = p_role, laboratory_id = v_lab, active = true
   where email = p_email
     and role <> 'superadmin'
     and (laboratory_id is null or laboratory_id = v_lab or v_my = 'superadmin');
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Usuario no encontrado o pertenece a otro laboratorio: %', p_email; end if;
  return json_build_object('ok', true, 'email', p_email, 'role', p_role);
end;
$$;

create or replace function public.create_lab_admin(p_laboratory_id uuid, p_email text, p_full_name text)
returns json language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not private.is_superadmin() then raise exception 'Solo superadmin'; end if;
  update public.profiles set role = 'jefa', laboratory_id = p_laboratory_id, full_name = p_full_name, active = true
   where email = p_email and role <> 'superadmin';
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Cree el usuario en Auth primero: %', p_email; end if;
  return json_build_object('ok', true, 'email', p_email, 'role', 'jefa');
end;
$$;

-- ===== 7) Trafico: contar solo del laboratorio correspondiente =====
create or replace function public.traffic_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_online_sec int := 120;
begin
  if v_role is null then raise exception 'No autenticado'; end if;
  if v_role = 'superadmin' then
    return (select json_build_object(
      'scope', 'global',
      'onlineUsers', (select count(*) from public.user_presence where last_seen > now() - make_interval(secs => v_online_sec)),
      'laboratories', (select coalesce(json_agg(x), '[]'::json) from (
        select l.id, l.name, l.code, l.city, l.active,
          (select count(*) from public.user_presence up where up.laboratory_id = l.id and up.last_seen > now() - make_interval(secs => v_online_sec)) as online,
          (select count(*) from public.profiles p where p.laboratory_id = l.id and p.active) as staff,
          (select count(*) from public.tests t where t.laboratory_id = l.id and t.stage not in ('Validado','Entregado')) as pending_tests,
          (select count(*) from public.tests t where t.laboratory_id = l.id and t.created_at >= date_trunc('day', now())) as tests_today
        from public.laboratories l order by l.name
      ) x),
      'byPath', (select coalesce(json_agg(y), '[]'::json) from (
        select path, count(*) as users from public.user_presence
        where last_seen > now() - make_interval(secs => v_online_sec)
        group by path order by users desc limit 20
      ) y)
    ));
  end if;
  return (select json_build_object(
    'scope', 'laboratory',
    'laboratoryId', v_lab,
    'onlineUsers', (select count(*) from public.user_presence where laboratory_id = v_lab and last_seen > now() - make_interval(secs => v_online_sec)),
    'staff', (select coalesce(json_agg(s), '[]'::json) from (
      select p.id, p.full_name, p.email, p.role, p.active,
        (select path from public.user_presence up where up.user_id = p.id and up.last_seen > now() - make_interval(secs => v_online_sec) limit 1) as current_path,
        (select last_seen from public.user_presence up where up.user_id = p.id) as last_seen
      from public.profiles p where p.laboratory_id = v_lab order by p.role, p.full_name
    ) s),
    'pending_tests', (select count(*) from public.tests where laboratory_id = v_lab and stage not in ('Validado','Entregado')),
    'tests_today', (select count(*) from public.tests where laboratory_id = v_lab and created_at >= date_trunc('day', now()))
  ));
end;
$$;

-- ===== 8) Permisos de ejecucion: solo usuarios autenticados =====
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.dashboard_stats() from public, anon;
revoke execute on function public.advance_test_stage(uuid, text, text, text, text) from public, anon;
revoke execute on function public.create_exam_order(uuid, text, text, uuid, text, jsonb) from public, anon;
revoke execute on function public.presence_heartbeat(text) from public, anon;
revoke execute on function public.traffic_overview() from public, anon;
revoke execute on function public.assign_staff_to_lab(text, text, uuid) from public, anon;
revoke execute on function public.create_lab_admin(uuid, text, text) from public, anon;
