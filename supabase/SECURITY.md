# LabFlow — Modelo de seguridad (corregido)

Documento de referencia. Sustituye descripciones anteriores imprecisas
(Edge Functions como camino principal, «todo pasa por RPC», FORCE en todas las tablas).

## Capas reales (de fuera hacia dentro)

| Capa | Qué es | Qué NO es |
|------|--------|-----------|
| Middleware Next.js | UX: redirige por sesión/rol/lab | **No es seguridad de datos** |
| Rutas de servidor Next (`service_role`) | Crear lab/personal con Admin API | No exponer la clave al browser |
| RPCs (`security definer` o `invoker`) | Reglas de negocio en operaciones puntuales | No cubren todo el CRUD |
| RLS (Row Level Security) | Aislamiento multi-tenant en tablas | |
| Triggers | Impiden falsificar rol, lab, bitácora, kardex | |

La **seguridad de datos** es: **RLS + triggers (+ validación dentro de RPC cuando aplica)**.

## Cómo se escribe cada dominio

| Dominio | Escritura | Protección |
|---------|-----------|------------|
| Pacientes, órdenes, muestras, tests (flujo clínico básico) | **Directo a tablas** desde la app | RLS (+ policies por rol) |
| Facturación (`invoices`, items, payments) | **Solo RPC** (`billing_*`) | Permisos de tabla revocados + RPC definer |
| Agenda | RPC create/cancel/reschedule + update de estado | RLS (FORCE en producción ronda 8) |
| Inventario | RPC `register_inventory_movement` para kardex | RLS por lab; policies en migration dedicada |
| Personal / labs | Ruta servidor Next + RPC `assign_staff_*` / `create_lab_admin` | service_role solo en servidor |

## FORCE RLS

- **FORCE** está (o debe estar) en tablas de **facturación y agenda** tras el hardening.
- En el resto: RLS **normal** (ENABLE). Eso ya aplica a roles de la API (`authenticated` / `anon`).
- FORCE añade restricción también al dueño de la tabla; no es el único mecanismo de aislamiento.

## Funciones `private.*`

- No están expuestas por la API REST de PostgREST como schema público.
- Aun así, el privilegio por defecto `EXECUTE` para `PUBLIC` puede figurar como `anon=true` en catálogos.
- **Defensa en profundidad:** ejecutar `20261112_revoke_private_execute.sql` para `REVOKE EXECUTE ... FROM PUBLIC, anon`.

## Triggers (capa que no debe olvidarse)

Ejemplos esperados en producción:

- `protect_profile_fields` — no cambiarse rol / lab / email / active sin autoridad
- `protect_lab_fields` (si existe) — campos sensibles de laboratorio
- Bitácora de etapas de tests
- Sello / inmutabilidad de movimientos de kardex (sin UPDATE/DELETE de movimientos)

Aunque la sesión sea válida, el trigger puede rechazar el cambio.

## Creación de usuarios — qué usar y qué evitar

| Método | Estado |
|--------|--------|
| Ruta de servidor Next + `auth.admin.createUser` (`service_role`) | **Preferido** |
| Edge Function `create-staff-user` (existe en repo; puede no ser el camino activo en prod) | Alternativa; no asumir que está desplegada |
| RPC SQL `create_lab_user(... password ...)` | **Evitar / eliminar**: password en texto plano puede quedar en logs de Postgres |

Si existe `create_lab_user` en la base:

```sql
-- Solo tras confirmar que la app ya no la llama
drop function if exists public.create_lab_user cascade;
```

Cualquier patrón `set_config('app.trusted_rpc', ...)` para saltar triggers es **frágil**; no ampliarlo.

## Inventario

La RPC canónica en el repo es:

`public.register_inventory_movement(...)`

Archivos:

- `migrations/20261106_inventory.sql` — tablas + RPC
- `migrations/20261109_inventory_rls_policies.sql` — policies por lab
- `migrations/20261112_inventory_rpc_ensure.sql` — asegura RPC + grants (idempotente)

Si en producción **no** aparece la función, aplicar esos SQL (revisados) en orden.

## Checklist de verificación rápida

```sql
-- 1) Ninguna RPC pública ejecutable por anon (ideal)
select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1;

-- 2) private sin execute para public/anon
select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
order by 1;

-- 3) Inventario
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname like '%inventory%';
```
