# LabFlow — Roles, RLS y RPCs

## Roles (`profiles.role`)

| Rol | Código | Puede |
|-----|--------|-------|
| Jefa de laboratorio | `jefa` | Todo: validar, facilities, catalog, KPIs globales |
| Bioquímico / Tecnólogo | `tecnologo` | Procesar, ingresar resultados, validar |
| Toma de muestras | `toma` | Solo etapas tempranas (Solicitado → Recibida) |
| Médico solicitante | `medico` | Crear órdenes propias, ver sus pacientes/resultados |

## Helpers (schema `private`)

- `private.current_app_role()`
- `private.is_lab_staff()`
- `private.is_jefa_or_tecnologo()`
- `private.can_validate_results()`
- `private.can_collect_samples()`

## RPCs públicas

| RPC | Uso |
|-----|-----|
| `my_role()` | Rol del usuario logueado |
| `dashboard_stats()` | KPIs filtrados por rol (médico vs lab) |
| `create_exam_order(...)` | Orden atómica + samples + tests |
| `advance_test_stage(...)` | Cambia etapa validando permisos de rol |

## Orden de ejecución SQL

1. `supabase/schema.sql`
2. Crear usuarios en Auth
3. `supabase/seed_roles.sql`
4. `supabase/03_rpc_roles_rls.sql`

## Cuentas seed

| Email | Password | Rol |
|-------|----------|-----|
| jefatura@labflow.msp.gob.ec | Lab2026!Jefa | jefa |
| tecnologo@labflow.msp.gob.ec | Lab2026!Tecn | tecnologo |
| muestras@labflow.msp.gob.ec | Lab2026!Toma | toma |
| medico@labflow.msp.gob.ec | Lab2026!Medi | medico |
