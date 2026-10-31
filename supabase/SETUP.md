# LabFlow — Puesta en marcha funcional (sin demo mock)

## 1. Proyecto Supabase

1. Crea proyecto en https://supabase.com
2. SQL Editor → pega y ejecuta **`supabase/schema.sql`** (archivo local en el repo / clone)
3. Authentication → Users → Add user (x4):

| Email | Password |
|-------|----------|
| jefatura@labflow.msp.gob.ec | Lab2026!Jefa |
| tecnologo@labflow.msp.gob.ec | Lab2026!Tecn |
| muestras@labflow.msp.gob.ec | Lab2026!Toma |
| medico@labflow.msp.gob.ec | Lab2026!Medi |

4. SQL Editor → ejecuta **`supabase/seed_roles.sql`**

## 2. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena desde Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. App local

```bash
npm install
npm run dev
```

Login con cualquiera de las 4 cuentas. El middleware protege rutas.

## 4. API real (`src/lib/supabase/api.ts`)

- `signIn` / `signUp` / `signOut`
- `searchPatients` / `createPatient`
- `createExamRequest` (crea request + samples + tests)
- `listTests` / `updateTestStage`
- `getPatientOrders` / `dashboardStats`

Conecta los componentes de UI a estas funciones (reemplazo de labData mock).

## 5. Vercel

Importa el repo, añade las mismas env vars, deploy.
