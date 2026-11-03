'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Users, Activity, AlertTriangle, FlaskConical,
  Loader2, RefreshCw, Wifi, MapPin,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type LabRow = {
  id: string; name: string; code: string; city: string | null; active: boolean;
  online: number; staff: number; pending_tests: number; tests_today: number;
};
type PathRow = { path: string; users: number };
type Overview = { scope: string; onlineUsers: number; laboratories: LabRow[]; byPath: PathRow[] };

export default function GlobalAdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLab, setSelectedLab] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const supabase = createClient();
      await supabase.rpc('presence_heartbeat', { p_path: '/admin-global' });
      const { data: ov, error: err } = await supabase.rpc('traffic_overview');
      if (err) { setError(err.message); setData(null); }
      else setData(ov as Overview);
    } catch {
      setError('Ejecute 04_multitenant.sql en Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando control de trafico...
      </div>
    );
  }

  const labs = data?.laboratories ?? [];
  const selected = labs.find((l) => l.id === selectedLab) ?? null;
  const bottleneck = labs.filter((l) => l.pending_tests > 20 || l.online > 15);

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-primary p-4 text-primary-foreground sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Usuarios online</p>
            <Wifi className="h-5 w-5 opacity-80" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular">{data?.onlineUsers ?? 0}</p>
          <p className="mt-1 text-xs opacity-80">Heartbeat menos de 2 min · cada 15s</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laboratorios</p>
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-foreground">{labs.length}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes</p>
            <FlaskConical className="h-5 w-5 text-warning" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-foreground">
            {labs.reduce((a, l) => a + (l.pending_tests || 0), 0)}
          </p>
        </article>
        <article className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-destructive">Cuellos de botella</p>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-destructive">{bottleneck.length}</p>
        </article>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Vista general del sistema</h2>
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {labs.map((lab) => {
          const hot = lab.pending_tests > 20 || lab.online > 15;
          const active = selectedLab === lab.id;
          return (
            <button
              key={lab.id}
              type="button"
              onClick={() => setSelectedLab(active ? null : lab.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                : hot ? 'border-destructive/40 bg-destructive/5'
                : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{lab.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{lab.code}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {lab.city ?? '\u2014'}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Online</p>
                  <p className="text-sm font-bold tabular">{lab.online}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Staff</p>
                  <p className="text-sm font-bold tabular">{lab.staff}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Hoy</p>
                  <p className="text-sm font-bold tabular">{lab.tests_today}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Cola</p>
                  <p className={`text-sm font-bold tabular ${hot ? 'text-destructive' : ''}`}>{lab.pending_tests}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold">{selected ? `Detalle · ${selected.name}` : 'Seleccione un laboratorio'}</h3>
          </header>
          {selected ? (
            <div className="space-y-2 p-4 text-sm">
              <p>Online: <strong>{selected.online}</strong> · Staff: <strong>{selected.staff}</strong></p>
              <p>Hoy / cola: <strong>{selected.tests_today} / {selected.pending_tests}</strong></p>
              {selected.pending_tests > 20 && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">Posible cuello de botella</p>
              )}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">Toque una tarjeta de laboratorio</p>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Trafico por pantalla</h3>
          </header>
          <ul className="divide-y divide-border">
            {(data?.byPath ?? []).length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin presencia activa</li>
            ) : (
              (data?.byPath ?? []).map((p) => (
                <li key={p.path} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs">{p.path}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                    <Users className="h-3 w-3" /> {p.users}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
