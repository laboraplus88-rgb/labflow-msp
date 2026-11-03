# LabFlow — Instrucciones para Claude

## Repo (NO usar lis-laboratorio)

https://github.com/laboraplus88-rgb/labflow-msp

## Hecho (Supabase)

- [x] schema.sql + RLS + seed_roles
- [x] Auth real (AuthCard + middleware)
- [x] Historial paciente → searchPatients / getPatientOrders
- [x] Solicitud examenes → createPatient / createExamRequest
- [x] Workflow → listTests / updateTestStage

## Pendiente

1. Dashboard KPIs con dashboardStats()
2. npm run build limpio (ajustar props ExamCatalog si hace falta)
3. Deploy: DEPLOY.md (Supabase + Vercel env vars)

## Cuentas seed

jefatura@labflow.msp.gob.ec / Lab2026!Jefa
tecnologo@labflow.msp.gob.ec / Lab2026!Tecn
muestras@labflow.msp.gob.ec / Lab2026!Toma
medico@labflow.msp.gob.ec / Lab2026!Medi
