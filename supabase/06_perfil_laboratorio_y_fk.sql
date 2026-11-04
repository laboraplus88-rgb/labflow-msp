-- LabFlow 06 (ya aplicada en Supabase). Orden: schema -> 03 -> 04 -> 05 -> ESTE archivo.
-- 1) FK a profiles para que PostgREST resuelva profiles:doctor_id(...) (arregla "Could not find a relationship")
alter table public.exam_requests drop constraint if exists exam_requests_doctor_profile_fkey;
alter table public.exam_requests add constraint exam_requests_doctor_profile_fkey
  foreign key (doctor_id) references public.profiles(id) on delete set null;
alter table public.exam_requests drop constraint if exists exam_requests_created_by_profile_fkey;
alter table public.exam_requests add constraint exam_requests_created_by_profile_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- 2) Datos del establecimiento 010A (vacios; los completa el admin del laboratorio)
alter table public.laboratories add column if not exists institution_name text;
alter table public.laboratories add column if not exists unit_name text;
alter table public.laboratories add column if not exists uo_code text;
alter table public.laboratories add column if not exists location_code text;

-- 3) Medico solicitante (texto libre)
alter table public.exam_requests add column if not exists requesting_doctor text;

-- 4) Establecimientos de origen: sin datos de ejemplo; codigo unico por laboratorio
update public.exam_requests set facility_id = null where facility_id is not null;
update public.profiles set facility_id = null where facility_id is not null;
delete from public.facilities;
alter table public.facilities drop constraint if exists facilities_code_key;
create unique index if not exists facilities_lab_code_uidx on public.facilities (laboratory_id, code);
alter table public.facilities alter column laboratory_id set default private.my_laboratory_id();

-- 5) La jefa edita solo los datos del establecimiento de su laboratorio
drop policy if exists labs_update_jefa on public.laboratories;
create policy labs_update_jefa on public.laboratories for update to authenticated
  using ((select private.is_jefa()) and id = (select private.my_laboratory_id()))
  with check (id = (select private.my_laboratory_id()));

create or replace function private.protect_lab_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is not null and not private.is_superadmin() then
    if new.name is distinct from old.name
       or new.code is distinct from old.code
       or new.active is distinct from old.active
       or new.max_users is distinct from old.max_users then
      raise exception 'Solo el Admin Global puede cambiar nombre, codigo, estado o limite de usuarios';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_lab_fields on public.laboratories;
create trigger protect_lab_fields before update on public.laboratories
  for each row execute function private.protect_lab_fields();

notify pgrst, 'reload schema';
