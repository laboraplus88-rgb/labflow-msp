'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, RefreshCw, Loader2, ClipboardList, CheckCircle2, Hourglass, Siren, Timer,
  UserRound, UserPlus, FileText, Clock, AlertTriangle, ChevronRight,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import {
  getDoctorPanel,
  getProfile,
  searchPatients,
  type DoctorOrder,
  type DoctorPanelData,
} from '@/lib/supabase/api';

// ---------- Guardia (ventana de tiempo) ----------
type ShiftId = 'hoy' | 'diurna' | 'nocturna' | '24h' | 'custom';

const SHIFTS: { id: ShiftId; label: string; hint: string }[] = [
  { id: 'hoy', label: 'Hoy', hint: '00:00 – 24:00' },
  { id: 'diurna', label: 'Guardia diurna', hint: '07:00 – 19:00' },
  { id: 'nocturna', label: 'Guardia nocturna', hint: '19:00 – 07:00' },
  { id: '24h', label: 'Guardia 24 h', hint: '08:00 – 08:00' },
  { id: 'custom', label: 'Personalizado', hint: 'Elegir fechas' },
];

function at(base: Date, dayOffset: number, hour: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function computeWindow(id: ShiftId, now: Date, custom: { from: string; to: string }): { from: Date; to: Date } {
  const h = now.getHours();
  switch (id) {
    case 'diurna':
      return { from: at(now, 0, 7), to: at(now, 0, 19) };
    case 'nocturna':
      // Antes de las 07:00 todavía estamos en la guardia que empezó ayer a las 19:00.
      return h < 7 ? { from: at(now, -1, 19), to: at(now, 0, 7) } : { from: at(now, 0, 19), to: at(now, 1, 7) };
    case '24h':
      return h < 8 ? { from: at(now, -1, 8), to: at(now, 0, 8) } : { from: at(now, 0, 8), to: at(now, 1, 8) };
    case 'custom': {
      const f = custom.from ? new Date(custom.from) : at(now, 0, 0);
      const t = custom.to ? new Date(custom.to) : at(now, 1, 0);
      return { from: f, to: t };
    }
    case 'hoy':
    default:
      return { from: at(now, 0, 0), to: at(now, 1, 0) };
  }
}

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- Formato ----------
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
const fmtRange = (a: Date, b: Date) =>
  `${a.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} ${fmtTime(a.toISOString())} – ${b.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} ${fmtTime(b.toISOString())}`;
function fmtMinutes(m: number | null) {
  if (m == null) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

type OrderStatus = 'complete' | 'partial' | 'process' | 'empty';
function statusOf(o: DoctorOrder): OrderStatus {
  if (o.examsTotal === 0) return 'empty';
  if (o.examsReady === o.examsTotal) return 'complete';
  if (o.examsReady > 0) return 'partial';
  return 'process';
}

const STATUS_UI: Record<OrderStatus, { label: string; cls: string }> = {
  complete: { label: 'Resultados listos', cls: 'bg-success/10 text-success' },
  partial: { label: 'Parcial', cls: 'bg-warning/15 text-foreground' },
  process: { label: 'En proceso', cls: 'bg-primary/10 text-primary' },
  empty: { label: 'Sin exámenes', cls: 'bg-muted text-muted-foreground' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === 'Urgente'
      ? 'bg-destructive/10 text-destructive'
      : priority === 'Control'
      ? 'bg-lilac text-lilac-foreground'
      : 'bg-muted text-muted-foreground';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>{priority}</span>;
}

function isAbnormal(flag: string | null) {
  if (!flag) return false;
  const f = flag.trim().toLowerCase();
  return f !== '' && !['n', 'normal', 'ok', '-', '—'].includes(f);
}

type Tab = 'todas' | 'pendientes' | 'listas' | 'urgentes';

export default function DoctorDashboard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [shift, setShift] = useState<ShiftId>('hoy');
  const [custom, setCustom] = useState(() => {
    const n = new Date();
    return { from: toLocalInput(at(n, 0, 0)), to: toLocalInput(at(n, 1, 0)) };
  });
  const [data, setData] = useState<DoctorPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('todas');
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState<DoctorOrder | null>(null);

  // búsqueda rápida de pacientes
  const [pq, setPq] = useState('');
  const [presults, setPresults] = useState<any[]>([]);
  const [psearching, setPsearching] = useState(false);
  const [pdone, setPdone] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('labflow.doctor.shift') as ShiftId | null;
      if (saved && SHIFTS.some((s) => s.id === saved)) setShift(saved);
    } catch { /* sin almacenamiento */ }
    getProfile().then((p: any) => { if (p?.full_name) setName(p.full_name); });
  }, []);

  const win = useMemo(() => computeWindow(shift, new Date(), custom), [shift, custom, updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    const w = computeWindow(shift, new Date(), custom);
    if (!(w.to > w.from)) {
      setError('La fecha final debe ser posterior a la inicial.');
      setLoading(false);
      return;
    }
    setError('');
    const { data: d, error: e } = await getDoctorPanel(w.from, w.to);
    if (e) { setError(e); } else { setData(d); setUpdatedAt(new Date()); }
    setLoading(false);
  }, [shift, custom]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const chooseShift = (id: ShiftId) => {
    setShift(id);
    try { localStorage.setItem('labflow.doctor.shift', id); } catch { /* ignore */ }
  };

  // búsqueda con espera
  useEffect(() => {
    const q = pq.trim();
    if (q.length < 2) { setPresults([]); setPdone(false); return; }
    setPsearching(true);
    const t = setTimeout(async () => {
      const { data: rows } = await searchPatients(q);
      setPresults((rows ?? []).slice(0, 6));
      setPsearching(false);
      setPdone(true);
    }, 300);
    return () => clearTimeout(t);
  }, [pq]);

  const orders = data?.orders ?? [];
  const kpis = data?.kpis;

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return orders.filter((o) => {
      const st = statusOf(o);
      if (tab === 'pendientes' && st === 'complete') return false;
      if (tab === 'listas' && st !== 'complete') return false;
      if (tab === 'urgentes' && !(o.priority === 'Urgente' && st !== 'complete')) return false;
      if (!q) return true;
      return (
        o.patient.name.toLowerCase().includes(q) ||
        o.patient.cedula.includes(q) ||
        o.code.toLowerCase().includes(q)
      );
    });
  }, [orders, tab, filter]);

  const counts = useMemo(() => ({
    todas: orders.length,
    pendientes: orders.filter((o) => statusOf(o) !== 'complete').length,
    listas: orders.filter((o) => statusOf(o) === 'complete').length,
    urgentes: orders.filter((o) => o.priority === 'Urgente' && statusOf(o) !== 'complete').length,
  }), [orders]);

  // actividad por hora (o por día si la ventana es larga)
  const activity = useMemo(() => {
    const spanH = (win.to.getTime() - win.from.getTime()) / 3600000;
    const byDay = spanH > 36;
    const bucketMs = (byDay ? 24 : 1) * 3600000;
    const n = Math.min(Math.max(Math.ceil((win.to.getTime() - win.from.getTime()) / bucketMs), 1), 48);
    const issued = new Array(n).fill(0) as number[];
    const delivered = new Array(n).fill(0) as number[];
    const idx = (iso: string) => Math.floor((new Date(iso).getTime() - win.from.getTime()) / bucketMs);
    orders.forEach((o) => {
      const i = idx(o.createdAt);
      if (i >= 0 && i < n) issued[i] += 1;
      if (o.examsTotal > 0 && o.examsReady === o.examsTotal && o.lastValidatedAt) {
        const j = idx(o.lastValidatedAt);
        if (j >= 0 && j < n) delivered[j] += 1;
      }
    });
    const labels = issued.map((_, i) => {
      const d = new Date(win.from.getTime() + i * bucketMs);
      return byDay ? d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : `${String(d.getHours()).padStart(2, '0')}h`;
    });
    const max = Math.max(1, ...issued, ...delivered);
    return { issued, delivered, labels, max, byDay };
  }, [orders, win]);

  const goRequest = (cedula?: string) => {
    router.push(cedula ? `/exam-request-sample-collection?cedula=${encodeURIComponent(cedula)}` : '/exam-request-sample-collection');
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando su panel...
      </div>
    );
  }

  const kpiCards = [
    { label: 'Órdenes emitidas', value: kpis?.issued ?? 0, sub: 'en esta guardia', icon: ClipboardList, tone: 'text-primary bg-primary/10' },
    { label: 'Entregadas', value: kpis?.delivered ?? 0, sub: 'resultados completos en esta guardia', icon: CheckCircle2, tone: 'text-success bg-success/10' },
    { label: 'Abiertas', value: kpis?.open ?? 0, sub: 'esperan resultado (todas las fechas)', icon: Hourglass, tone: 'text-warning bg-warning/15' },
    { label: 'Urgentes pendientes', value: kpis?.urgentOpen ?? 0, sub: 'exámenes urgentes sin validar', icon: Siren, tone: 'text-destructive bg-destructive/10' },
    { label: 'Tiempo medio de entrega', value: fmtMinutes(kpis?.avgTatMin ?? null), sub: 'de las órdenes entregadas', icon: Timer, tone: 'text-primary bg-primary/10' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Saludo + acciones */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Médico solicitante</p>
          <h2 className="truncate text-xl font-bold text-foreground">{name || 'Bienvenido'}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Guardia: {fmtRange(win.from, win.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {updatedAt && (
            <span className="hidden text-xs text-muted-foreground sm:inline">Actualizado {updatedAt.toLocaleTimeString('es-EC')}</span>
          )}
          <button
            type="button"
            onClick={() => { setLoading(true); load(); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
          <Link
            href="/exam-request-sample-collection"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Nueva solicitud
          </Link>
        </div>
      </section>

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {/* Selector de guardia */}
      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Mi guardia</p>
        <div className="flex flex-wrap gap-2">
          {SHIFTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => chooseShift(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-left transition-all active:scale-95 ${
                shift === s.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
              }`}
            >
              <span className={`block text-xs font-semibold ${shift === s.id ? 'text-primary' : 'text-foreground'}`}>{s.label}</span>
              <span className="block text-[11px] text-muted-foreground">{s.hint}</span>
            </button>
          ))}
        </div>
        {shift === 'custom' && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:max-w-xl sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Desde</span>
              <input type="datetime-local" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Hasta</span>
              <input type="datetime-local" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </label>
          </div>
        )}
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <article key={k.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.tone}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="tabular mt-2 text-3xl font-bold text-foreground">{k.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
            </article>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_380px]">
        {/* Actividad */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Actividad de la guardia</h3>
              <p className="text-xs text-muted-foreground">Órdenes emitidas y entregadas por {activity.byDay ? 'día' : 'hora'}</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Emitidas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> Entregadas</span>
            </div>
          </div>
          <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1">
            {activity.issued.map((v, i) => (
              <div key={`act-${i}`} className="flex min-w-[18px] flex-1 flex-col items-center gap-1" title={`${activity.labels[i]}: ${v} emitidas · ${activity.delivered[i]} entregadas`}>
                <div className="flex h-32 w-full items-end justify-center gap-0.5">
                  <div className="w-1/2 rounded-t bg-primary" style={{ height: `${(v / activity.max) * 100}%`, minHeight: v ? 3 : 0 }} />
                  <div className="w-1/2 rounded-t bg-success" style={{ height: `${(activity.delivered[i] / activity.max) * 100}%`, minHeight: activity.delivered[i] ? 3 : 0 }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{activity.labels[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Paciente */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-bold text-foreground">Buscar o registrar paciente</h3>
          <p className="mb-3 text-xs text-muted-foreground">Por cédula, nombre o historia clínica</p>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              placeholder="Ej. 0712345678 o Rodríguez"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
            {psearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </label>
          {presults.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {presults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => goRequest(p.cedula)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lilac text-lilac-foreground"><UserRound className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {[p.apellido_paterno, p.apellido_materno, p.primer_nombre, p.segundo_nombre].filter(Boolean).join(' ')}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        CI {p.cedula}{p.edad != null ? ` · ${p.edad} años` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-primary">Solicitar</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pdone && !psearching && presults.length === 0 && (
            <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">No se encontró ningún paciente con «{pq.trim()}».</p>
          )}
          <button
            type="button"
            onClick={() => goRequest(/^\d{6,13}$/.test(pq.trim()) ? pq.trim() : undefined)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" /> Registrar nuevo paciente
          </button>
        </section>
      </div>

      {/* Órdenes */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Mis órdenes</h3>
            <p className="text-xs text-muted-foreground">Emitidas o entregadas en la guardia, más todas las que siguen abiertas</p>
          </div>
          <label className="relative block w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por paciente, cédula u orden"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
        </header>

        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border px-3">
          {([
            ['todas', 'Todas'],
            ['pendientes', 'Pendientes'],
            ['listas', 'Con resultados'],
            ['urgentes', 'Urgentes'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label} <span className="tabular ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px]">{counts[id]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              {orders.length === 0 ? 'Aún no hay órdenes en esta guardia' : 'No hay órdenes con ese filtro'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {orders.length === 0 ? 'Cuando emita una solicitud aparecerá aquí con el avance de sus resultados.' : 'Pruebe con otra pestaña o borre el texto del filtro.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Orden</th>
                  <th className="px-3 py-2.5 font-semibold">Paciente</th>
                  <th className="px-3 py-2.5 font-semibold">Prioridad</th>
                  <th className="px-3 py-2.5 font-semibold">Avance</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => {
                  const st = statusOf(o);
                  const pct = o.examsTotal ? Math.round((o.examsReady / o.examsTotal) * 100) : 0;
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setDetail(o)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold">{o.code}</p>
                        <p className="text-[11px] text-muted-foreground">{fmtDay(o.createdAt)} · {fmtTime(o.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="max-w-[260px] truncate font-semibold">{o.patient.name}</p>
                        <p className="text-[11px] text-muted-foreground">CI {o.patient.cedula}{o.patient.age != null ? ` · ${o.patient.age} años` : ''}</p>
                      </td>
                      <td className="px-3 py-3">
                        <PriorityBadge priority={o.priority} />
                        <p className="mt-1 text-[11px] text-muted-foreground">{o.orderType}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${st === 'complete' ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabular text-xs font-semibold">{o.examsReady}/{o.examsTotal}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_UI[st].cls}`}>{STATUS_UI[st].label}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground"><ChevronRight className="inline h-4 w-4" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Detalle de la orden */}
      <Modal
        open={!!detail}
        title={detail ? `Orden ${detail.code}` : 'Orden'}
        onClose={() => setDetail(null)}
        footer={
          <>
            {detail && (
              <button
                type="button"
                onClick={() => goRequest(detail.patient.cedula)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Nueva solicitud para este paciente
              </button>
            )}
            <button type="button" onClick={() => setDetail(null)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Cerrar
            </button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{detail.patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  CI {detail.patient.cedula}
                  {detail.patient.age != null ? ` · ${detail.patient.age} años` : ''}
                  {detail.patient.sex ? ` · ${detail.patient.sex === 'F' ? 'Mujer' : 'Hombre'}` : ''}
                </p>
              </div>
              <div className="text-right">
                <PriorityBadge priority={detail.priority} />
                <p className="mt-1 text-[11px] text-muted-foreground">{detail.orderType} · {fmtDay(detail.createdAt)} {fmtTime(detail.createdAt)}</p>
              </div>
            </div>
            {detail.diagnosis && (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs"><span className="font-semibold">Diagnóstico / motivo:</span> {detail.diagnosis}</p>
            )}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Examen</th>
                    <th className="px-3 py-2 text-right font-semibold">Resultado</th>
                    <th className="px-3 py-2 font-semibold">Referencia</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.tests.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <p className="font-semibold">{t.examName}</p>
                        <p className="text-[11px] text-muted-foreground">{t.category}</p>
                      </td>
                      <td className="tabular px-3 py-2 text-right">
                        {t.ready ? (
                          <span className={`font-bold ${isAbnormal(t.flag) ? 'text-destructive' : 'text-foreground'}`}>
                            {t.result ?? '—'} <span className="font-normal text-muted-foreground">{t.unit && t.unit !== '—' ? t.unit : ''}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pendiente</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.range && t.range !== 'Ver informe' ? t.range : '—'}</td>
                      <td className="px-3 py-2">
                        {t.ready ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Validado {t.validatedAt ? fmtTime(t.validatedAt) : ''}
                            {isAbnormal(t.flag) && <span className="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">{t.flag}</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t.stage}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Solo se muestran resultados validados por el laboratorio. Los exámenes en proceso aparecen como pendientes.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
