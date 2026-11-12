-- ============================================================
-- LabFlow (labflow-msp) — RPC register_inventory_movement
-- Fecha: 2026-11-12
-- ESTADO: REVISADA Y APROBADA para aplicar en labflow-msp (2026-11-12).
-- Aplicar en Supabase SQL Editor del proyecto de producción.
--
-- Alineada al esquema real verificado en producción:
--   inventory_items.current_stock  numeric NOT NULL, CHECK (>= 0)
--   inventory_movements.quantity   numeric NOT NULL, CHECK (> 0)
--   movement_type  IN ('ingreso','salida','ajuste')
--   source         IN ('distrito','intercambio','donacion','compra',
--                      'consumo','vencimiento','ajuste','otro')
--
-- Lo que YA hacen los triggers (esta RPC NO lo duplica):
--   private.stamp_inventory_movement()  BEFORE INSERT en inventory_movements
--       -> user_id, user_name (desde auth.uid() + profiles), created_at,
--          total_cost = round(unit_cost * quantity, 4) si viene null
--   private.touch_inventory_item()      BEFORE UPDATE en inventory_items
--       -> updated_at
--
-- Seguridad:
--   SECURITY INVOKER: RLS sigue aplicando (inv_items_update, inv_mov_insert,
--   ambas jefa|tecnologo y por laboratorio). La RPC añade validaciones y
--   atomicidad, no amplía permisos.
--   Usa private.current_app_role() / private.my_laboratory_id(), los mismos
--   helpers que las policies (authenticated ya tiene EXECUTE sobre ambos).
--
-- Concurrencia: SELECT ... FOR UPDATE sobre el insumo serializa movimientos
-- simultáneos del mismo ítem; movimiento + stock van en la misma transacción.
-- ============================================================

create or replace function public.register_inventory_movement(
  p_item_id           uuid,
  p_movement_type     text,
  p_source            text,
  p_quantity          numeric,
  p_unit_cost         numeric default null,
  p_lot_code          text    default null,
  p_expires_at        date    default null,
  p_document_ref      text    default null,
  p_origin_detail     text    default null,
  p_received_by_name  text    default null,
  p_notes             text    default null
)
returns public.inventory_movements
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_role      text := private.current_app_role();
  v_lab       uuid := private.my_laboratory_id();
  v_item      public.inventory_items%rowtype;
  v_new_stock numeric;
  v_mov       public.inventory_movements%rowtype;
  v_rows      int;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if v_role is null or v_role not in ('jefa', 'tecnologo') then
    raise exception 'Sin permiso para registrar movimientos de inventario';
  end if;
  if v_lab is null then
    raise exception 'Usuario sin laboratorio asignado';
  end if;

  -- Validaciones espejo de los CHECK de la tabla (mensajes más claros)
  if p_movement_type is null
     or p_movement_type not in ('ingreso', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento inválido';
  end if;
  if p_source is null
     or p_source not in ('distrito', 'intercambio', 'donacion', 'compra',
                         'consumo', 'vencimiento', 'ajuste', 'otro') then
    raise exception 'Origen del movimiento inválido';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;
  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'El costo unitario no puede ser negativo';
  end if;

  -- Bloqueo del insumo (solo de su laboratorio; RLS también lo exige)
  select * into v_item
  from public.inventory_items
  where id = p_item_id
    and laboratory_id = v_lab
  for update;

  if not found then
    raise exception 'Insumo no encontrado en este laboratorio';
  end if;
  if not v_item.active then
    raise exception 'El insumo está inactivo';
  end if;

  -- Cálculo de stock
  --   ingreso: suma
  --   salida : resta (no permite stock negativo)
  --   ajuste : suma (delta positivo). Para DISMINUIR stock por merma,
  --            vencimiento o conteo usar 'salida' con source 'ajuste'
  --            o 'vencimiento', porque quantity > 0 por CHECK.
  if p_movement_type = 'salida' then
    if p_quantity > v_item.current_stock then
      raise exception 'Stock insuficiente (disponible: %)', v_item.current_stock;
    end if;
    v_new_stock := v_item.current_stock - p_quantity;
  else
    v_new_stock := v_item.current_stock + p_quantity;
  end if;

  -- user_id, user_name, created_at y total_cost los completa
  -- private.stamp_inventory_movement(): no se envían aquí.
  insert into public.inventory_movements (
    laboratory_id, item_id, movement_type, source, quantity,
    unit_cost, balance_after, lot_code, expires_at,
    document_ref, origin_detail, received_by_name, notes
  ) values (
    v_lab, p_item_id, p_movement_type, p_source, p_quantity,
    p_unit_cost, v_new_stock, nullif(btrim(p_lot_code), ''), p_expires_at,
    nullif(btrim(p_document_ref), ''), nullif(btrim(p_origin_detail), ''),
    nullif(btrim(p_received_by_name), ''), nullif(btrim(p_notes), '')
  )
  returning * into v_mov;

  -- updated_at lo completa private.touch_inventory_item()
  update public.inventory_items
     set current_stock = v_new_stock
   where id = p_item_id
     and laboratory_id = v_lab;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    -- Revierte también el movimiento insertado (misma transacción)
    raise exception 'No se pudo actualizar el stock del insumo';
  end if;

  return v_mov;
end;
$$;

comment on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) is 'Registra un movimiento de kardex y actualiza current_stock en una sola transacción. SECURITY INVOKER (RLS aplica). Roles: jefa, tecnologo.';

-- Por defecto CREATE FUNCTION concede EXECUTE a PUBLIC: se retira.
revoke all on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) from public, anon;

grant execute on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- ROLLBACK (si hiciera falta):
-- drop function if exists public.register_inventory_movement(
--   uuid, text, text, numeric, numeric, text, date, text, text, text, text);
-- ============================================================
