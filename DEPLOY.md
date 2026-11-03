# LabFlow — Deploy (GitHub + Supabase + Vercel)

## 1. GitHub

Repo oficial: https://github.com/laboraplus88-rgb/labflow-msp

## 2. Supabase

1. Crear proyecto en https://supabase.com
2. SQL Editor → pegar y ejecutar **`supabase/schema.sql`**
3. Authentication → Users → Add user:

| Email | Password |
|-------|----------|
| jefatura@labflow.msp.gob.ec | Lab2026!Jefa |
| tecnologo@labflow.msp.gob.ec | Lab2026!Tecn |
| muestras@labflow.msp.gob.ec | Lab2026!Toma |
| medico@labflow.msp.gob.ec | Lab2026!Medi |

4. SQL Editor → ejecutar **`supabase/seed_roles.sql`**
5. Project Settings → API → copiar:
   - Project URL
   - anon public key

## 3. Variables de entorno

Local (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Vercel → Project → Settings → Environment Variables: las mismas dos.

## 4. Vercel

1. New Project → import `laboraplus88-rgb/labflow-msp`
2. Framework: Next.js (auto)
3. Añadir env vars del paso 3
4. Deploy

## 5. Verificación

- Abrir URL de Vercel
- Login con una cuenta del paso 2
- Middleware redirige a login si no hay sesión

## Notas

- UI aún puede usar `labData.ts` en algunas pantallas; la API real está en `src/lib/supabase/api.ts`
- Auth ya usa Supabase (`AuthCard` + middleware)
