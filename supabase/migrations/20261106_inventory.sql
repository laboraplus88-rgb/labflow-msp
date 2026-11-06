-- ============================================================
-- Inventario de insumos de laboratorio + Kardex
-- ============================================================

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid references public.laboratories(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null default 'General',
  unit text not null default 'und',
  min_stock numeric(14,3) not null default 0,
  current_stock numeric(14,3) not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, code)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid references public.laboratories(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('ingreso', 'salida', 'ajuste')),
  -- Origen del movimiento
  source text not null check (source in (
    'distrito', 'intercambio', 'donacion', 'compra',
    'consumo', 'vencimiento', 'ajuste', 'otro'
  )),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,4),          -- solo relevante en compra / privado
  total_cost numeric(14,4),
  balance_after numeric(14,3),
  lot_code text,
  expires_at date,
  document_ref text,                -- guía, factura, acta de entrega
  origin_detail text,               -- de quién / de dónde
  received_by_name text,            -- quien recibe (incl. guardia)
  user_id uuid references auth.users(id),
  user_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inv_items_lab on public.inventory_items(laboratory_id);
create index if not exists idx_inv_mov_item on public.inventory_movements(item_id);
create index if not exists idx_inv_mov_lab on public.inventory_movements(laboratory_id);
create index if not exists idx_inv_mov_created on public.inventory_movements(created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Políticas permisivas para autenticados (ajustar por lab si se requiere)
drop policy if exists "auth read inv items" on public.inventory_items;
create policy "auth read inv items" on public.inventory_items for select to authenticated using (true);
drop policy if exists "auth write inv items" on public.inventory_items;
create policy "auth write inv items" on public.inventory_items for all to authenticated using (true) with check (true);

drop policy if exists "auth read inv mov" on public.inventory_movements;
create policy "auth read inv mov" on public.inventory_movements for select to authenticated using (true);
drop policy if exists "auth write inv mov" on public.inventory_movements;
create policy "auth write inv mov" on public.inventory_movements for all to authenticated using (true) with check (true);
