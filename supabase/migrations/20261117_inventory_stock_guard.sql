-- LabFlow: el stock de un insumo solo cambia junto con un movimiento del Kardex (YA APLICADO, 2026-11-17).
-- Sin esto, una jefa o un tecnologo podia editar current_stock a mano y descuadrar el Kardex sin dejar rastro.
-- Aplica solo a usuarios con sesion; el SQL Editor y el servidor (sin auth.uid) pueden corregir datos.
-- Nota de diseno: movement_type 'ajuste' SUMA stock; para restar use 'salida' con origen 'ajuste' o 'vencimiento'.
create or replace function private.guard_inventory_stock()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.current_stock <> 0 then
      raise exception 'El stock inicial se registra como un ingreso en el Kardex, no al crear el insumo';
    end if;
  elsif new.current_stock is distinct from old.current_stock then
    if not exists (
      select 1 from public.inventory_movements m
       where m.item_id = new.id and m.balance_after = new.current_stock and m.created_at = now()
    ) then
      raise exception 'El stock solo cambia registrando un movimiento (register_inventory_movement)';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_inventory_stock() from public, anon, authenticated;
drop trigger if exists inv_items_guard_stock on public.inventory_items;
create trigger inv_items_guard_stock before insert or update of current_stock on public.inventory_items
  for each row execute function private.guard_inventory_stock();
