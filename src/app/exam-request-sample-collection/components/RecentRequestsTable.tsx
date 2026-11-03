'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Search, ClipboardList, Loader2 } from 'lucide-react';
import Badge, { priorityTone, orderTone } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { listRecentRequests } from '@/lib/supabase/api';

type Row = {
  id: string;
  code: string;
  order_type: string;
  priority: string;
  status: string;
  created_at: string;
  patients: {
    primer_nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    cedula: string;
  } | null;
  tests: { id: string }[] | null;
};

export default function RecentRequestsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await listRecentRequests();
        if (err) setError(err.message);
        else setRows((data as Row[]) ?? []);
      } catch {
        setError('No se pudieron cargar las solicitudes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const name = r.patients
        ? [r.patients.apellido_paterno, r.patients.primer_nombre].filter(Boolean).join(' ')
        : '';
      const matchQ =
        !q ||
        name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.patients?.cedula ?? '').includes(q);
      const matchS = statusFilter === 'Todos' || r.status === statusFilter;
      return matchQ && matchS;
    });
  }, [rows, query, statusFilter]);

  const statuses = useMemo(() => {
    const s = new Set(rows.map((r) => r.status));
    return ['Todos', ...Array.from(s)];
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando solicitudes...
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Solicitudes recientes</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{filtered.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </header>

      {error && <p className="px-4 py-2 text-sm text-destructive">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Sin solicitudes"
          description="Las solicitudes registradas en Supabase apareceran aqui."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Examenes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const name = r.patients
                  ? [r.patients.apellido_paterno, r.patients.apellido_materno, r.patients.primer_nombre]
                      .filter(Boolean)
                      .join(' ')
                  : '\u2014';
                return (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-primary">{r.code}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.patients?.cedula}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={orderTone(r.order_type)}>{r.order_type}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={priorityTone(r.priority)} dot>{r.priority}</Badge>
                    </td>
                    <td className="px-4 py-2.5 tabular">{r.tests?.length ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === 'entregada' ? 'success' : r.status === 'rechazada' ? 'danger' : 'info'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('es-EC')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
