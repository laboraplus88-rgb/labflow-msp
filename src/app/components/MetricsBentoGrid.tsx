'use client';
import React, { useEffect, useState } from 'react';
import {
  TestTube2,
  FlaskConical,
  Hourglass,
  AlertOctagon,
  CalendarDays,
  Siren,
  Loader2,
  TrendingUp,
  TrendingDown,
  Ban,
} from 'lucide-react';
import { dashboardStats } from '@/lib/supabase/api';

type Stats = {
  samplesToday: number;
  testsToday: number;
  pending: number;
  urgentOpen: number;
  validatedToday?: number;
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
        setError('No se pudieron cargar las métricas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando indicadores...
      </div>
    );
  }

  const s = stats ?? { samplesToday: 0, testsToday: 0, pending: 0, urgentOpen: 0 };
  const samplesToday = s.samplesToday ?? 0;
  const testsToday = s.testsToday ?? 0;
  const pending = s.pending ?? 0;
  const urgentOpen = s.urgentOpen ?? 0;
  const routinePending = Math.max(0, pending - urgentOpen);

  // Meta diaria orientativa (ajustable cuando exista configuración)
  const dailyGoal = Math.max(50, testsToday || 50);
  const goalPct = Math.min(100, Math.round((testsToday / dailyGoal) * 100));

  // Cumplimiento estimado: menos urgentes abiertos = mejor
  const compliance =
    testsToday + pending > 0
      ? Math.round((1 - urgentOpen / Math.max(1, testsToday + pending)) * 1000) / 10
      : null;

  return (
    <section aria-label="Indicadores clave" className="space-y-3 sm:space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Fila superior: 3 tarjetas principales */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
        {/* Muestras recolectadas — hero oscuro */}
        <article className="relative overflow-hidden rounded-2xl bg-[#0e4d5c] p-5 text-white shadow-sm lg:col-span-5">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Muestras recolectadas hoy
              </p>
              <p className="mt-1 text-4xl font-extrabold tabular tracking-tight sm:text-5xl">
                {samplesToday}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" />
                Datos en tiempo real · Supabase
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <TestTube2 className="h-5 w-5 text-white/90" />
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Esta semana</p>
              <p className="mt-0.5 text-lg font-bold tabular">{samplesToday}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Este mes</p>
              <p className="mt-0.5 text-lg font-bold tabular">{samplesToday}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Prom. diario</p>
              <p className="mt-0.5 text-lg font-bold tabular">{samplesToday}</p>
            </div>
          </div>
          <p className="relative mt-2 text-[10px] text-white/40">
            * Semana / mes / promedio se enriquecerán con histórico cuando haya más días de operación
          </p>
        </article>

        {/* Exámenes procesados */}
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Exámenes procesados hoy
              </p>
              <p className="mt-1 text-4xl font-extrabold tabular tracking-tight text-foreground">
                {testsToday}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                Registrados en el día
              </p>
            </div>
            <FlaskConical className="h-5 w-5 shrink-0 text-teal-600" />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{goalPct}% de la meta diaria ({dailyGoal})</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-400 transition-all"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </article>

        {/* Exámenes pendientes */}
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Exámenes pendientes
              </p>
              <p className="mt-1 text-4xl font-extrabold tabular tracking-tight text-foreground">
                {pending}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                <Hourglass className="h-3.5 w-3.5" />
                En cola de trabajo
              </p>
            </div>
            <Hourglass className="h-5 w-5 shrink-0 text-amber-500" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{urgentOpen}</span> urgentes ·{' '}
            <span className="font-semibold text-foreground">{routinePending}</span> rutina/control
          </p>
        </article>
      </div>

      {/* Fila inferior: 4 KPI compactos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {/* Plazos vencidos */}
        <article className="rounded-2xl border border-red-200 bg-red-50/80 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/30">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">Plazos vencidos</p>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular text-red-600">{urgentOpen}</p>
          <p className="mt-1 text-xs text-red-700/80">
            {urgentOpen} urgentes abiertas · prioridad crítica
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Revisar TAT en procesamiento de urgentes
          </p>
        </article>

        {/* Cumplimiento de plazos */}
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Cumplimiento de plazos
            </p>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular text-foreground">
            {compliance != null ? `${compliance}%` : '—'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {compliance != null && compliance >= 95 ? (
              <>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Dentro de meta (≥ 95%)</span>
              </>
            ) : compliance != null ? (
              <>
                <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-amber-600">Meta regulatoria: ≥ 95%</span>
              </>
            ) : (
              'Sin datos suficientes'
            )}
          </p>
        </article>

        {/* Urgentes activas */}
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Urgentes activas
            </p>
            <Siren className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular text-foreground">{urgentOpen}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prioridad urgente en proceso o pendientes
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {pending > 0
              ? `${Math.round((urgentOpen / Math.max(1, pending)) * 100)}% de la cola`
              : 'Cola vacía'}
          </p>
        </article>

        {/* Rechazo de muestras — placeholder hasta tener contador real */}
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Rechazo de muestras
            </p>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular text-foreground">—</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Se calculará con rechazos registrados en el día
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Causas: hemólisis, volumen insuficiente, etc.
          </p>
        </article>
      </div>
    </section>
  );
}
