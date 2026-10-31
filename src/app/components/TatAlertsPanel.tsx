import React from 'react';
import Link from 'next/link';
import { AlarmClockOff, Clock, ArrowUpRight } from 'lucide-react';
import Badge from '@/components/ui/Badge';

const ALERTS = [
  { id: 'alert-t24884', test: 'TP \u00b7 Mac\u00edas Zambrano J. L.', rule: 'Urgente \u00b7 60 min', state: 'Vencido +11 min', tone: 'danger' as const, where: 'Recibida en laboratorio', owner: 'Lcda. Andrea Bravo' },
  { id: 'alert-t24885', test: 'TTP \u00b7 Mac\u00edas Zambrano J. L.', rule: 'Urgente \u00b7 60 min', state: 'Vencido +11 min', tone: 'danger' as const, where: 'Recibida en laboratorio', owner: 'Lcda. Andrea Bravo' },
  { id: 'alert-t24891', test: 'Gram \u00b7 Espinoza Burbano M. V.', rule: 'Urgente \u00b7 60 min', state: 'Quedan 5 min', tone: 'warning' as const, where: 'Resultado ingresado', owner: 'Bq. Diana Pillajo' },
  { id: 'alert-t24882', test: 'Coproparasitario \u00b7 Cando Pilataxi W. F.', rule: 'Rutina \u00b7 24 h', state: 'Quedan 30 min', tone: 'warning' as const, where: 'Recibida en laboratorio', owner: 'Lcda. Rosa Chiliquinga' },
  { id: 'alert-t24880', test: 'Cultivo \u00b7 Maldonado Cuesta P. P.', rule: 'Rutina \u00b7 24 h', state: 'Vencido +2 h 10 min', tone: 'danger' as const, where: 'En proceso (incubaci\u00f3n)', owner: 'Bq. Diana Pillajo' },
  { id: 'alert-t24877', test: 'Colesterol \u00b7 Paredes Vinueza C. A.', rule: 'Control \u00b7 48 h', state: 'Quedan 31 h', tone: 'neutral' as const, where: 'Muestra recolectada', owner: 'Lcda. Rosa Chiliquinga' },
];

export default function TatAlertsPanel() {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlarmClockOff className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Alertas de plazo de entrega</h2>
        </div>
        <Badge tone="danger" dot>3 vencidos</Badge>
      </header>
      <ul className="flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
        {ALERTS.map((a) => (
          <li key={a.id} className="px-5 py-3 transition-colors hover:bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">{a.test}</p>
              <Badge tone={a.tone}>{a.state}</Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {a.rule} \u00b7 {a.where}
            </p>
            <p className="text-xs text-muted-foreground">Responsable: <span className="font-medium text-foreground">{a.owner}</span></p>
          </li>
        ))}
      </ul>
      <footer className="border-t border-border px-5 py-3">
        <Link href="/test-processing-workflow" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Ir al procesamiento <ArrowUpRight className="h-4 w-4" />
        </Link>
      </footer>
    </section>
  );
}
