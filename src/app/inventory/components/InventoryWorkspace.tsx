'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package, Plus, ArrowDownToLine, ArrowUpFromLine, Search, AlertTriangle,
  History, Loader2, Boxes,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import {
  CATEGORIES,
  INGRESO_SOURCES,
  SALIDA_SOURCES,
  createInventoryItem,
  listInventoryItems,
  listMovements,
  registerMovement,
  type InventoryItem,
  type InventoryMovement,
  type InvSource,
  type InvMovementType,
} from '@/lib/supabase/inventory';

type Sector = 'publico' | 'privado';

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30';

export default function InventoryWorkspace() {
  const [sector, setSector] = useState<Sector>('publico');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'stock' | 'kardex'>('stock');

  // Modals
  const [showItem, setShowItem] = useState(false);
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [itemForm, setItemForm] = useState({
    code: '', name: '', category: 'Reactivos', unit: 'und', min_stock: '0', notes: '',
  });

  const [movForm, setMovForm] = useState({
    item_id: '',
    source: 'distrito' as InvSource,
    quantity: '',
    unit_cost: '',
    lot_code: '',
    expires_at: '',
    document_ref: '',
    origin_detail: '',
    received_by_name: '',
    notes: '',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: its, error: e1 }, { data: movs, error: e2 }] = await Promise.all([
        listInventoryItems(),
        listMovements(undefined, 150),
      ]);
      if (e1) setError(e1.message);
      else setItems((its as InventoryItem[]) ?? []);
      if (e2) {
        // tabla aún no creada
        if (!e1) setError(e2.message);
      } else {
        setMovements((movs as InventoryMovement[]) ?? []);
      }
    } catch {
      setError('No se pudo cargar el inventario. ¿Ejecutaste el SQL de inventory en Supabase?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  const lowStock = useMemo(
    () => items.filter((i) => Number(i.current_stock) <= Number(i.min_stock)),
    [items]
  );

  const ingresoSources = INGRESO_SOURCES.filter((s) =>
    sector === 'publico' ? s.public : s.private
  );

  const openIngreso = (item?: InventoryItem) => {
    setSelectedItem(item ?? null);
    setMovForm({
      item_id: item?.id ?? '',
      source: sector === 'publico' ? 'distrito' : 'compra',
      quantity: '',
      unit_cost: '',
      lot_code: '',
      expires_at: '',
      document_ref: '',
      origin_detail: '',
      received_by_name: '',
      notes: '',
    });
    setShowIn(true);
  };

  const openSalida = (item?: InventoryItem) => {
    setSelectedItem(item ?? null);
    setMovForm({
      item_id: item?.id ?? '',
      source: 'consumo',
      quantity: '',
      unit_cost: '',
      lot_code: '',
      expires_at: '',
      document_ref: '',
      origin_detail: '',
      received_by_name: '',
      notes: '',
    });
    setShowOut(true);
  };

  const handleCreateItem = async () => {
    if (!itemForm.code.trim() || !itemForm.name.trim()) {
      setToast('Código y nombre son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await createInventoryItem({
        code: itemForm.code,
        name: itemForm.name,
        category: itemForm.category,
        unit: itemForm.unit,
        min_stock: Number(itemForm.min_stock) || 0,
        notes: itemForm.notes,
      });
      if (err) {
        setToast(err.message);
        return;
      }
      setShowItem(false);
      setItemForm({ code: '', name: '', category: 'Reactivos', unit: 'und', min_stock: '0', notes: '' });
      setToast('Insumo registrado en el catálogo');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleMovement = async (type: InvMovementType) => {
    if (!movForm.item_id || !movForm.quantity) {
      setToast('Seleccione insumo y cantidad');
      return;
    }
    if (type === 'ingreso' && !movForm.received_by_name.trim()) {
      setToast('Indique quién recibe el insumo');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await registerMovement({
        item_id: movForm.item_id,
        movement_type: type,
        source: movForm.source,
        quantity: Number(movForm.quantity),
        unit_cost:
          sector === 'privado' && movForm.source === 'compra' && movForm.unit_cost
            ? Number(movForm.unit_cost)
            : movForm.unit_cost
              ? Number(movForm.unit_cost)
              : null,
        lot_code: movForm.lot_code,
        expires_at: movForm.expires_at || undefined,
        document_ref: movForm.document_ref,
        origin_detail: movForm.origin_detail,
        received_by_name: movForm.received_by_name,
        notes: movForm.notes,
      });
      if (err) {
        setToast(err.message);
        return;
      }
      setShowIn(false);
      setShowOut(false);
      setToast(type === 'ingreso' ? 'Ingreso registrado en kardex' : 'Salida registrada en kardex');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel = (s: string) => {
    const all = [...INGRESO_SOURCES, ...SALIDA_SOURCES];
    return all.find((x) => x.value === s)?.label ?? s;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando inventario...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <p className="mt-1 text-xs">
            Ejecuta en Supabase el archivo{' '}
            <code className="rounded bg-muted px-1">supabase/migrations/20261106_inventory.sql</code>
          </p>
          <button type="button" className="mt-1 underline" onClick={reload}>
            Reintentar
          </button>
        </div>
      )}

      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setSector('publico')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sector === 'publico' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Sector público
            </button>
            <button
              type="button"
              onClick={() => setSector('privado')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sector === 'privado' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Sector privado
            </button>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setTab('stock')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === 'stock' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => setTab('kardex')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === 'kardex' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
            >
              Kardex
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowItem(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Nuevo insumo
          </button>
          <button
            type="button"
            onClick={() => openIngreso()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <ArrowDownToLine className="h-4 w-4" /> Registrar ingreso
          </button>
          <button
            type="button"
            onClick={() => openSalida()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <ArrowUpFromLine className="h-4 w-4" /> Registrar salida
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Insumos</p>
          <p className="mt-1 text-2xl font-bold tabular">{items.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Movimientos</p>
          <p className="mt-1 text-2xl font-bold tabular">{movements.length}</p>
        </div>
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-xs font-semibold uppercase text-warning-foreground">Bajo mínimo</p>
          <p className="mt-1 text-2xl font-bold tabular">{lowStock.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Modo</p>
          <p className="mt-1 text-sm font-bold capitalize">{sector === 'publico' ? 'Público (MSP)' : 'Privado'}</p>
        </div>
      </div>

      {tab === 'stock' && (
        <>
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, nombre o categoría…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="Sin insumos"
              description="Registre el catálogo de insumos y luego los ingresos desde distrito, donación, compra o intercambio."
              actionLabel="Nuevo insumo"
              onAction={() => setShowItem(true)}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {['Código', 'Insumo', 'Categoría', 'Stock', 'Mínimo', 'Unidad', ''].map((h) => (
                        <th key={h || 'a'} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const low = Number(item.current_stock) <= Number(item.min_stock);
                      return (
                        <tr key={item.id} className={`border-t border-border hover:bg-primary/5 ${low ? 'bg-warning/5' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{item.code}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold tabular ${low ? 'text-destructive' : 'text-foreground'}`}>
                              {Number(item.current_stock)}
                            </span>
                            {low && (
                              <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />
                            )}
                          </td>
                          <td className="px-4 py-3 tabular text-muted-foreground">{Number(item.min_stock)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openIngreso(item)}
                                className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                              >
                                Ingreso
                              </button>
                              <button
                                type="button"
                                onClick={() => openSalida(item)}
                                className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                              >
                                Salida
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'kardex' && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Kardex de movimientos</h3>
          </div>
          {movements.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Aún no hay movimientos. Registre un ingreso o una salida.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {['Fecha', 'Insumo', 'Tipo', 'Origen', 'Cant.', 'Saldo', 'Doc.', 'Recibe', 'Usuario'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('es-EC')}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{m.inventory_items?.name ?? '—'}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{m.inventory_items?.code}</p>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={m.movement_type === 'ingreso' ? 'success' : m.movement_type === 'salida' ? 'warning' : 'info'}>
                          {m.movement_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{sourceLabel(m.source)}</td>
                      <td className="px-3 py-2 font-bold tabular text-foreground">
                        {m.movement_type === 'salida' ? '−' : '+'}{Number(m.quantity)}
                      </td>
                      <td className="px-3 py-2 tabular text-muted-foreground">{m.balance_after ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{m.document_ref || '—'}</td>
                      <td className="px-3 py-2 text-xs text-foreground">{m.received_by_name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{m.user_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal nuevo insumo */}
      <Modal
        open={showItem}
        onClose={() => setShowItem(false)}
        title="Nuevo insumo"
        width="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setShowItem(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancelar
            </button>
            <button type="button" onClick={handleCreateItem} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Código *</label>
            <input className={inputCls} value={itemForm.code} onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })} placeholder="REA-001" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Unidad</label>
            <input className={inputCls} value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="und, ml, kit…" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nombre *</label>
            <input className={inputCls} value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Categoría</label>
            <select className={inputCls} value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Stock mínimo</label>
            <input type="number" className={inputCls} value={itemForm.min_stock} onChange={(e) => setItemForm({ ...itemForm, min_stock: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Modal ingreso */}
      <Modal
        open={showIn}
        onClose={() => setShowIn(false)}
        title="Registrar ingreso"
        width="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setShowIn(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button type="button" onClick={() => handleMovement('ingreso')} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? 'Guardando…' : 'Registrar ingreso'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Insumo *</label>
            <select className={inputCls} value={movForm.item_id} onChange={(e) => setMovForm({ ...movForm, item_id: e.target.value })}>
              <option value="">Seleccione…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.name} (stock {Number(i.current_stock)})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Origen *</label>
              <select className={inputCls} value={movForm.source} onChange={(e) => setMovForm({ ...movForm, source: e.target.value as InvSource })}>
                {ingresoSources.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cantidad *</label>
              <input type="number" min="0" step="any" className={inputCls} value={movForm.quantity} onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })} />
            </div>
          </div>
          {(sector === 'privado' || movForm.source === 'compra') && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Costo unitario {sector === 'privado' ? '(privado)' : '(opcional)'}
              </label>
              <input type="number" min="0" step="0.01" className={inputCls} value={movForm.unit_cost} onChange={(e) => setMovForm({ ...movForm, unit_cost: e.target.value })} placeholder="0.00" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nº documento / guía</label>
              <input className={inputCls} value={movForm.document_ref} onChange={(e) => setMovForm({ ...movForm, document_ref: e.target.value })} placeholder="Guía, factura, acta…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Lote</label>
              <input className={inputCls} value={movForm.lot_code} onChange={(e) => setMovForm({ ...movForm, lot_code: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Vencimiento</label>
              <input type="date" className={inputCls} value={movForm.expires_at} onChange={(e) => setMovForm({ ...movForm, expires_at: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Procedencia / de quién</label>
              <input className={inputCls} value={movForm.origin_detail} onChange={(e) => setMovForm({ ...movForm, origin_detail: e.target.value })} placeholder="Distrito, lab, proveedor…" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Quién recibe *</label>
            <input className={inputCls} value={movForm.received_by_name} onChange={(e) => setMovForm({ ...movForm, received_by_name: e.target.value })} placeholder="Nombre de quien recibe (incl. guardia)" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Notas</label>
            <input className={inputCls} value={movForm.notes} onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Modal salida */}
      <Modal
        open={showOut}
        onClose={() => setShowOut(false)}
        title="Registrar salida / consumo"
        width="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setShowOut(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button type="button" onClick={() => handleMovement('salida')} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? 'Guardando…' : 'Registrar salida'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Insumo *</label>
            <select className={inputCls} value={movForm.item_id} onChange={(e) => setMovForm({ ...movForm, item_id: e.target.value })}>
              <option value="">Seleccione…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.name} (stock {Number(i.current_stock)})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Motivo *</label>
              <select className={inputCls} value={movForm.source} onChange={(e) => setMovForm({ ...movForm, source: e.target.value as InvSource })}>
                {SALIDA_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cantidad *</label>
              <input type="number" min="0" step="any" className={inputCls} value={movForm.quantity} onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Notas</label>
            <input className={inputCls} value={movForm.notes} onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })} placeholder="Área, examen, observación…" />
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
