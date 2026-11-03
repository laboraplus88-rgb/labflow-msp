-- LabFlow Multi-tenant (superadmin + jefa + presence)
-- Orden: schema.sql → seed_roles.sql → 03_rpc_roles_rls.sql → ESTE archivo

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('superadmin', 'jefa', 'tecnologo', 'toma', 'medico'));

create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  city text,
  province text,
  active boolean not null default true,
  max_users int not null default 50,
  created_at timestamptz not null default now()
);

alter table public.facilities add column if not exists laboratory_id uuid references public.laboratories(id);
alter table public.profiles add column if not exists laboratory_id uuid references public.laboratories(id);

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  laboratory_id uuid references public.laboratories(id),
  role text,
  path text,
  last_seen timestamptz not null default now()
);
create index if not exists user_presence_lab_idx on public.user_presence (laboratory_id, last_seen);

create or replace function private.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.current_app_role() = 'superadmin', false);
$$;
create or replace function private.my_laboratory_id()
returns uuid language sql stable security definer set search_path = public as $$
  select laboratory_id from public.profiles where id = auth.uid();
$$;
grant execute on function private.is_superadmin() to authenticated;
grant execute on function private.my_laboratory_id() to authenticated;

alter table public.laboratories enable row level security;
drop policy if exists labs_select on public.laboratories;
drop policy if exists labs_write_super on public.laboratories;
create policy labs_select on public.laboratories for select to authenticated
  using ((select private.is_superadmin()) or id = (select private.my_laboratory_id()));
create policy labs_write_super on public.laboratories for all to authenticated
  using ((select private.is_superadmin())) with check ((select private.is_superadmin()));

alter table public.user_presence enable row level security;
drop policy if exists presence_select on public.user_presence;
drop policy if exists presence_upsert on public.user_presence;
create policy presence_select on public.user_presence for select to authenticated
  using ((select private.is_superadmin()) or laboratory_id = (select private.my_laboratory_id()) or user_id = auth.uid());
create policy presence_upsert on public.user_presence for all to authenticated
  using (user_id = auth.uid() or (select private.is_superadmin()))
  with check (user_id = auth.uid() or (select private.is_superadmin()));

insert into public.laboratories (name, code, city, province) values
  ('C.S. El Paraiso Lab Clinico', 'LAB-493', 'Quito', 'Pichincha'),
  ('Hospital Cantonal Demo', 'LAB-HC-01', 'Ambato', 'Tungurahua'),
  ('Subred Norte Lab', 'LAB-NORTE', 'Quito', 'Pichincha')
on conflict (code) do nothing;

update public.profiles p set laboratory_id = l.id
from public.laboratories l where l.code = 'LAB-493' and p.laboratory_id is null
  and p.role in ('jefa','tecnologo','toma','medico');

create or replace function public.presence_heartbeat(p_path text default '/')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.user_presence (user_id, laboratory_id, role, path, last_seen)
  values (auth.uid(), private.my_laboratory_id(), private.current_app_role(), p_path, now())
  on conflict (user_id) do update set
    laboratory_id = excluded.laboratory_id, role = excluded.role, path = excluded.path, last_seen = now();
end;
$$;
grant execute on function public.presence_heartbeat(text) to authenticated;

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
          (select count(*) from public.tests t where t.stage not in ('Validado','Entregado')) as pending_tests,
          (select count(*) from public.tests t where t.created_at >= date_trunc('day', now())) as tests_today
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
    'pending_tests', (select count(*) from public.tests where stage not in ('Validado','Entregado')),
    'tests_today', (select count(*) from public.tests where created_at >= date_trunc('day', now()))
  ));
end;
$$;
grant execute on function public.traffic_overview() to authenticated;

create or replace function public.create_lab_admin(p_laboratory_id uuid, p_email text, p_full_name text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not private.is_superadmin() then raise exception 'Solo superadmin'; end if;
  update public.profiles set role = 'jefa', laboratory_id = p_laboratory_id, full_name = p_full_name, active = true where email = p_email;
  if not found then raise exception 'Cree el usuario en Auth primero: %', p_email; end if;
  return json_build_object('ok', true, 'email', p_email, 'role', 'jefa');
end;
$$;
grant execute on function public.create_lab_admin(uuid, text, text) to authenticated;

create or replace function public.assign_staff_to_lab(p_email text, p_role text, p_laboratory_id uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_lab uuid; v_my text := private.current_app_role();
begin
  if v_my = 'superadmin' then v_lab := coalesce(p_laboratory_id, private.my_laboratory_id());
  elsif v_my = 'jefa' then v_lab := private.my_laboratory_id();
  else raise exception 'No autorizado'; end if;
  if p_role not in ('tecnologo','toma','medico','jefa') then raise exception 'Rol invalido'; end if;
  update public.profiles set role = p_role, laboratory_id = v_lab, active = true where email = p_email;
  if not found then raise exception 'Usuario no encontrado: %', p_email; end if;
  return json_build_object('ok', true, 'email', p_email, 'role', p_role);
end;
$$;
grant execute on function public.assign_staff_to_lab(text, text, uuid) to authenticated;
