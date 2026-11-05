-- Historial de etapas de cada examen (auditoría)
-- Ejecutar en el SQL Editor de Supabase si aún no existe la tabla.

create table if not exists public.test_stage_logs (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  action text not null default 'avance',
  result text,
  result_flag text,
  note text,
  user_id uuid references auth.users(id),
  user_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_stage_logs_test_id on public.test_stage_logs(test_id);
create index if not exists idx_test_stage_logs_created_at on public.test_stage_logs(created_at desc);

alter table public.test_stage_logs enable row level security;

-- Lectura: solo jefa / admin del laboratorio
drop policy if exists "jefa can read stage logs" on public.test_stage_logs;
create policy "jefa can read stage logs"
  on public.test_stage_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'jefa'
    )
  );

-- Inserción: cualquier usuario autenticado del lab (el que hace el cambio)
drop policy if exists "staff can insert stage logs" on public.test_stage_logs;
create policy "staff can insert stage logs"
  on public.test_stage_logs for insert
  to authenticated
  with check (auth.uid() = user_id);
