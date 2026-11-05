'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Search, UserRound, CalendarDays, FlaskConical, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Stethoscope, Plus, Loader2,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import { searchPatients, getPatientOrders, createPatient } from '@/lib/supabase/api';

type PatientRow = {
  id: string;
  historia: string | null;
  cedula: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  primer_nombre: string;
  segundo_nombre: string | null;
  edad: number | null;
  sexo: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
};

type TestRow = {
  id: string;
  exam_name: string;
  category: string;
  result: string | null;
  result_unit: string | null;
  result_range: string | null;
  result_flag: string | null;
  stage: string;
  validated_at: string | null;
};

type OrderRow = {
  id: string;
  code: string;
  order_type: string;
  priority: string;
  status: string;
  diagnosis: string | null;
  created_at: string;
  tests: TestRow[] | null;
  facilities: { name: string } | null;
};

const FLAG_STYLE: Record<string, string> = {
  normal: 'bg-success/15 text-success',
  alto: 'bg-destructive/15 text-destructive',
  bajo: 'bg-warning/20 text-warning-foreground',
  critico: 'bg-destructive text-destructive-foreground font-bold',
};

function fullName(p: PatientRow) {
  return [p.apellido_paterno, p.apellido_materno, p.primer_nombre, p.segundo_nombre]
    .filter(Boolean)
    .join(' ');
}

function priorityTone(p: string): 'danger' | 'warning' | 'info' | 'neutral' {
  if (p === 'Urgente') return 'danger';
  if (p === 'Control') return 'warning';
  return 'info';
}

function orderTone(o: string): 'danger' | 'info' | 'neutral' {
  if (o === 'Emergencia') return 'danger';
  return 'info';
}

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30';

export default function PatientHistoryWorkspace() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientRow[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Nuevo paciente modal
  const [showNuevo, setShowNuevo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    historia: '',
    cedula: '',
    apellido_paterno: '',
    apellido_materno: '',
    primer_nombre: '',
    segundo_nombre: '',
    edad: '',
    sexo: '' as '' | 'F' | 'M',
    provincia: '',
    canton: '',
    parroquia: '',
  });

  const runSearch = useCallback(async (q: string) => {
    setLoadingSearch(true);
    setError('');
    try {
      const { data, error: err } = await searchPatients(q);
      if (err) {
        setError(err.message);
        setResults([]);
      } else {
        setResults((data as PatientRow[]) ?? []);
      }
    } catch {
      setError('No se pudo conectar con Supabase. Revisa .env.local');
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const selectPatient = async (p: PatientRow) => {
    setSelected(p);
    setExpandedOrder(null);
    setLoadingOrders(true);
    setError('');
    try {
      const { data, error: err } = await getPatientOrders(p.id);
      if (err) {
        setError(err.message);
        setOrders([]);
      } else {
        setOrders((data as OrderRow[]) ?? []);
      }
    } catch {
      setError('Error al cargar ordenes');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreatePatient = async () => {
    setFormError('');
    if (!form.cedula.trim() || !form.apellido_paterno.trim() || !form.primer_nombre.trim()) {
      setFormError('Cédula, apellido paterno y primer nombre son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const { data, error: err } = await createPatient({
        historia: form.historia.trim() || undefined,
        cedula: form.cedula.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || undefined,
        primer_nombre: form.primer_nombre.trim(),
        segundo_nombre: form.segundo_nombre.trim() || undefined,
        edad: form.edad ? Number(form.edad) : undefined,
        sexo: form.sexo || undefined,
        provincia: form.provincia.trim() || undefined,
        canton: form.canton.trim() || undefined,
        parroquia: form.parroquia.trim() || undefined,
      });
      if (err) {
        setFormError(err.message);
        return;
      }
      // Cerrar modal y seleccionar el paciente recién creado
      setShowNuevo(false);
      setForm({
        historia: '', cedula: '', apellido_paterno: '', apellido_materno: '',
        primer_nombre: '', segundo_nombre: '', edad: '', sexo: '', provincia: '', canton: '', parroquia: '',
      });
      if (data) {
        await selectPatient(data as PatientRow);
        setQuery(data.cedula);
      }
    } catch {
      setFormError('Error al guardar el paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">Buscar paciente</h2>
              <p className="text-xs text-muted-foreground">Nombre, cedula o historia clinica</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowNuevo(true); setFormError(''); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo
            </button>
          </div>
        </header>
        <div className="p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. Rodriguez o 0712345678"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              autoFocus
            />
          </label>

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto">
            {loadingSearch ? (
              <li className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </li>
            ) : results.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                {query ? 'Ningun paciente coincide' : 'Escriba para buscar o deje vacio para ver recientes'}
              </li>
            ) : (
              results.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectPatient(p)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                        active ? 'bg-primary/10 border border-primary' : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac text-xs font-bold text-lilac-foreground">
                        {(p.primer_nombre?.[0] || '?')}{(p.apellido_paterno?.[0] || '')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{fullName(p)}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">CI {p.cedula}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.edad != null ? `${p.edad} anos` : '—'} · {p.sexo === 'F' ? 'Mujer' : p.sexo === 'M' ? 'Hombre' : '—'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      <div className="min-w-0 space-y-5">
        {!selected ? (
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title="Seleccione un paciente"
            description="Busque por nombre o cedula para ver el historial de examenes y resultados de laboratorio."
          />
        ) : (
          <>
            <article className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                    {(selected.primer_nombre?.[0] || '?')}{(selected.apellido_paterno?.[0] || '')}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{fullName(selected)}</h2>
                    <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                      CI {selected.cedula}
                      {selected.historia ? ` · HC ${selected.historia}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.edad != null ? `${selected.edad} anos` : '—'}{' '}·{' '}
                      {selected.sexo === 'F' ? 'Mujer' : selected.sexo === 'M' ? 'Hombre' : '—'}
                      {selected.parroquia ? ` · ${selected.parroquia}` : ''}
                      {selected.canton ? `, ${selected.canton}` : ''}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/exam-request-sample-collection?cedula=${encodeURIComponent(selected.cedula)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Nueva solicitud
                </Link>
              </div>
            </article>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Historial de ordenes y resultados
              </h3>

              {loadingOrders ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Cargando ordenes...
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={<FlaskConical className="h-6 w-6" />}
                  title="Sin ordenes"
                  description="Este paciente aun no tiene solicitudes de laboratorio registradas."
                />
              ) : (
                orders.map((order) => {
                  const open = expandedOrder === order.id;
                  const tests = order.tests ?? [];
                  const date = new Date(order.created_at);
                  const dd = String(date.getDate()).padStart(2, '0');
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  return (
                    <article key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <button
                        type="button"
                        onClick={() => setExpandedOrder(open ? null : order.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">{mm}</span>
                          <span className="text-sm font-bold text-foreground">{dd}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-primary">{order.code}</span>
                            <Badge tone={orderTone(order.order_type)}>{order.order_type}</Badge>
                            <Badge tone={priorityTone(order.priority)} dot>{order.priority}</Badge>
                            <Badge tone={order.status === 'entregada' ? 'success' : 'info'}>{order.status}</Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            <Stethoscope className="mr-1 inline h-3.5 w-3.5" />
                            {order.facilities?.name ?? '—'} · {date.toLocaleString('es-EC')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{tests.length}</span> resultados
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>

                      {open && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3">
                          {tests.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados registrados aun.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="pb-2 pr-3">Examen</th>
                                    <th className="pb-2 pr-3">Resultado</th>
                                    <th className="pb-2 pr-3">Referencia</th>
                                    <th className="pb-2 pr-3">Estado</th>
                                    <th className="pb-2">Validado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tests.map((r) => (
                                    <tr key={r.id} className="border-t border-border/60">
                                      <td className="py-2.5 pr-3">
                                        <p className="font-medium text-foreground">{r.exam_name}</p>
                                        <p className="text-[11px] text-muted-foreground">{r.category}</p>
                                      </td>
                                      <td className="py-2.5 pr-3">
                                        <span className="text-base font-bold text-foreground">{r.result ?? '—'}</span>
                                        {r.result_unit && (
                                          <span className="ml-1 text-xs text-muted-foreground">{r.result_unit}</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 pr-3 text-muted-foreground">{r.result_range ?? '—'}</td>
                                      <td className="py-2.5 pr-3">
                                        {r.result_flag ? (
                                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${FLAG_STYLE[r.result_flag] ?? ''}`}>
                                            {r.result_flag === 'critico' && <AlertTriangle className="h-3 w-3" />}
                                            {r.result_flag === 'normal' && <CheckCircle2 className="h-3 w-3" />}
                                            {r.result_flag}
                                          </span>
                                        ) : (
                                          r.stage
                                        )}
                                      </td>
                                      <td className="py-2.5 text-xs text-muted-foreground">
                                        {r.validated_at ? new Date(r.validated_at).toLocaleString('es-EC') : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>

      {/* Modal Nuevo paciente (arrastrable) */}
      <Modal
        open={showNuevo}
        onClose={() => setShowNuevo(false)}
        title="Nuevo paciente"
        width="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowNuevo(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreatePatient}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar paciente
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">N. historia clinica</label>
            <input className={inputCls} value={form.historia} onChange={(e) => setForm({ ...form, historia: e.target.value })} placeholder="Opcional" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cédula *</label>
            <input className={inputCls} value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} placeholder="0712345678" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Apellido paterno *</label>
            <input className={inputCls} value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Apellido materno</label>
            <input className={inputCls} value={form.apellido_materno} onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Primer nombre *</label>
            <input className={inputCls} value={form.primer_nombre} onChange={(e) => setForm({ ...form, primer_nombre: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Segundo nombre</label>
            <input className={inputCls} value={form.segundo_nombre} onChange={(e) => setForm({ ...form, segundo_nombre: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Edad</label>
            <input type="number" className={inputCls} value={form.edad} onChange={(e) => setForm({ ...form, edad: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Sexo</label>
            <select className={inputCls} value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value as '' | 'F' | 'M' })}>
              <option value="">Seleccione</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provincia</label>
            <input className={inputCls} value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cantón</label>
            <input className={inputCls} value={form.canton} onChange={(e) => setForm({ ...form, canton: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Parroquia</label>
            <input className={inputCls} value={form.parroquia} onChange={(e) => setForm({ ...form, parroquia: e.target.value })} />
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
      </Modal>
    </div>
  );
}
