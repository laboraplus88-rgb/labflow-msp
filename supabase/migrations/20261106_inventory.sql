-- ============================================================
-- Inventario + Kardex (versión endurecida — NO usar using(true))
-- Esta migración documenta el modelo seguro aplicado en Supabase.
-- Si Claude ya aplicó RLS por laboratorio, NO re-ejecutar políticas blandas.
-- ============================================================

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null default 'General',
  unit text not null default 'und',
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  current_stock numeric(14,3) not null default 0 check (current_stock >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, code)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('ingreso', 'salida', 'ajuste')),
  source text not null check (source in (
    'distrito', 'intercambio', 'donacion', 'compra',
    'consumo', 'vencimiento', 'ajuste', 'otro'
  )),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  total_cost numeric(14,4) check (total_cost is null or total_cost >= 0),
  balance_after numeric(14,3),
  lot_code text,
  expires_at date,
  document_ref text,
  origin_detail text,
  received_by_name text,
  user_id uuid references auth.users(id),
  user_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inv_items_lab on public.inventory_items(laboratory_id);
create index if not exists idx_inv_mov_item on public.inventory_movements(item_id);
create index if not exists idx_inv_mov_lab on public.inventory_movements(laboratory_id);
create index if not exists idx_inv_mov_created on public.inventory_movements(created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- ============================================================
-- RLS por laboratorio (modelo seguro)
-- Lectura: jefa | tecnologo | toma
-- Escritura items/movimientos: jefa | tecnologo
-- Kardex: solo INSERT (sin UPDATE/DELETE)
-- ============================================================
-- NOTA: Las políticas reales dependen de funciones como my_role()
-- y profiles.laboratory_id ya existentes en el proyecto.
-- Claude las aplicó en producción. No reintroducir using (true).

-- RPC recomendada: movimiento + stock en una sola transacción
create or replace function public.register_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_source text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_lot_code text default null,
  p_expires_at date default null,
  p_document_ref text default null,
  p_origin_detail text default null,
  p_received_by_name text default null,
  p_notes text default null
)
returns public.inventory_movements
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_lab uuid;
  v_name text;
  v_item public.inventory_items%rowtype;
  v_qty numeric := p_quantity;
  v_new_stock numeric;
  v_mov public.inventory_movements%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select role, laboratory_id, full_name
    into v_role, v_lab, v_name
  from public.profiles
  where id = v_uid;

  if v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso para registrar movimientos de inventario';
  end if;
  if v_lab is null then
    raise exception 'Usuario sin laboratorio asignado';
  end if;
  if v_qty is null or v_qty <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  select * into v_item
  from public.inventory_items
  where id = p_item_id and laboratory_id = v_lab and active = true
  for update;

  if not found then
    raise exception 'Insumo no encontrado en este laboratorio';
  end if;

  if p_movement_type = 'ingreso' then
    v_new_stock := v_item.current_stock + v_qty;
  elsif p_movement_type = 'salida' then
    if v_qty > v_item.current_stock then
      raise exception 'Stock insuficiente';
    end if;
    v_new_stock := v_item.current_stock - v_qty;
  elsif p_movement_type = 'ajuste' then
    v_new_stock := v_item.current_stock + v_qty;
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  insert into public.inventory_movements (
    laboratory_id, item_id, movement_type, source, quantity,
    unit_cost, total_cost, balance_after, lot_code, expires_at,
    document_ref, origin_detail, received_by_name, user_id, user_name, notes
  ) values (
    v_lab, p_item_id, p_movement_type, p_source, v_qty,
    p_unit_cost,
    case when p_unit_cost is null then null else p_unit_cost * v_qty end,
    v_new_stock, p_lot_code, p_expires_at,
    p_document_ref, p_origin_detail, p_received_by_name,
    v_uid, coalesce(v_name, 'Usuario'), p_notes
  )
  returning * into v_mov;

  update public.inventory_items
  set current_stock = v_new_stock, updated_at = now()
  where id = p_item_id;

  return v_mov;
end;
$$;

grant execute on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) to authenticated;
