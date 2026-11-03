# LabFlow — Instrucciones para Claude

## Repo correcto (NO usar lis-laboratorio)

https://github.com/laboraplus88-rgb/labflow-msp

## Qué es

LabFlow: laboratorio clínico MSP Ecuador (formulario 010A). Next.js 15 + Supabase.

## Archivos clave

| Archivo | Uso |
|---------|-----|
| `supabase/schema.sql` | Tablas + RLS + seeds facilities/catalog |
| `supabase/seed_roles.sql` | Roles tras crear users en Auth |
| `supabase/SETUP.md` | Setup corto |
| `DEPLOY.md` | Deploy Vercel + Supabase |
| `src/lib/supabase/api.ts` | API real (pacientes, ordenes, tests) |
| `src/lib/supabase/client.ts` | Browser client |
| `src/middleware.ts` | Protege rutas |
| `src/app/page.tsx` | Dashboard |

## Tareas pendientes (prioridad)

1. Conectar pantallas a `api.ts` (quitar dependencia de mocks en `labData.ts` donde aplique):
   - patient-history
   - exam-request-sample-collection
   - test-processing-workflow
   - dashboard stats
2. `npm run build` sin errores
3. Deploy: seguir `DEPLOY.md`

## Cuentas seed

- jefatura@labflow.msp.gob.ec / Lab2026!Jefa (rol jefa)
- tecnologo@labflow.msp.gob.ec / Lab2026!Tecn
- muestras@labflow.msp.gob.ec / Lab2026!Toma
- medico@labflow.msp.gob.ec / Lab2026!Medi
