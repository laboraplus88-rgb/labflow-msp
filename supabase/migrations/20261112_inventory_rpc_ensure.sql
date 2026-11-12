-- ============================================================
-- LabFlow — Asegurar RPC de inventario (si falta en producción)
-- Fecha: 2026-11-12
-- Idempotente. No crea tablas (eso es 20261106_inventory.sql).
-- Revisar antes de aplicar en producción.
-- ============================================================

-- Requiere: inventory_items, inventory_movements, profiles, laboratories

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
  if p_movement_type not in ('ingreso', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento inválido';
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
  else
    -- ajuste: quantity se interpreta como delta (puede documentarse en notes)
    v_new_stock := v_item.current_stock + v_qty;
  end if;

  if v_new_stock < 0 then
    raise exception 'Stock resultante no puede ser negativo';
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

revoke execute on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) from public, anon;

notify pgrst, 'reload schema';
