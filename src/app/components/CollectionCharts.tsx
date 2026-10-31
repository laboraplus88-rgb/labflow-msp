'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const HourlyChart = dynamic(() => import('./HourlyChart'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-md bg-muted" />,
});
const PeriodChart = dynamic(() => import('./PeriodChart'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-md bg-muted" />,
});

const TABS = [
  { key: 'day', label: 'Hoy (por hora)' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
] as const;

export default function CollectionCharts() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('day');

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Muestras recolectadas</h2>
          <p className="text-xs text-muted-foreground">Actualizado 14:28 · comparado con el día equivalente anterior</p>
        </div>
        <div className="flex rounded-lg bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={`ct-${t.key}`}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div className="fade-in" key={`panel-${tab}`}>
        {tab === 'day' ? <HourlyChart /> : <PeriodChart mode={tab} />}
      </div>
    </section>
  );
}
