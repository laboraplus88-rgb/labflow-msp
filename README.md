# LabFlow MSP Ecuador

Sistema de gestión de laboratorio clínico (C.S. El Paraíso / MSP Ecuador).

**URL del repo:** https://github.com/laboraplus88-rgb/labflow-msp

> Si ves este README, el repositorio **no está vacío**. Hay ~80 archivos de código fuente.

## Estructura del código

```
src/app/page.tsx                          → Dashboard estadísticas
src/app/exam-request-sample-collection/   → Solicitud 010A + etiquetas
src/app/test-processing-workflow/         → Workflow de exámenes
src/app/patient-history/                  → Historial por paciente
src/app/sign-up-login-screen/             → Login / registro
src/components/                           → Sidebar, Topbar, UI
src/lib/labData.ts                        → Datos auxiliares
src/lib/supabase/                         → Integración Supabase real
  client.ts | server.ts | middleware.ts | api.ts | database.types.ts
supabase/schema.sql                       → SQL completo (tablas + RLS + seed)
supabase/seed_roles.sql
supabase/SETUP.md
```

## Setup

1. Ejecutar `supabase/schema.sql` en SQL Editor de Supabase
2. Crear usuarios en Auth (ver SETUP.md)
3. Ejecutar `supabase/seed_roles.sql`
4. `.env.local` desde `.env.example`
5. `npm install && npm run dev` → http://localhost:4028

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind · Supabase · Recharts

## Cuentas

| Rol | Correo | Password |
|-----|--------|----------|
| Jefa | jefatura@labflow.msp.gob.ec | <contrasena-segura-propia> |
| Tecnólogo | tecnologo@labflow.msp.gob.ec | <contrasena-segura-propia> |
| Toma | muestras@labflow.msp.gob.ec | <contrasena-segura-propia> |
| Médico | medico@labflow.msp.gob.ec | <contrasena-segura-propia> |
