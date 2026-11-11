-- LabFlow: endurecimiento de Facturacion y Agenda (YA APLICADO en Supabase, 2026-11-11)
-- Orden: 20261109_billing_module.sql -> 20261109_appointments_module.sql -> ESTE archivo.
-- (En produccion se aplico la version endurecida directamente; este archivo reproduce el mismo estado final
--  partiendo de los dos SQL originales.)

-- ===== FACTURACION =====
-- Una sola factura vigente por orden
create unique index if not exists invoices_one_active_per_request on public.invoices (exam_request_id)
  where exam_request_id is not null and status <> 'void';

-- Solo la jefa edita precios
drop policy if exists billing_price_write on public.billing_price_items;
create policy billing_price_write on public.billing_price_items for all to authenticated
  using (laboratory_id = (select private.my_laboratory_id()) and (select private.is_jefa()))
  with check (laboratory_id = (select private.my_laboratory_id()) and (select private.is_jefa()));

-- Facturas, items y pagos: solo lectura directa; toda escritura por las funciones billing_*
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;
drop policy if exists invoice_items_write on public.invoice_items;
drop policy if exists payments_insert on public.payments;
revoke insert, update, delete, truncate on public.invoices, public.invoice_items, public.payments from authenticated, anon;
revoke all on public.billing_price_items, public.invoices, public.invoice_items, public.payments from anon;

-- billing_issue_from_request: security definer; una factura vigente por orden; exige examenes;
-- precio = billing_price_items y, si no hay, el precio del catalogo guardado en tests.price.
create or replace function public.billing_issue_from_request(
  p_request_id uuid, p_payer_type text default 'particular', p_payer_name text default null, p_discount numeric default 0
) returns public.invoices language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_role text := private.current_app_role(); v_lab uuid := private.my_laboratory_id();
  v_req public.exam_requests%rowtype; v_number text; v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := round(coalesce(p_discount, 0), 2); v_total numeric(14,2);
  v_inv public.invoices%rowtype; r record; v_price numeric(14,2);
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa','tecnologo') then raise exception 'Sin permiso para facturar'; end if;
  if v_lab is null then raise exception 'Usuario sin laboratorio'; end if;
  if v_discount < 0 then raise exception 'Descuento invalido'; end if;
  if p_payer_type not in ('particular','convenio','publico','cortesia') then raise exception 'Tipo de pagador invalido'; end if;
  select * into v_req from public.exam_requests where id = p_request_id and laboratory_id = v_lab;
  if not found then raise exception 'Orden no encontrada en este laboratorio'; end if;
  if exists (select 1 from public.invoices where exam_request_id = v_req.id and status <> 'void') then
    raise exception 'Esta orden ya tiene una factura vigente'; end if;
  if not exists (select 1 from public.tests where request_id = v_req.id and laboratory_id = v_lab) then
    raise exception 'La orden no tiene examenes para facturar'; end if;
  v_number := 'F-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.invoices (laboratory_id, number, patient_id, exam_request_id, payer_type, payer_name,
    status, subtotal, discount, tax, total, amount_paid, issued_at, created_by)
  values (v_lab, v_number, v_req.patient_id, v_req.id, p_payer_type, p_payer_name, 'issued', 0, v_discount, 0, 0, 0, now(), v_uid)
  returning * into v_inv;
  for r in select t.id as test_id, t.exam_code, t.exam_name, t.price as catalog_price
             from public.tests t where t.request_id = v_req.id and t.laboratory_id = v_lab
  loop
    v_price := null;
    select unit_price into v_price from public.billing_price_items
     where laboratory_id = v_lab and exam_code = r.exam_code and active = true;
    if v_price is null then v_price := coalesce(r.catalog_price, 0); end if;
    v_subtotal := v_subtotal + v_price;
    insert into public.invoice_items (laboratory_id, invoice_id, exam_code, description, quantity, unit_price, line_total, test_id)
    values (v_lab, v_inv.id, r.exam_code, coalesce(r.exam_name, r.exam_code, 'Examen'), 1, v_price, v_price, r.test_id);
  end loop;
  if v_discount > v_subtotal then v_discount := v_subtotal; end if;
  v_total := v_subtotal - v_discount;
  update public.invoices set subtotal = v_subtotal, discount = v_discount, total = v_total, updated_at = now()
   where id = v_inv.id returning * into v_inv;
  return v_inv;
end;
$$;

-- billing_register_payment: security definer; el pago no puede exceder el saldo
create or replace function public.billing_register_payment(
  p_invoice_id uuid, p_amount numeric, p_method text default 'efectivo', p_reference text default null, p_notes text default null
) returns public.payments language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_role text := private.current_app_role(); v_lab uuid := private.my_laboratory_id();
  v_inv public.invoices%rowtype; v_pay public.payments%rowtype; v_amount numeric(14,2); v_paid numeric(14,2);
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa','tecnologo') then raise exception 'Sin permiso para registrar pagos'; end if;
  if p_amount is null or round(p_amount, 2) <= 0 then raise exception 'Monto invalido'; end if;
  v_amount := round(p_amount, 2);
  if p_method not in ('efectivo','tarjeta','transferencia','cheque','otro') then raise exception 'Metodo de pago invalido'; end if;
  select * into v_inv from public.invoices where id = p_invoice_id and laboratory_id = v_lab for update;
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_inv.status in ('void','draft') then raise exception 'Factura no admite pagos en estado %', v_inv.status; end if;
  if v_inv.amount_paid + v_amount > v_inv.total then
    raise exception 'El pago (%) excede el saldo pendiente (%)', v_amount, v_inv.total - v_inv.amount_paid; end if;
  insert into public.payments (laboratory_id, invoice_id, amount, method, reference, received_by, notes)
  values (v_lab, v_inv.id, v_amount, p_method, p_reference, v_uid, p_notes) returning * into v_pay;
  v_paid := v_inv.amount_paid + v_amount;
  update public.invoices set amount_paid = v_paid,
         status = case when v_paid >= v_inv.total then 'paid' else 'partial' end, updated_at = now()
   where id = v_inv.id;
  return v_pay;
end;
$$;

-- billing_void_invoice (nueva): solo la jefa, solo si no tiene pagos
create or replace function public.billing_void_invoice(p_invoice_id uuid, p_reason text default null)
returns public.invoices language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_lab uuid := private.my_laboratory_id(); v_inv public.invoices%rowtype;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if private.current_app_role() is distinct from 'jefa' then raise exception 'Solo la jefa puede anular facturas'; end if;
  select * into v_inv from public.invoices where id = p_invoice_id and laboratory_id = v_lab for update;
  if not found then raise exception 'Factura no encontrada'; end if;
  if v_inv.status = 'void' then raise exception 'La factura ya esta anulada'; end if;
  if v_inv.amount_paid > 0 then raise exception 'La factura tiene pagos registrados; no se puede anular'; end if;
  update public.invoices set status = 'void',
         notes = concat_ws(E'\n', notes, 'Anulada: ' || coalesce(nullif(btrim(p_reason), ''), 'sin motivo')), updated_at = now()
   where id = v_inv.id returning * into v_inv;
  return v_inv;
end;
$$;
revoke execute on function public.billing_void_invoice(uuid, text) from public, anon;
grant execute on function public.billing_void_invoice(uuid, text) to authenticated;

-- ===== AGENDA =====
revoke all on public.appointment_resources, public.appointments, public.appointment_waitlist from anon;

-- El medico no lee la agenda del laboratorio
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated using (
  laboratory_id = (select private.my_laboratory_id()) and (select private.current_app_role()) in ('jefa','tecnologo','toma'));

-- Paciente, recurso y orden deben ser del mismo laboratorio
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated with check (
  laboratory_id = (select private.my_laboratory_id())
  and (select private.current_app_role()) in ('jefa','tecnologo','toma')
  and created_by = (select auth.uid())
  and (patient_id is null or exists (select 1 from public.patients p where p.id = patient_id and p.laboratory_id = (select private.my_laboratory_id())))
  and (resource_id is null or exists (select 1 from public.appointment_resources r where r.id = resource_id and r.laboratory_id = (select private.my_laboratory_id())))
  and (exam_request_id is null or exists (select 1 from public.exam_requests e where e.id = exam_request_id and e.laboratory_id = (select private.my_laboratory_id()))));
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
  using (laboratory_id = (select private.my_laboratory_id()) and (select private.current_app_role()) in ('jefa','tecnologo','toma'))
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (patient_id is null or exists (select 1 from public.patients p where p.id = patient_id and p.laboratory_id = (select private.my_laboratory_id())))
    and (resource_id is null or exists (select 1 from public.appointment_resources r where r.id = resource_id and r.laboratory_id = (select private.my_laboratory_id())))
    and (exam_request_id is null or exists (select 1 from public.exam_requests e where e.id = exam_request_id and e.laboratory_id = (select private.my_laboratory_id()))));
drop policy if exists appt_waitlist_write on public.appointment_waitlist;
create policy appt_waitlist_write on public.appointment_waitlist for all to authenticated
  using (laboratory_id = (select private.my_laboratory_id()) and (select private.current_app_role()) in ('jefa','tecnologo','toma'))
  with check (laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa','tecnologo','toma')
    and (patient_id is null or exists (select 1 from public.patients p where p.id = patient_id and p.laboratory_id = (select private.my_laboratory_id()))));

-- appointment_create: ademas valida que la orden sea del laboratorio
-- (Definicion completa aplicada en Supabase: migracion labflow_20261109_appointments_module.)
-- Sugerido a futuro: impedir doble reserva del mismo recurso y horario.

alter function public.test_stage_logs_ignore_client_insert() set search_path = public;
notify pgrst, 'reload schema';
