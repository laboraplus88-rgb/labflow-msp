-- ============================================================
-- LabFlow — Módulo Facturación y Cobranza (fase 1: schema + RLS)
-- Fecha: 2026-11-09
-- Requiere: laboratories, profiles, patients, exam_requests
--           private.my_laboratory_id(), private.current_app_role()
-- Idempotente donde es posible.
-- ============================================================

-- ----- Catálogo de precios por laboratorio -----
create table if not exists public.billing_price_items (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  exam_code text not null,
  exam_name text not null,
  category text,
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, exam_code)
);

create index if not exists billing_price_items_lab_idx
  on public.billing_price_items (laboratory_id);

-- ----- Facturas -----
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  number text not null,
  patient_id uuid references public.patients(id),
  exam_request_id uuid references public.exam_requests(id),
  -- particular | convenio | publico | cortesia
  payer_type text not null default 'particular'
    check (payer_type in ('particular', 'convenio', 'publico', 'cortesia')),
  payer_name text,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'partial', 'paid', 'void', 'glosa')),
  currency text not null default 'USD',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  notes text,
  issued_at timestamptz,
  due_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, number)
);

create index if not exists invoices_lab_idx on public.invoices (laboratory_id);
create index if not exists invoices_patient_idx on public.invoices (patient_id);
create index if not exists invoices_status_idx on public.invoices (laboratory_id, status);
create index if not exists invoices_request_idx on public.invoices (exam_request_id);

-- ----- Ítems de factura -----
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  exam_code text,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  line_total numeric(14,2) not null default 0 check (line_total >= 0),
  test_id uuid references public.tests(id),
  created_at timestamptz not null default now()
);

create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_lab_idx on public.invoice_items (laboratory_id);

-- ----- Pagos -----
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'efectivo'
    check (method in ('efectivo', 'tarjeta', 'transferencia', 'cheque', 'otro')),
  reference text,
  paid_at timestamptz not null default now(),
  received_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_idx on public.payments (invoice_id);
create index if not exists payments_lab_idx on public.payments (laboratory_id);

-- ============================================================
-- RLS
-- Lectura/escritura operativa: jefa | tecnologo
-- toma: solo lectura (opcional caja futura)
-- medico: sin acceso a facturación
-- superadmin: sin acceso operativo (igual patrón clínico)
-- ============================================================

alter table public.billing_price_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

alter table public.billing_price_items force row level security;
alter table public.invoices force row level security;
alter table public.invoice_items force row level security;
alter table public.payments force row level security;

-- price items
drop policy if exists billing_price_select on public.billing_price_items;
drop policy if exists billing_price_write on public.billing_price_items;

create policy billing_price_select on public.billing_price_items
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy billing_price_write on public.billing_price_items
  for all to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

-- invoices
drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;

create policy invoices_select on public.invoices
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
    and created_by = (select auth.uid())
  );

create policy invoices_update on public.invoices
  for update to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
  );

-- invoice items
drop policy if exists invoice_items_select on public.invoice_items;
drop policy if exists invoice_items_write on public.invoice_items;

create policy invoice_items_select on public.invoice_items
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy invoice_items_write on public.invoice_items
  for all to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

-- payments
drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;

create policy payments_select on public.payments
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy payments_insert on public.payments
  for insert to authenticated
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );
-- Sin update/delete de pagos (auditoría)

-- ============================================================
-- RPC: emitir factura simple desde una orden (exam_request)
-- ============================================================
create or replace function public.billing_issue_from_request(
  p_request_id uuid,
  p_payer_type text default 'particular',
  p_payer_name text default null,
  p_discount numeric default 0
)
returns public.invoices
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_req public.exam_requests%rowtype;
  v_number text;
  v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := coalesce(p_discount, 0);
  v_total numeric(14,2);
  v_inv public.invoices%rowtype;
  r record;
  v_price numeric(14,2);
  v_desc text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso para facturar';
  end if;
  if v_lab is null then raise exception 'Usuario sin laboratorio'; end if;
  if v_discount < 0 then raise exception 'Descuento inválido'; end if;
  if p_payer_type not in ('particular', 'convenio', 'publico', 'cortesia') then
    raise exception 'Tipo de pagador inválido';
  end if;

  select * into v_req
  from public.exam_requests
  where id = p_request_id and laboratory_id = v_lab;

  if not found then
    raise exception 'Orden no encontrada en este laboratorio';
  end if;

  -- número simple por lab (mejorar con secuencia dedicada si hace falta)
  v_number := 'F-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.invoices (
    laboratory_id, number, patient_id, exam_request_id,
    payer_type, payer_name, status, subtotal, discount, tax, total,
    amount_paid, issued_at, created_by
  ) values (
    v_lab, v_number, v_req.patient_id, v_req.id,
    p_payer_type, p_payer_name, 'issued', 0, v_discount, 0, 0,
    0, now(), v_uid
  )
  returning * into v_inv;

  for r in
    select t.id as test_id, t.exam_code, t.exam_name, t.category
    from public.tests t
    where t.request_id = v_req.id and t.laboratory_id = v_lab
  loop
    select unit_price into v_price
    from public.billing_price_items
    where laboratory_id = v_lab and exam_code = r.exam_code and active = true;

    v_price := coalesce(v_price, 0);
    v_desc := coalesce(r.exam_name, r.exam_code, 'Examen');
    v_subtotal := v_subtotal + v_price;

    insert into public.invoice_items (
      laboratory_id, invoice_id, exam_code, description,
      quantity, unit_price, line_total, test_id
    ) values (
      v_lab, v_inv.id, r.exam_code, v_desc,
      1, v_price, v_price, r.test_id
    );
  end loop;

  if v_discount > v_subtotal then
    v_discount := v_subtotal;
  end if;
  v_total := v_subtotal - v_discount;

  update public.invoices
  set subtotal = v_subtotal,
      discount = v_discount,
      total = v_total,
      updated_at = now()
  where id = v_inv.id
  returning * into v_inv;

  return v_inv;
end;
$$;

grant execute on function public.billing_issue_from_request(uuid, text, text, numeric) to authenticated;
revoke execute on function public.billing_issue_from_request(uuid, text, text, numeric) from public, anon;

-- ============================================================
-- RPC: registrar pago y actualizar estado de factura
-- ============================================================
create or replace function public.billing_register_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text default 'efectivo',
  p_reference text default null,
  p_notes text default null
)
returns public.payments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := private.current_app_role();
  v_lab uuid := private.my_laboratory_id();
  v_inv public.invoices%rowtype;
  v_paid numeric(14,2);
  v_pay public.payments%rowtype;
  v_status text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso para registrar pagos';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Monto inválido';
  end if;
  if p_method not in ('efectivo', 'tarjeta', 'transferencia', 'cheque', 'otro') then
    raise exception 'Método de pago inválido';
  end if;

  select * into v_inv
  from public.invoices
  where id = p_invoice_id and laboratory_id = v_lab
  for update;

  if not found then raise exception 'Factura no encontrada'; end if;
  if v_inv.status in ('void', 'draft') then
    raise exception 'Factura no admite pagos en estado %', v_inv.status;
  end if;

  insert into public.payments (
    laboratory_id, invoice_id, amount, method, reference, received_by, notes
  ) values (
    v_lab, v_inv.id, p_amount, p_method, p_reference, v_uid, p_notes
  )
  returning * into v_pay;

  v_paid := v_inv.amount_paid + p_amount;
  if v_paid >= v_inv.total then
    v_status := 'paid';
    v_paid := v_inv.total; -- no exceder en el acumulado mostrado
  else
    v_status := 'partial';
  end if;

  update public.invoices
  set amount_paid = v_paid,
      status = v_status,
      updated_at = now()
  where id = v_inv.id;

  return v_pay;
end;
$$;

grant execute on function public.billing_register_payment(uuid, numeric, text, text, text) to authenticated;
revoke execute on function public.billing_register_payment(uuid, numeric, text, text, text) from public, anon;
