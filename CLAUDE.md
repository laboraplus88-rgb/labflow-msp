# LabFlow — Instrucciones para Claude

## Repo correcto (NO usar lis-laboratorio)

https://github.com/laboraplus88-rgb/labflow-msp

## Qué es

LabFlow: laboratorio clínico MSP Ecuador (formulario 010A). Next.js 15 + Supabase.

## Archivos clave

| Archivo | Uso |
|---------|-----|
| `supabase/schema.sql` | Tablas + RLS + seeds |
| `supabase/seed_roles.sql` | Roles tras Auth users |
| `DEPLOY.md` | Deploy Vercel + Supabase |
| `src/lib/supabase/api.ts` | API real |
| `src/middleware.ts` | Protege rutas |
| `AuthCard.tsx` | Login Supabase real |
| `PatientHistoryWorkspace.tsx` | Historial con API Supabase |

## Hecho

- [x] Schema + RLS en repo
- [x] Auth real (AuthCard + middleware)
- [x] Historial paciente → `searchPatients` / `getPatientOrders`

## Pendiente

1. Conectar solicitud de exámenes (`createPatient`, `createExamRequest`, `getCatalog`)
2. Conectar workflow (`listTests`, `updateTestStage`)
3. Dashboard KPIs (`dashboardStats`)
4. `npm run build` limpio
5. Deploy según DEPLOY.md

## Cuentas seed

- jefatura@labflow.msp.gob.ec / Lab2026!Jefa
- tecnologo@labflow.msp.gob.ec / Lab2026!Tecn
- muestras@labflow.msp.gob.ec / Lab2026!Toma
- medico@labflow.msp.gob.ec / Lab2026!Medi
