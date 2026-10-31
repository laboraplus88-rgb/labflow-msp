import React from 'react';
import { FileCheck2, TimerReset, ScanBarcode } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

const HIGHLIGHTS = [
  { icon: FileCheck2, title: 'Formulario 010A digital', text: 'Solicitud de laboratorio con datos MSP completos y catálogo de 7 secciones.' },
  { icon: ScanBarcode, title: 'Toma de muestras trazable', text: 'Clasificación por tubo, etiqueta con código y responsable de cada paso.' },
  { icon: TimerReset, title: 'Plazos de entrega vigilados', text: 'Alertas cuando un examen urgente o de rutina se acerca a su límite.' },
];

export default function BrandPanel() {
  return (
    <section className="bg-brand-panel relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 2xl:p-16">
      <div className="blob-accent pointer-events-none absolute -right-24 -top-24 h-96 w-96 opacity-40" />
      <div className="blob-lilac pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 opacity-30" />

      <div className="relative flex items-center gap-3">
        <AppLogo size={48} />
        <span className="text-2xl font-bold tracking-tight">LabFlow</span>
      </div>

      <div className="relative max-w-xl">
        <p className="mb-3 inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold tracking-wide">
          SNS-MSP · Laboratorio clínico
        </p>
        <h2 className="text-hero-xl font-bold">De la solicitud médica al resultado validado, sin papel perdido.</h2>
        <p className="mt-4 text-base text-primary-foreground/80">
          Plataforma para centros de salud del Ministerio de Salud Pública: registra al paciente, clasifica la muestra y controla cada examen hasta su entrega.
        </p>

        <ul className="mt-8 space-y-4">
          {HIGHLIGHTS?.map((h) => {
            const Icon = h?.icon;
            return (
              <li key={`hl-${h?.title}`} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{h?.title}</p>
                  <p className="text-sm text-primary-foreground/75">{h?.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative grid grid-cols-3 gap-3">
        {[
          { v: '142', l: 'muestras hoy' },
          { v: '38', l: 'exámenes pendientes' },
          { v: '94%', l: 'dentro de plazo' },
        ]?.map((s) => (
          <div key={`stat-${s?.l}`} className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur">
            <p className="text-2xl font-bold tabular">{s?.v}</p>
            <p className="text-xs text-primary-foreground/75">{s?.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
