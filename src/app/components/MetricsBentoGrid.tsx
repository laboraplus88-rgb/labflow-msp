import React from 'react';
import { TestTube2, FlaskConical, Hourglass, AlertOctagon, CalendarDays, CalendarRange, Siren, TrendingUp, TrendingDown } from 'lucide-react';

// BACKEND: replace with Supabase RPC aggregates (samples_per_period, pending_by_stage, tat_compliance)
export default function MetricsBentoGrid() {
  return (
    <section aria-label="Indicadores clave" className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className="relative overflow-hidden rounded-xl border border-border bg-primary p-5 text-primary-foreground md:col-span-2">
        <div className="blob-accent pointer-events-none absolute -right-16 -top-16 h-56 w-56 opacity-40" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">Muestras recolectadas hoy</p>
            <p className="mt-2 text-4xl sm:text-5xl font-bold tabular">142</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/85">
              <TrendingUp className="h-4 w-4" /> +11% vs. el jueves pasado (128)
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15">
            <TestTube2 className="h-6 w-6" />
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {[
            { l: 'Esta semana', v: '687' },
            { l: 'Este mes', v: '2 914' },
            { l: 'Prom. diario', v: '131' },
          ]?.map((s) => (
            <div key={`hero-${s?.l}`} className="rounded-lg bg-primary-foreground/10 px-3 py-2">
              <p className="text-xs text-primary-foreground/75">{s?.l}</p>
              <p className="text-lg font-bold tabular">{s?.v}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ex\u00e1menes procesados hoy</p>
          <FlaskConical className="h-5 w-5 text-accent" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">418</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-success"><TrendingUp className="h-4 w-4" /> +6.4% vs. ayer</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[72%] rounded-full bg-accent" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">72% de la meta diaria (580)</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ex\u00e1menes pendientes</p>
          <Hourglass className="h-5 w-5 text-warning" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">164</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-destructive"><TrendingUp className="h-4 w-4" /> +22 desde las 12:00</p>
        <p className="mt-3 text-xs text-muted-foreground">Mayor carga: Qu\u00edmica sangu\u00ednea (61)</p>
      </article>

      <article className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-destructive">Plazos vencidos</p>
          <AlertOctagon className="h-5 w-5 text-destructive" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-destructive">5</p>
        <p className="mt-1 text-sm text-foreground">2 urgentes \u00b7 3 de rutina</p>
        <p className="mt-3 text-xs text-muted-foreground">TP/TTP de Mac\u00edas Zambrano excede 60 min</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cumplimiento de plazos</p>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">93.8%</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-destructive"><TrendingDown className="h-4 w-4" /> \u22122.1 pts vs. semana previa</p>
        <p className="mt-3 text-xs text-muted-foreground">Meta regulatoria: \u2265 95%</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Urgentes activas</p>
          <Siren className="h-5 w-5 text-destructive" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">9</p>
        <p className="mt-1 text-sm text-muted-foreground">Mediana de espera 34 min</p>
        <p className="mt-3 text-xs text-muted-foreground">Origen: 7 Emergencia \u00b7 2 Consulta externa</p>
      </article>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rechazo de muestras</p>
          <CalendarRange className="h-5 w-5 text-warning" />
        </div>
        <p className="mt-2 text-3xl font-bold tabular text-foreground">2.8%</p>
        <p className="mt-1 text-sm text-muted-foreground">4 de 142 muestras hoy</p>
        <p className="mt-3 text-xs text-muted-foreground">Causa principal: hem\u00f3lisis (2)</p>
      </article>
    </section>
  );
}
