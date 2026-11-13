-- ============================================================
-- LabFlow — Portal paciente (RPC) + security_events (auditoría básica)
-- Fecha: 2026-11-13
-- Revisar antes de aplicar en producción.
-- ============================================================

-- Portal: consulta pública con cédula + código de orden.
-- Solo etapas Validado / Entregado. Sin datos de otros pacientes.
create or replace function public.patient_portal_lookup(
  p_cedula text,
  p_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ced text := nullif(btrim(p_cedula), '');
  v_code text := nullif(btrim(p_access_code), '');
  v_out jsonb;
begin
  if v_ced is null or v_code is null then
    raise exception 'Cédula y código de orden son obligatorios';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.validated_at desc nulls last), '[]'::jsonb)
  into v_out
  from (
    select
      trim(both from concat_ws(' ',
        nullif(p.primer_nombre, ''),
        nullif(p.segundo_nombre, ''),
        nullif(p.apellido_paterno, ''),
        nullif(p.apellido_materno, '')
      )) as patient_name,
      p.cedula,
      er.code as request_code,
      t.exam_name,
      t.category,
      t.result,
      t.result_unit,
      t.result_range,
      t.result_flag,
      t.validated_at,
      l.name as laboratory_name
    from public.patients p
    join public.exam_requests er on er.patient_id = p.id
    join public.tests t on t.request_id = er.id
    left join public.laboratories l on l.id = er.laboratory_id
    where p.cedula = v_ced
      and er.code = v_code
      and t.stage in ('Validado', 'Entregado')
  ) x;

  return v_out;
end;
$$;

revoke all on function public.patient_portal_lookup(text, text) from public;
grant execute on function public.patient_portal_lookup(text, text) to anon, authenticated;

-- Eventos de seguridad (para soporte TIC / endurecimiento)
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid references public.laboratories(id),
  user_id uuid references auth.users(id),
  event_type text not null,
  path text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_idx
  on public.security_events (created_at desc);
create index if not exists security_events_lab_idx
  on public.security_events (laboratory_id, created_at desc);

alter table public.security_events enable row level security;

drop policy if exists security_events_select on public.security_events;
create policy security_events_select on public.security_events
  for select to authenticated
  using (
    (select private.current_app_role()) = 'superadmin'
    or (
      (select private.current_app_role()) = 'jefa'
      and laboratory_id = (select private.my_laboratory_id())
    )
  );

-- Insert solo vía service role / definer futuros; sin policy de insert para authenticated

notify pgrst, 'reload schema';
