-- LabFlow: gestionar personal del laboratorio (jefa / superadmin)
-- Ejecutar despues de 04_multitenant.sql

-- Asignar o actualizar personal (nombre + rol + lab + activo)
create or replace function public.assign_staff_to_lab(
  p_email text,
  p_role text,
  p_laboratory_id uuid default null,
  p_full_name text default null,
  p_active boolean default true
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_lab uuid;
  v_my text := private.current_app_role();
begin
  if v_my = 'superadmin' then
    v_lab := coalesce(p_laboratory_id, private.my_laboratory_id());
  elsif v_my = 'jefa' then
    v_lab := private.my_laboratory_id();
  else
    raise exception 'No autorizado';
  end if;

  if p_role not in ('tecnologo', 'toma', 'medico', 'jefa') then
    raise exception 'Rol invalido';
  end if;

  update public.profiles
  set
    role = p_role,
    laboratory_id = v_lab,
    active = coalesce(p_active, true),
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    updated_at = now()
  where lower(email) = lower(trim(p_email));

  if not found then
    raise exception 'Usuario no encontrado en profiles. Cree la cuenta en Authentication primero: %', p_email;
  end if;

  return json_build_object(
    'ok', true,
    'email', lower(trim(p_email)),
    'role', p_role,
    'active', coalesce(p_active, true),
    'laboratoryId', v_lab
  );
end;
$$;
grant execute on function public.assign_staff_to_lab(text, text, uuid, text, boolean) to authenticated;

-- Actualizar perfil de personal del mismo laboratorio
create or replace function public.update_staff_profile(
  p_user_id uuid,
  p_full_name text default null,
  p_role text default null,
  p_active boolean default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_my text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_target_lab uuid;
begin
  if v_my not in ('jefa', 'superadmin') then
    raise exception 'No autorizado';
  end if;

  select laboratory_id into v_target_lab from public.profiles where id = p_user_id;
  if v_target_lab is null then
    raise exception 'Usuario no encontrado';
  end if;

  if v_my = 'jefa' and v_target_lab is distinct from v_lab then
    raise exception 'Solo puede editar personal de su laboratorio';
  end if;

  if p_role is not null and p_role not in ('tecnologo', 'toma', 'medico', 'jefa') then
    raise exception 'Rol invalido';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    role = coalesce(p_role, role),
    active = coalesce(p_active, active),
    updated_at = now()
  where id = p_user_id;

  return json_build_object('ok', true, 'id', p_user_id);
end;
$$;
grant execute on function public.update_staff_profile(uuid, text, text, boolean) to authenticated;

-- Activar / desactivar personal
create or replace function public.set_staff_active(p_user_id uuid, p_active boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_my text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_target_lab uuid;
begin
  if v_my not in ('jefa', 'superadmin') then
    raise exception 'No autorizado';
  end if;

  select laboratory_id into v_target_lab from public.profiles where id = p_user_id;
  if v_my = 'jefa' and v_target_lab is distinct from v_lab then
    raise exception 'Solo puede gestionar personal de su laboratorio';
  end if;

  update public.profiles set active = p_active, updated_at = now() where id = p_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;

  return json_build_object('ok', true, 'id', p_user_id, 'active', p_active);
end;
$$;
grant execute on function public.set_staff_active(uuid, boolean) to authenticated;
