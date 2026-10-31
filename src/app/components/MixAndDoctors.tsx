'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const OrderMixPie = dynamic(() => import('./OrderMixPie'), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-md bg-muted" />,
});
const DoctorsBar = dynamic(() => import('./DoctorsBar'), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-md bg-muted" />,
});

export default function MixAndDoctors() {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-2">
          <h2 className="text-base font-semibold text-foreground">Tipo de orden</h2>
          <p className="text-xs text-muted-foreground">Solicitudes del mes por origen</p>
        </header>
        <OrderMixPie />
        <ul className="mt-2 space-y-1.5 text-sm">
          {[
            { l: 'Consulta externa', v: '1 342', c: 'bg-primary' },
            { l: 'Ambulatorio / control', v: '1 108', c: 'bg-accent' },
            { l: 'Emergencia', v: '464', c: 'bg-destructive' },
          ]?.map((x) => (
            <li key={`om-${x?.l}`} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${x?.c}`} />
                {x?.l}
              </span>
              <span className="font-semibold tabular text-foreground">{x?.v}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <header className="mb-2">
          <h2 className="text-base font-semibold text-foreground">Médicos que más solicitan</h2>
          <p className="text-xs text-muted-foreground">Exámenes ordenados este mes, separados por prioridad</p>
        </header>
        <DoctorsBar />
      </div>
    </section>
  );
}
