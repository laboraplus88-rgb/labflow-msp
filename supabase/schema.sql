-- LabFlow MSP Ecuador — Schema + RLS + Seeds
-- Pegar completo en Supabase → SQL Editor → Run

create extension if not exists "pgcrypto";

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('centro', 'subcentro')),
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role text not null check (role in ('jefa', 'tecnologo', 'toma', 'medico')),
  facility_id uuid references public.facilities(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  historia text,
  cedula text not null,
  apellido_paterno text not null,
  apellido_materno text default '',
  primer_nombre text not null,
  segundo_nombre text default '',
  edad int,
  sexo text check (sexo in ('F', 'M')),
  provincia text,
  canton text,
  parroquia text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists patients_cedula_uidx on public.patients (cedula);

create table if not exists public.exam_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  patient_id uuid not null references public.patients(id),
  doctor_id uuid references auth.users(id),
  order_type text not null,
  priority text not null,
  facility_id uuid references public.facilities(id),
  diagnosis text,
  status text not null default 'registrada',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  request_id uuid not null references public.exam_requests(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  tube_type text not null,
  tube_label text,
  collected_at timestamptz,
  collected_by uuid references auth.users(id),
  status text not null default 'generada',
  reject_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  request_id uuid not null references public.exam_requests(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  sample_id uuid references public.samples(id),
  exam_code text not null,
  exam_name text not null,
  category text not null,
  stage text not null default 'Solicitado',
  priority text not null,
  result text,
  result_unit text,
  result_range text,
  result_flag text,
  tech_id uuid references auth.users(id),
  validator_id uuid references auth.users(id),
  stage_started_at timestamptz not null default now(),
  validated_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_catalog (
  id text primary key,
  name text not null,
  category text not null,
  range_text text,
  unit text,
  tube_type text not null,
  active boolean not null default true
);

create schema if not exists private;

create or replace function private.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = (select auth.uid()) and active = true;
$$;

create or replace function private.is_lab_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() in ('jefa','tecnologo','toma'), false);
$$;

create or replace function private.is_jefa_or_tecnologo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() in ('jefa','tecnologo'), false);
$$;

create or replace function private.is_jefa()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() = 'jefa', false);
$$;

grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_lab_staff() to authenticated;
grant execute on function private.is_jefa_or_tecnologo() to authenticated;
grant execute on function private.is_jefa() to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'medico')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.facilities enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.exam_requests enable row level security;
alter table public.samples enable row level security;
alter table public.tests enable row level security;
alter table public.exam_catalog enable row level security;

create policy facilities_select on public.facilities for select to authenticated using (true);
create policy facilities_write_jefa on public.facilities for all to authenticated
  using ((select private.is_jefa())) with check ((select private.is_jefa()));

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_lab_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_jefa on public.profiles for update to authenticated
  using ((select private.is_jefa())) with check ((select private.is_jefa()));

create policy patients_select on public.patients for select to authenticated
  using (
    (select private.is_lab_staff())
    or created_by = (select auth.uid())
    or exists (select 1 from public.exam_requests er where er.patient_id = patients.id and er.doctor_id = (select auth.uid()))
  );
create policy patients_insert on public.patients for insert to authenticated
  with check ((select private.current_app_role()) in ('jefa','tecnologo','toma','medico') and created_by = (select auth.uid()));
create policy patients_update on public.patients for update to authenticated
  using ((select private.is_lab_staff()) or created_by = (select auth.uid()))
  with check ((select private.is_lab_staff()) or created_by = (select auth.uid()));

create policy requests_select on public.exam_requests for select to authenticated
  using ((select private.is_lab_staff()) or doctor_id = (select auth.uid()) or created_by = (select auth.uid()));
create policy requests_insert on public.exam_requests for insert to authenticated
  with check (
    (select private.current_app_role()) in ('jefa','tecnologo','toma','medico')
    and created_by = (select auth.uid())
    and ((select private.current_app_role()) <> 'medico' or doctor_id = (select auth.uid()))
  );
create policy requests_update on public.exam_requests for update to authenticated
  using ((select private.is_lab_staff()) or doctor_id = (select auth.uid()))
  with check ((select private.is_lab_staff()) or doctor_id = (select auth.uid()));

create policy samples_select on public.samples for select to authenticated
  using ((select private.is_lab_staff()) or exists (
    select 1 from public.exam_requests er where er.id = samples.request_id and er.doctor_id = (select auth.uid())
  ));
create policy samples_insert on public.samples for insert to authenticated
  with check ((select private.is_lab_staff()) or (select private.current_app_role()) = 'medico');
create policy samples_update on public.samples for update to authenticated
  using ((select private.is_lab_staff())) with check ((select private.is_lab_staff()));

create policy tests_select on public.tests for select to authenticated
  using ((select private.is_lab_staff()) or exists (
    select 1 from public.exam_requests er where er.id = tests.request_id and er.doctor_id = (select auth.uid())
  ));
create policy tests_insert on public.tests for insert to authenticated
  with check ((select private.is_lab_staff()) or (select private.current_app_role()) = 'medico');
create policy tests_update on public.tests for update to authenticated
  using ((select private.is_jefa_or_tecnologo()) or (select private.current_app_role()) = 'toma')
  with check ((select private.is_jefa_or_tecnologo()) or (select private.current_app_role()) = 'toma');

create policy catalog_select on public.exam_catalog for select to authenticated using (true);
create policy catalog_write_jefa on public.exam_catalog for all to authenticated
  using ((select private.is_jefa())) with check ((select private.is_jefa()));

insert into public.facilities (name, type, code) values
  ('C.S. El Paraiso', 'centro', '493'),
  ('Subcentro de Salud San Roque', 'subcentro', '493-01'),
  ('Subcentro Chimbacalle', 'subcentro', '493-02'),
  ('Subcentro La Ecuatorial', 'subcentro', '493-03')
on conflict (code) do nothing;

insert into public.exam_catalog (id, name, category, range_text, unit, tube_type) values
  ('h-01', 'Biometria hematica', 'Hematologia', 'Ver informe', '—', 'purple'),
  ('h-02', 'Hemoglobina', 'Hematologia', '12.0–16.0', 'g/dL', 'purple'),
  ('q-01', 'Glucosa en ayunas', 'Quimica sanguinea', '70–100', 'mg/dL', 'gray'),
  ('q-03', 'Urea', 'Quimica sanguinea', '15–45', 'mg/dL', 'yellow'),
  ('q-04', 'Creatinina', 'Quimica sanguinea', '0.6–1.2', 'mg/dL', 'yellow'),
  ('u-01', 'Examen general de orina', 'Uroanalisis', 'Ver informe', '—', 'urine'),
  ('s-01', 'VDRL', 'Serologia', 'No reactivo', '—', 'yellow'),
  ('o-01', 'TSH', 'Otros', '0.4–4.0', 'mUI/L', 'yellow')
on conflict (id) do update set name = excluded.name;
