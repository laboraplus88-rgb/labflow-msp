# LabFlow — Instrucciones para Claude

## Repo (NO usar lis-laboratorio)

https://github.com/laboraplus88-rgb/labflow-msp

## Hecho (Supabase conectado)

- [x] schema.sql + RLS + seed_roles
- [x] Auth (AuthCard + middleware)
- [x] Historial paciente
- [x] Solicitud de examenes
- [x] Workflow (list/update stages)
- [x] Dashboard KPIs (dashboardStats)

## Pendiente para produccion

1. `npm run build` y corregir errores de tipos/props si aparecen
2. Ejecutar schema en Supabase + crear usuarios + seed_roles
3. Vercel: env NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Graficos secundarios (CollectionCharts, etc.) siguen con datos estaticos opcionales

## Deploy

Ver DEPLOY.md

## Cuentas seed

jefatura@labflow.msp.gob.ec / <contrasena-segura-propia>
tecnologo@labflow.msp.gob.ec / <contrasena-segura-propia>
muestras@labflow.msp.gob.ec / <contrasena-segura-propia>
medico@labflow.msp.gob.ec / <contrasena-segura-propia>
