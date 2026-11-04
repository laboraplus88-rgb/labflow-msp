'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import Badge from '@/components/ui/Badge';

const StageQueueChart = dynamic(() => import('./StageQueueChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-muted" />,
});
const ComplianceRadial = dynamic(() => import('./ComplianceRadial'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-muted" />,
});

const ROWS = [
  { stage: 'Muestra recolectada → Recibida', waiting: 38, median: '42 min', limit: '30 min', tone: 'danger' as const, note: 'Falta de mensajero entre toma y mesón' },
  { stage: 'Recibida → En proceso', waiting: 52, median: '58 min', limit: '45 min', tone: 'danger' as const, note: 'Química: equipo en mantenimiento 11:00' },
  { stage: 'En proceso → Resultado ingresado', waiting: 31, median: '1 h 05', limit: '1 h 30', tone: 'success' as const, note: 'Dentro de lo esperado' },
  { stage: 'Resultado → Validado', waiting: 27, median: '49 min', limit: '40 min', tone: 'warning' as const, note: 'Un solo validador disponible' },
  { stage: 'Validado → Entregado', waiting: 16, median: '22 min', limit: '30 min', tone: 'success' as const, note: 'Sin retrasos' },
];

export default function BottleneckPanel() {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">¿Dónde se estancan los exámenes?</h2>
          <p className="text-xs text-muted-foreground">Exámenes en cola por etapa y tiempo mediano de espera vs. límite interno</p>
        </header>
        <StageQueueChart />
        <div className="mt-4 overflow-x-auto scrollbar-thin rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                {['Transición', 'En espera', 'Mediana', 'Límite', 'Causa observada'].map((h) => (
                  <th key={`bh-${h}`} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={`bn-${r.stage}`} className="border-t border-border transition-colors hover:bg-primary/5">
                  <td className="px-3 py-2 font-medium text-foreground">{r.stage}</td>
                  <td className="px-3 py-2 tabular font-semibold text-foreground">{r.waiting}</td>
                  <td className="px-3 py-2"><Badge tone={r.tone}>{r.median}</Badge></td>
                  <td className="px-3 py-2 tabular text-muted-foreground">{r.limit}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-2">
          <h2 className="text-base font-semibold text-foreground">Cumplimiento por prioridad</h2>
          <p className="text-xs text-muted-foreground">% de exámenes entregados dentro del plazo · últimos 7 días</p>
        </header>
        <ComplianceRadial />
        <ul className="mt-2 space-y-2 text-sm">
          {[
            { l: 'Urgente (1 h)', v: '86%', tone: 'danger' as const },
            { l: 'Rutina (24 h)', v: '95%', tone: 'success' as const },
            { l: 'Control (48 h)', v: '99%', tone: 'success' as const },
          ].map((x) => (
            <li key={`cmp-${x.l}`} className="flex items-center justify-between">
              <span className="text-muted-foreground">{x.l}</span>
              <Badge tone={x.tone}>{x.v}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
