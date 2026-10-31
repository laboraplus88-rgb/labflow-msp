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
  { stage: 'Muestra recolectada \u2192 Recibida', waiting: 38, median: '42 min', limit: '30 min', tone: 'danger' as const, note: 'Falta de mensajero entre toma y mes\u00f3n' },
  { stage: 'Recibida \u2192 En proceso', waiting: 52, median: '58 min', limit: '45 min', tone: 'danger' as const, note: 'Qu\u00edmica: equipo en mantenimiento 11:00' },
  { stage: 'En proceso \u2192 Resultado ingresado', waiting: 31, median: '1 h 05', limit: '1 h 30', tone: 'success' as const, note: 'Dentro de lo esperado' },
  { stage: 'Resultado \u2192 Validado', waiting: 27, median: '49 min', limit: '40 min', tone: 'warning' as const, note: 'Un solo validador disponible' },
  { stage: 'Validado \u2192 Entregado', waiting: 16, median: '22 min', limit: '30 min', tone: 'success' as const, note: 'Sin retrasos' },
];

export default function BottleneckPanel() {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">\u00bfD\u00f3nde se estancan los ex\u00e1menes?</h2>
          <p className="text-xs text-muted-foreground">Ex\u00e1menes en cola por etapa y tiempo mediano de espera vs. l\u00edmite interno</p>
        </header>
        <StageQueueChart />
        <div className="mt-4 overflow-x-auto scrollbar-thin rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                {['Transici\u00f3n', 'En espera', 'Mediana', 'L\u00edmite', 'Causa observada'].map((h) => (
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
          <p className="text-xs text-muted-foreground">% de ex\u00e1menes entregados dentro del plazo \u00b7 \u00faltimos 7 d\u00edas</p>
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
