# LabFlow — Instrucciones para Claude

## Repo (NO usar lis-laboratorio)

https://github.com/laboraplus88-rgb/labflow-msp

## Roles del sistema (reales)

```ts
export type AppRole = 'jefa' | 'tecnologo' | 'toma' | 'medico';
```

| Role        | Label                    | Puede crear personal |
|-------------|--------------------------|----------------------|
| `jefa`      | Jefa de Laboratorio      | Sí                   |
| `tecnologo` | Tecnólogo / Técnico      | No                   |
| `toma`      | Toma de Muestras         | No                   |
| `medico`    | Médico / Doctor          | No                   |

El **Doctor** es el rol `medico`.

## Archivos nuevos (creación segura de personal)

- `src/lib/roles.ts` → roles y labels
- `src/schemas/staff.ts` → Zod schema
- `src/components/PasswordField.tsx` → generador + campo de contraseña
- `src/actions/create-staff.ts` → Server Action segura (multi-tenant)

### Puntos de seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo en variables de entorno de Vercel (sin `NEXT_PUBLIC_`)
- El `facility_id` / `laboratory_id` se toma del perfil de la **jefa** que ejecuta la acción, nunca del formulario
- Se recomienda `must_change_password: true` en user_metadata
- Usa el cliente admin ya existente: `src/lib/supabase/admin.ts`

## Hecho (Supabase conectado)

- [x] schema.sql + RLS + seed_roles
- [x] Auth (AuthCard + middleware)
- [x] Historial paciente
- [x] Solicitud de examenes
- [x] Workflow (list/update stages)
- [x] Dashboard KPIs (dashboardStats)
- [x] Creación segura de personal (staff) + PasswordField

## Pendiente para produccion

1. `npm run build` y corregir errores de tipos/props si aparecen
2. Ejecutar schema en Supabase + crear usuarios + seed_roles
3. Vercel: env NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y **SUPABASE_SERVICE_ROLE_KEY**
4. Graficos secundarios (CollectionCharts consiguen datos estaticos opcionales
5. Formulario UI que use PasswordField + createStaffUser (pendiente de conectar en admin-lab)

## Deploy

Ver DEPLOY.md

## Cuentas seed

jefatura@labflow.msp.gob.ec / <contrasena-segura-propia>
tecnologo@labflow.msp.gob.ec / <contrasena-segura-propia>
muestras@labflow.msp.gob.ec / <contrasena-segura-propia>
medico@labflow.msp.gob.ec / <contrasena-segura-propia>
