# LabFlow — Deploy (Vercel + Supabase)

## Vercel

1. Import repo: `laboraplus88-rgb/labflow-msp`
2. Framework: Next.js
3. Env vars (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy from branch `main`

**Build note:** `tailwind.config.ts` uses `plugins: []` (no optional plugins).
Latest fix commits must be on Production, not old `f2e412d`.

## Supabase SQL order

1. `supabase/schema.sql`
2. Create Auth users
3. `supabase/seed_roles.sql`
4. `supabase/03_rpc_roles_rls.sql`
5. `supabase/04_multitenant.sql`

## Auth URLs

Site URL + Redirect: your `*.vercel.app` URL

## Verify

Login with seed users (see `supabase/ROLES.md`).
