-- ============================================================
-- LabFlow Portal v2 — PIN 6 dígitos, historial, rate limit, outbox
-- Fecha: 2026-11-13
-- Revisar y aplicar en labflow-msp con OK explícito.
-- Requiere extensión pgcrypto (disponible en Supabase).
-- ============================================================

create extension if not exists pgcrypto;

-- PIN de acceso del paciente (por laboratorio)
create table if not exists public.portal_pins (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  pin_hash text not null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (laboratory_id, patient_id)
);

create index if not exists portal_pins_patient_idx on public.portal_pins (patient_id);

alter table public.portal_pins enable row level security;

drop policy if exists portal_pins_staff on public.portal_pins;
create policy portal_pins_staff on public.portal_pins for all to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

-- Rate limit de consultas al portal (por cédula normalizada)
create table if not exists public.portal_rate_limits (
  rate_key text primary key,
  attempts int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.portal_rate_limits enable row level security;
-- Sin policies de acceso para authenticated/anon: solo security definer

-- Cola de notificaciones (email / whatsapp)
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid references public.laboratories(id),
  patient_id uuid references public.patients(id),
  exam_request_id uuid references public.exam_requests(id),
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  destination text not null,
  template text not null default 'results_ready',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (status, created_at)
  where status = 'pending';

alter table public.notification_outbox enable row level security;

drop policy if exists notification_outbox_select on public.notification_outbox;
create policy notification_outbox_select on public.notification_outbox
  for select to authenticated
  using (
    (select private.current_app_role()) = 'superadmin'
    or (
      (select private.current_app_role()) in ('jefa', 'tecnologo')
      and laboratory_id = (select private.my_laboratory_id())
    )
  );

-- Rate limit helper (máx 10 intentos / 15 min por cédula)
create or replace function private.portal_check_rate_limit(p_cedula text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := 'ced:' || lower(btrim(p_cedula));
  v_row public.portal_rate_limits%rowtype;
  v_window interval := interval '15 minutes';
  v_max int := 10;
begin
  select * into v_row from public.portal_rate_limits where rate_key = v_key for update;
  if not found then
    insert into public.portal_rate_limits (rate_key, attempts, window_start)
    values (v_key, 1, now());
    return;
  end if;
  if v_row.window_start < now() - v_window then
    update public.portal_rate_limits
       set attempts = 1, window_start = now()
     where rate_key = v_key;
    return;
  end if;
  if v_row.attempts >= v_max then
    insert into public.security_events (event_type, path, meta)
    values ('portal_rate_limited', '/portal', jsonb_build_object('cedula', p_cedula));
    raise exception 'Demasiados intentos. Espere 15 minutos e intente de nuevo';
  end if;
  update public.portal_rate_limits
     set attempts = attempts + 1
   where rate_key = v_key;
end;
$$;

-- Emite / renueva PIN de 6 dígitos (solo jefa|tecnologo). Devuelve el PIN en claro una vez.
create or replace function public.portal_issue_pin(p_patient_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_pat public.patients%rowtype;
  v_pin text;
  v_hash text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso para emitir PIN de portal';
  end if;
  if v_lab is null then raise exception 'Usuario sin laboratorio'; end if;

  select * into v_pat from public.patients
   where id = p_patient_id and laboratory_id = v_lab;
  if not found then raise exception 'Paciente no encontrado en este laboratorio'; end if;

  v_pin := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_hash := crypt(v_pin, gen_salt('bf'));

  insert into public.portal_pins (laboratory_id, patient_id, pin_hash, expires_at, active, created_by)
  values (v_lab, p_patient_id, v_hash, now() + interval '90 days', true, v_uid)
  on conflict (laboratory_id, patient_id) do update
    set pin_hash = excluded.pin_hash,
        expires_at = excluded.expires_at,
        active = true,
        created_by = excluded.created_by,
        created_at = now();

  return json_build_object(
    'ok', true,
    'patient_id', p_patient_id,
    'cedula', v_pat.cedula,
    'pin', v_pin,
    'expires_at', (now() + interval '90 days')
  );
end;
$$;

revoke all on function public.portal_issue_pin(uuid) from public, anon;
grant execute on function public.portal_issue_pin(uuid) to authenticated;

-- Auth portal: cédula + (PIN 6 dígitos O código de orden)
-- Devuelve paciente + historial de órdenes con resultados validados
create or replace function public.patient_portal_auth(
  p_cedula text,
  p_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ced text := nullif(btrim(p_cedula), '');
  v_secret text := nullif(btrim(p_secret), '');
  v_pat public.patients%rowtype;
  v_lab_id uuid;
  v_pin_ok boolean := false;
  v_orders jsonb;
  v_patient jsonb;
begin
  if v_ced is null or v_secret is null then
    raise exception 'Cédula y PIN o código de orden son obligatorios';
  end if;

  perform private.portal_check_rate_limit(v_ced);

  -- Buscar paciente(s) por cédula: se valida secret contra PIN de ese lab o código de orden
  -- Estrategia: si secret es 6 dígitos numéricos → PIN; si no → código de orden
  if v_secret ~ '^[0-9]{6}$' then
    select p.* into v_pat
    from public.patients p
    join public.portal_pins pp on pp.patient_id = p.id and pp.laboratory_id = p.laboratory_id
    where p.cedula = v_ced
      and pp.active = true
      and pp.expires_at > now()
      and pp.pin_hash = crypt(v_secret, pp.pin_hash)
    order by pp.created_at desc
    limit 1;

    if not found then
      insert into public.security_events (event_type, path, meta)
      values ('portal_auth_failed', '/portal', jsonb_build_object('cedula', v_ced, 'mode', 'pin'));
      raise exception 'Cédula o PIN incorrectos';
    end if;
    v_pin_ok := true;
    v_lab_id := v_pat.laboratory_id;
  else
    -- Código de orden (compatibilidad v1)
    select p.* into v_pat
    from public.patients p
    join public.exam_requests er on er.patient_id = p.id
    where p.cedula = v_ced
      and er.code = v_secret
    limit 1;

    if not found then
      insert into public.security_events (event_type, path, meta)
      values ('portal_auth_failed', '/portal', jsonb_build_object('cedula', v_ced, 'mode', 'order_code'));
      raise exception 'Cédula o código de orden incorrectos';
    end if;
    v_lab_id := v_pat.laboratory_id;
  end if;

  v_patient := jsonb_build_object(
    'id', v_pat.id,
    'cedula', v_pat.cedula,
    'name', trim(both from concat_ws(' ',
      nullif(v_pat.primer_nombre, ''),
      nullif(v_pat.segundo_nombre, ''),
      nullif(v_pat.apellido_paterno, ''),
      nullif(v_pat.apellido_materno, '')
    )),
    'laboratory_id', v_lab_id
  );

  select coalesce(jsonb_agg(to_jsonb(o) order by o.request_created_at desc), '[]'::jsonb)
  into v_orders
  from (
    select
      er.id as request_id,
      er.code as request_code,
      er.created_at as request_created_at,
      l.name as laboratory_name,
      (
        select coalesce(jsonb_agg(to_jsonb(t) order by t.validated_at desc nulls last), '[]'::jsonb)
        from (
          select
            tests.exam_name,
            tests.category,
            tests.result,
            tests.result_unit,
            tests.result_range,
            tests.result_flag,
            tests.stage,
            tests.validated_at
          from public.tests
          where tests.request_id = er.id
            and tests.stage in ('Validado', 'Entregado')
        ) t
      ) as exams
    from public.exam_requests er
    left join public.laboratories l on l.id = er.laboratory_id
    where er.patient_id = v_pat.id
      and er.laboratory_id = v_lab_id
      and exists (
        select 1 from public.tests tx
        where tx.request_id = er.id and tx.stage in ('Validado', 'Entregado')
      )
      and (
        v_pin_ok
        or er.code = v_secret  -- con código de orden: solo esa orden
      )
  ) o;

  -- Si entró con código de orden, igual devolvemos solo esa orden (filtro arriba).
  -- Si entró con PIN, historial completo del lab.

  insert into public.security_events (laboratory_id, event_type, path, meta)
  values (
    v_lab_id,
    'portal_auth_ok',
    '/portal',
    jsonb_build_object('patient_id', v_pat.id, 'mode', case when v_pin_ok then 'pin' else 'order_code' end)
  );

  return jsonb_build_object(
    'patient', v_patient,
    'orders', coalesce(v_orders, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.patient_portal_auth(text, text) from public;
grant execute on function public.patient_portal_auth(text, text) to anon, authenticated;

-- Compat: mantener patient_portal_lookup apuntando a auth (misma firma conceptual)
create or replace function public.patient_portal_lookup(
  p_cedula text,
  p_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.patient_portal_auth(p_cedula, p_access_code);
end;
$$;

-- Encolar notificación cuando hay resultados listos (llamar desde UI al validar o job)
create or replace function public.portal_enqueue_results_ready(p_request_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_req public.exam_requests%rowtype;
  v_pat public.patients%rowtype;
  v_dest text;
  v_n int := 0;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso';
  end if;

  select * into v_req from public.exam_requests
   where id = p_request_id and laboratory_id = v_lab;
  if not found then raise exception 'Orden no encontrada'; end if;

  select * into v_pat from public.patients where id = v_req.patient_id;

  -- email si existe columna; teléfono como whatsapp
  begin
    v_dest := nullif(btrim(v_pat.email), '');
  exception when undefined_column then
    v_dest := null;
  end;

  if v_dest is not null then
    insert into public.notification_outbox (
      laboratory_id, patient_id, exam_request_id, channel, destination, template, payload
    ) values (
      v_lab, v_pat.id, v_req.id, 'email', v_dest, 'results_ready',
      jsonb_build_object(
        'request_code', v_req.code,
        'patient_name', trim(both from concat_ws(' ', v_pat.primer_nombre, v_pat.apellido_paterno)),
        'portal_url', '/portal'
      )
    );
    v_n := v_n + 1;
  end if;

  if nullif(btrim(coalesce(v_pat.telefono, v_pat.phone, '')), '') is not null then
    insert into public.notification_outbox (
      laboratory_id, patient_id, exam_request_id, channel, destination, template, payload
    ) values (
      v_lab, v_pat.id, v_req.id, 'whatsapp',
      coalesce(v_pat.telefono, v_pat.phone),
      'results_ready',
      jsonb_build_object(
        'request_code', v_req.code,
        'patient_name', trim(both from concat_ws(' ', v_pat.primer_nombre, v_pat.apellido_paterno)),
        'message', 'Sus resultados de laboratorio están listos. Consulte el portal LabFlow con su cédula y PIN.'
      )
    );
    v_n := v_n + 1;
  end if;

  return json_build_object('ok', true, 'enqueued', v_n);
exception
  when undefined_column then
    -- esquema patients sin telefono/email: no fallar
    return json_build_object('ok', true, 'enqueued', 0, 'note', 'sin campos de contacto');
end;
$$;

revoke all on function public.portal_enqueue_results_ready(uuid) from public, anon;
grant execute on function public.portal_enqueue_results_ready(uuid) to authenticated;

notify pgrst, 'reload schema';
