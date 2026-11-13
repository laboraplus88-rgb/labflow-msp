-- Ajuste portal_enqueue_results_ready: destino explícito opcional
-- No asume columnas email/telefono en patients.

create or replace function public.portal_enqueue_results_ready(
  p_request_id uuid,
  p_channel text default 'whatsapp',
  p_destination text default null
)
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
  v_dest text := nullif(btrim(p_destination), '');
  v_name text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo') then raise exception 'Sin permiso'; end if;
  if p_channel not in ('email', 'whatsapp', 'sms') then
    raise exception 'Canal inválido';
  end if;

  select * into v_req from public.exam_requests
   where id = p_request_id and laboratory_id = v_lab;
  if not found then raise exception 'Orden no encontrada'; end if;

  select * into v_pat from public.patients where id = v_req.patient_id;
  v_name := trim(both from concat_ws(' ', v_pat.primer_nombre, v_pat.apellido_paterno));

  if v_dest is null then
    return json_build_object(
      'ok', true,
      'enqueued', 0,
      'note', 'Indique p_destination (teléfono o email) para encolar el aviso'
    );
  end if;

  insert into public.notification_outbox (
    laboratory_id, patient_id, exam_request_id, channel, destination, template, payload
  ) values (
    v_lab, v_pat.id, v_req.id, p_channel, v_dest, 'results_ready',
    jsonb_build_object(
      'request_code', v_req.code,
      'patient_name', v_name,
      'message', format(
        'Hola %s, sus resultados de la orden %s están listos. Consulte el portal LabFlow con su cédula y PIN de 6 dígitos.',
        coalesce(nullif(v_name, ''), 'paciente'),
        v_req.code
      )
    )
  );

  return json_build_object('ok', true, 'enqueued', 1, 'channel', p_channel, 'destination', v_dest);
end;
$$;

revoke all on function public.portal_enqueue_results_ready(uuid, text, text) from public, anon;
grant execute on function public.portal_enqueue_results_ready(uuid, text, text) to authenticated;

-- Sobrecarga de 1 arg: solo valida permiso y no encola sin destino
create or replace function public.portal_enqueue_results_ready(p_request_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.portal_enqueue_results_ready(p_request_id, 'whatsapp', null);
end;
$$;

notify pgrst, 'reload schema';
