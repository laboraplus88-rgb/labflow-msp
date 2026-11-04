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

## Creación de personal (nuevo flujo)

### UI
- Formulario en `src/app/admin-lab/components/LabAdminDashboard.tsx`
- Campo **Contraseña** (entre Correo y Rol) con modos:
  - Generar automática (12 chars, mayúscula + minúscula + número + símbolo)
  - Personalizada
  - Botones mostrar/ocultar y copiar
- Validación: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
- Al guardar (crear) llama a la Edge Function `create-staff-user`
- Tras guardar exitoso, muestra la contraseña **una sola vez** para copiarla
- Se eliminó el texto "Primero cree el usuario en Supabase Auth"

### Edge Function
```
supabase/functions/create-staff-user/index.ts
```

Deploy:
```bash
supabase functions deploy create-staff-user --no-verify-jwt
```

La función:
1. Verifica que quien llama sea `jefa` o `superadmin`
2. Crea el usuario en Auth con la contraseña
3. Inserta el perfil ligado al `laboratory_id` / `facility_id` de la jefa
4. Hace rollback (borra el user de Auth) si falla el perfil

### Archivos relacionados
- `src/components/PasswordField.tsx`
- `src/lib/roles.ts`
- `src/schemas/staff.ts`
- `src/actions/create-staff.ts` (alternativa server-action, no usada por el form actual)

## Hecho

- [x] schema.sql + RLS + seed_roles
- [x] Auth (AuthCard + middleware)
- [x] Historial paciente
- [x] Solicitud de examenes
- [x] Workflow (list/update stages)
- [x] Dashboard KPIs
- [x] Creación segura de personal + PasswordField + Edge Function

## Pendiente

1. `npm run build` y corregir errores de tipos si aparecen
2. Deploy de la Edge Function `create-staff-user`
3. Vercel: `SUPABASE_SERVICE_ROLE_KEY` (sin NEXT_PUBLIC_)
4. Probar flujo completo de alta de personal desde Admin laboratorio

## Deploy

Ver DEPLOY.md

## Cuentas seed

jefatura@labflow.msp.gob.ec / <contrasena-segura-propia>
tecnologo@labflow.msp.gob.ec / <contrasena-segura-propia>
muestras@labflow.msp.gob.ec / <contrasena-segura-propia>
medico@labflow.msp.gob.ec / <contrasena-segura-propia>
