'use client';
import React, { useEffect, useState } from 'react';
import {
  TestTube2, FlaskConical, Hourglass, AlertOctagon, CalendarDays, Siren, Loader2,
} from 'lucide-react';
import { dashboardStats } from '@/lib/supabase/api';

type Stats = {
  samplesToday: number;
  testsToday: number;
  pending: number;
  urgentOpen: number;
};

export default function MetricsBentoGrid() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const s = await dashboardStats();
        setStats(s);
      } catch {
        setError('No se pudieron cargar las metricas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando indicadores...
      </div>
    );
  }

  const s = stats ?? { samplesToday: 0, testsToday: 0, pending: 0, urgentOpen: 0 };

  return (
    <section aria-label="Indicadores clave" className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {error && (
        <p className="sm:col-span-2 xl:col-span-4 text-sm text-destructive">{error}</p>
      )}

      <article className="relative overflow-hidden rounded-xl border border-border bg-primary p-5 text-primary-foreground md:col-span-2">
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
              Muestras recolectadas hoy
            </p>
            <p className="mt-2 text-4xl sm:text-5xl font-bold tabular">{s.samplesToday}</p>
            <p className="mt-1 text-sm text-primary-foreground/85">Datos en tiempo real · Supabase</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15">
            <TestTube2 className="h-6 w-6" />
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Examenes hoy</p>
          <FlaskConical className="h-5 w-5 text-accent" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">{s.testsToday}</p>
        <p className="mt-1 text-sm text-muted-foreground">Registrados en el dia</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Examenes pendientes</p>
          <Hourglass className="h-5 w-5 text-warning" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">{s.pending}</p>
        <p className="mt-1 text-sm text-muted-foreground">No validados / no entregados</p>
      </article>

      <article className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-destructive">Urgentes abiertos</p>
          <AlertOctagon className="h-5 w-5 text-destructive" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-destructive">{s.urgentOpen}</p>
        <p className="mt-1 text-sm text-foreground">Prioridad urgente en proceso</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cumplimiento</p>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">
          {s.testsToday + s.pending > 0
            ? `${Math.round((1 - s.urgentOpen / Math.max(1, s.testsToday + s.pending)) * 1000) / 10}%`
            : '—'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Estimado operativo</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5 md:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cola activa</p>
          <Siren className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">{s.pending}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {s.urgentOpen} urgentes · {Math.max(0, s.pending - s.urgentOpen)} rutina/control
        </p>
      </article>
    </section>
  );
}
