import { createClient } from './client';
import { getMyLaboratory, getProfile, getSessionUser } from './api';

export type InvSource =
  | 'distrito'
  | 'intercambio'
  | 'donacion'
  | 'compra'
  | 'consumo'
  | 'vencimiento'
  | 'ajuste'
  | 'otro';

export type InvMovementType = 'ingreso' | 'salida' | 'ajuste';

export type InventoryItem = {
  id: string;
  laboratory_id: string | null;
  code: string;
  name: string;
  category: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type InventoryMovement = {
  id: string;
  laboratory_id: string | null;
  item_id: string;
  movement_type: InvMovementType;
  source: InvSource;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  balance_after: number | null;
  lot_code: string | null;
  expires_at: string | null;
  document_ref: string | null;
  origin_detail: string | null;
  received_by_name: string | null;
  user_id: string | null;
  user_name: string | null;
  notes: string | null;
  created_at: string;
  inventory_items?: { code: string; name: string; unit: string } | null;
};

export const INGRESO_SOURCES: { value: InvSource; label: string; public: boolean; private: boolean }[] = [
  { value: 'distrito', label: 'Distrito / MSP', public: true, private: false },
  { value: 'intercambio', label: 'Intercambio entre unidades', public: true, private: true },
  { value: 'donacion', label: 'Donación', public: true, private: true },
  { value: 'compra', label: 'Compra', public: true, private: true },
  { value: 'otro', label: 'Otro', public: true, private: true },
];

export const SALIDA_SOURCES: { value: InvSource; label: string }[] = [
  { value: 'consumo', label: 'Consumo / uso en análisis' },
  { value: 'vencimiento', label: 'Baja por vencimiento' },
  { value: 'intercambio', label: 'Cedido / intercambio' },
  { value: 'ajuste', label: 'Ajuste de inventario' },
  { value: 'otro', label: 'Otro' },
];

export const CATEGORIES = [
  'Reactivos',
  'Tubos y tubos vacutainer',
  'Agujas y lancetas',
  'Material de toma',
  'Medios de cultivo',
  'Controles y calibradores',
  'Equipos / consumibles',
  'Papelería / etiquetas',
  'Limpieza y bioseguridad',
  'General',
];

export async function listInventoryItems() {
  const supabase = createClient() as any;
  const lab = await getMyLaboratory();
  let q = supabase
    .from('inventory_items')
    .select('*')
    .eq('active', true)
    .order('name');
  if (lab?.id) q = q.eq('laboratory_id', lab.id);
  return q;
}

export async function createInventoryItem(payload: {
  code: string;
  name: string;
  category: string;
  unit: string;
  min_stock?: number;
  notes?: string;
}) {
  const supabase = createClient() as any;
  const lab = await getMyLaboratory();
  return supabase
    .from('inventory_items')
    .insert({
      laboratory_id: lab?.id ?? null,
      code: payload.code.trim(),
      name: payload.name.trim(),
      category: payload.category,
      unit: payload.unit.trim() || 'und',
      min_stock: payload.min_stock ?? 0,
      current_stock: 0,
      notes: payload.notes || null,
    })
    .select()
    .single();
}

export async function listMovements(itemId?: string, limit = 100) {
  const supabase = createClient() as any;
  const lab = await getMyLaboratory();
  let q = supabase
    .from('inventory_movements')
    .select('*, inventory_items(code, name, unit)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (lab?.id) q = q.eq('laboratory_id', lab.id);
  if (itemId) q = q.eq('item_id', itemId);
  return q;
}

export async function registerMovement(payload: {
  item_id: string;
  movement_type: InvMovementType;
  source: InvSource;
  quantity: number;
  unit_cost?: number | null;
  lot_code?: string;
  expires_at?: string;
  document_ref?: string;
  origin_detail?: string;
  received_by_name?: string;
  notes?: string;
}) {
  const supabase = createClient() as any;
  const lab = await getMyLaboratory();
  const user = await getSessionUser();
  const profile = await getProfile();

  const { data: item, error: itemErr } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', payload.item_id)
    .single();

  if (itemErr || !item) return { data: null, error: itemErr ?? new Error('Insumo no encontrado') };

  const qty = Number(payload.quantity);
  if (!qty || qty <= 0) return { data: null, error: new Error('La cantidad debe ser mayor a 0') };

  let newStock = Number(item.current_stock) || 0;
  if (payload.movement_type === 'ingreso') {
    newStock += qty;
  } else if (payload.movement_type === 'salida') {
    if (qty > newStock) return { data: null, error: new Error('Stock insuficiente') };
    newStock -= qty;
  } else {
    // ajuste: quantity es el nuevo saldo absoluto si source=ajuste con nota, o delta
    // Aquí tratamos ajuste como delta positivo (ingreso) o usamos source
    newStock += qty; // se puede usar salida+ajuste por separado
  }

  const unitCost = payload.unit_cost != null && payload.unit_cost !== undefined ? Number(payload.unit_cost) : null;
  const totalCost = unitCost != null ? unitCost * qty : null;

  const { data: mov, error: movErr } = await supabase
    .from('inventory_movements')
    .insert({
      laboratory_id: lab?.id ?? item.laboratory_id,
      item_id: payload.item_id,
      movement_type: payload.movement_type,
      source: payload.source,
      quantity: qty,
      unit_cost: unitCost,
      total_cost: totalCost,
      balance_after: newStock,
      lot_code: payload.lot_code || null,
      expires_at: payload.expires_at || null,
      document_ref: payload.document_ref || null,
      origin_detail: payload.origin_detail || null,
      received_by_name: payload.received_by_name || null,
      user_id: user?.id ?? null,
      user_name: (profile as any)?.full_name ?? user?.email ?? 'Usuario',
      notes: payload.notes || null,
    })
    .select()
    .single();

  if (movErr) return { data: null, error: movErr };

  const { error: upErr } = await supabase
    .from('inventory_items')
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', payload.item_id);

  if (upErr) return { data: mov, error: upErr };
  return { data: mov, error: null };
}
