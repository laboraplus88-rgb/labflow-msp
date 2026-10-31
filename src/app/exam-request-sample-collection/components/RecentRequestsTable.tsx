'use client';
import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Eye, Printer, Search, ClipboardList } from 'lucide-react';
import { RECENT_REQUESTS } from '@/lib/labData';
import Badge, { priorityTone, orderTone } from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';

type SortKey = 'id' | 'patient' | 'time' | 'exams';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  'Muestras recolectadas': 'success',
  'Pendiente de toma': 'warning',
  'Rechazada parcial': 'danger',
};

export default function RecentRequestsTable() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = RECENT_REQUESTS.filter((r) => {
      const matchQ = !q || r.patient.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.cedula.includes(q);
      const matchS = statusFilter === 'Todos' || r.status === statusFilter;
      return matchQ && matchS;
    });
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
  }, [query, statusFilter, sortKey, asc]);

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setAsc((a) => !a);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };

  const th = (label: string, key?: SortKey) => (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {key ? (
        <button type="button" onClick={() => sortBy(key)} className="inline-flex items-center gap-1 hover:text-foreground">
          {label}
          <ArrowUpDown className={`h-3 w-3 ${sortKey === key ? 'text-primary' : ''}`} />
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Solicitudes recientes</h2>
          <p className="text-xs text-muted-foreground">Turno matutino \u00b7 actualizado en tiempo real</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paciente, c\u00e9dula o N.\u00ba\u2026"
              className="w-full sm:w-64 rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          >
            {['Todos', 'Muestras recolectadas', 'Pendiente de toma', 'Rechazada parcial'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Sin solicitudes"
            description="No hay solicitudes que coincidan con la b\u00fasqueda o el filtro de estado."
          />
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                {th('N.\u00ba', 'id')}
                {th('Paciente', 'patient')}
                {th('C\u00e9dula')}
                {th('M\u00e9dico solicitante')}
                {th('Tipo de orden')}
                {th('Prioridad')}
                {th('Ex\u00e1menes', 'exams')}
                {th('Tubos')}
                {th('Estado')}
                {th('Hora', 'time')}
                {th('')}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`req-${r.id}`}
                  className={`group border-t border-border transition-colors hover:bg-primary/5 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary tabular">{r.id}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-foreground">{r.patient}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular">{r.cedula}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{r.doctor}</td>
                  <td className="px-4 py-3"><Badge tone={orderTone(r.orderType)}>{r.orderType}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={priorityTone(r.priority)} dot>{r.priority}</Badge></td>
                  <td className="px-4 py-3 text-center font-semibold tabular text-foreground">{r.exams}</td>
                  <td className="px-4 py-3 text-center tabular text-muted-foreground">{r.tubes}</td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs tabular text-muted-foreground">{r.time}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip label="Ver solicitud">
                        <button type="button" aria-label="Ver solicitud" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Reimprimir etiquetas">
                        <button type="button" aria-label="Reimprimir etiquetas" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Printer className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
