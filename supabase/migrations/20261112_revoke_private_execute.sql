-- ============================================================
-- LabFlow — Defensa en profundidad: REVOKE en schema private
-- Fecha: 2026-11-12
-- Seguro de re-ejecutar.
-- No cambia lógica de negocio; solo privilegios por defecto.
-- ============================================================

-- Quitar EXECUTE por defecto a PUBLIC y anon en todas las funciones private
do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      r.nspname, r.proname, r.args
    );
  end loop;
end $$;

-- Reafirmar que authenticated puede usar los helpers que la app/RLS necesitan
-- (si alguna policy o RPC las invoca vía SQL del rol authenticated)
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_lab_staff() to authenticated;
grant execute on function private.is_jefa_or_tecnologo() to authenticated;
grant execute on function private.is_jefa() to authenticated;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'is_medico'
  ) then
    grant execute on function private.is_medico() to authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'can_validate_results'
  ) then
    grant execute on function private.can_validate_results() to authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'can_collect_samples'
  ) then
    grant execute on function private.can_collect_samples() to authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'is_superadmin'
  ) then
    grant execute on function private.is_superadmin() to authenticated;
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'my_laboratory_id'
  ) then
    grant execute on function private.my_laboratory_id() to authenticated;
  end if;
end $$;

-- Opcional: eliminar RPC peligrosa si existe (password en texto plano por SQL)
-- Descomentar solo cuando la app ya use solo ruta servidor / Admin API:
-- drop function if exists public.create_lab_user cascade;

notify pgrst, 'reload schema';
