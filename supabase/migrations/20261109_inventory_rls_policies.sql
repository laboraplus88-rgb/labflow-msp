-- ============================================================
-- LabFlow — RLS inventario (inventory_items + inventory_movements)
-- Fecha: 2026-11-09
-- Orden: después de 04_multitenant + 05_seguridad_multitenant
--          y de 20261106_inventory.sql (tablas + RPC)
--
-- Idempotente: se puede re-ejecutar.
-- NO usa using (true).
-- ============================================================

-- Asegurar RLS activo
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Forzar RLS también para el table owner (recomendado en Supabase)
alter table public.inventory_items force row level security;
alter table public.inventory_movements force row level security;

-- ============================================================
-- inventory_items
-- Lectura: jefa | tecnologo | toma  (mismo lab)
-- Alta/edición: jefa | tecnologo
-- Superadmin: sin acceso clínico de inventario (solo opera labs vía admin)
-- ============================================================

drop policy if exists inv_items_select on public.inventory_items;
drop policy if exists inv_items_insert on public.inventory_items;
drop policy if exists inv_items_update on public.inventory_items;
drop policy if exists inv_items_delete on public.inventory_items;

create policy inv_items_select on public.inventory_items
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy inv_items_insert on public.inventory_items
  for insert to authenticated
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

create policy inv_items_update on public.inventory_items
  for update to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  )
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

-- Borrado físico desaconsejado: preferir active = false vía update.
-- Solo jefa puede borrar si hace falta limpieza.
create policy inv_items_delete on public.inventory_items
  for delete to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) = 'jefa'
  );

-- ============================================================
-- inventory_movements (kardex)
-- Lectura: jefa | tecnologo | toma
-- Insert: jefa | tecnologo  (o vía RPC register_inventory_movement)
-- Sin UPDATE / DELETE (inmutabilidad del kardex)
-- ============================================================

drop policy if exists inv_mov_select on public.inventory_movements;
drop policy if exists inv_mov_insert on public.inventory_movements;
drop policy if exists inv_mov_update on public.inventory_movements;
drop policy if exists inv_mov_delete on public.inventory_movements;

create policy inv_mov_select on public.inventory_movements
  for select to authenticated
  using (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo', 'toma')
  );

create policy inv_mov_insert on public.inventory_movements
  for insert to authenticated
  with check (
    laboratory_id = (select private.my_laboratory_id())
    and (select private.current_app_role()) in ('jefa', 'tecnologo')
  );

-- Sin policy de update/delete → nadie puede alterar ni borrar movimientos
-- (ni siquiera jefa), salvo service_role en SQL Editor.

-- ============================================================
-- RPC: asegurar isolation también si alguien llama la función
-- (security invoker respeta RLS; reafirmamos grant)
-- ============================================================

grant execute on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) to authenticated;

revoke execute on function public.register_inventory_movement(
  uuid, text, text, numeric, numeric, text, date, text, text, text, text
) from public, anon;

-- ============================================================
-- Verificación rápida (ejecutar aparte en SQL Editor):
--
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where tablename in ('inventory_items', 'inventory_movements')
-- order by tablename, policyname;
--
-- No debe aparecer qual = 'true' ni with_check = 'true'.
-- ============================================================
