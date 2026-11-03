'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlarmClockOff, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { listTests } from '@/lib/supabase/api';

type AlertRow = {
  id: string;
  exam_name: string;
  priority: string;
  stage: string;
  patients: { primer_nombre?: string; apellido_paterno?: string; cedula?: string } | null;
  stage_started_at?: string;
};

const TAT_LIMIT: Record<string, number> = {
  Urgente: 60,
  Rutina: 24 * 60,
  Control: 48 * 60,
};

export default function TatAlertsPanel() {
  const [alerts, setAlerts] = useState<
    { id: string; test: string; rule: string; state: string; tone: 'danger' | 'warning' | 'neutral'; where: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await listTests();
        const rows = ((data as AlertRow[]) ?? []).filter(
          (t) => t.stage !== 'Validado' && t.stage !== 'Entregado'
        );
        const mapped = rows
          .map((t) => {
            const limit = TAT_LIMIT[t.priority] ?? 24 * 60;
            const started = t.stage_started_at ? new Date(t.stage_started_at).getTime() : Date.now();
            const elapsed = Math.round((Date.now() - started) / 60000);
            const left = limit - elapsed;
            const name = t.patients
              ? `${t.exam_name} \u00b7 ${t.patients.apellido_paterno ?? ''} ${t.patients.primer_nombre ?? ''}`.trim()
              : t.exam_name;
            let state = `Quedan ${left} min`;
            let tone: 'danger' | 'warning' | 'neutral' = 'neutral';
            if (left < 0) {
              state = `Vencido +${-left} min`;
              tone = 'danger';
            } else if (left < limit * 0.2) {
              state = `Quedan ${left} min`;
              tone = 'warning';
            }
            return {
              id: t.id,
              test: name,
              rule: `${t.priority} \u00b7 ${limit} min`,
              state,
              tone,
              where: t.stage,
            };
          })
          .sort((a, b) => {
            const rank = { danger: 0, warning: 1, neutral: 2 };
            return rank[a.tone] - rank[b.tone];
          })
          .slice(0, 12);
        setAlerts(mapped);
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const overdue = alerts.filter((a) => a.tone === 'danger').length;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlarmClockOff className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Alertas de plazo de entrega</h2>
        </div>
        {overdue > 0 ? (
          <Badge tone="danger" dot>{overdue} vencidos</Badge>
        ) : (
          <Badge tone="success">Sin vencidos</Badge>
        )}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : alerts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No hay examenes en cola o aun no hay datos en Supabase.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-y-auto max-h-[360px]">
          {alerts.map((a) => (
            <li key={a.id} className="px-5 py-3 transition-colors hover:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{a.test}</p>
                <Badge tone={a.tone}>{a.state}</Badge>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {a.rule} \u00b7 {a.where}
              </p>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-border px-5 py-3">
        <Link
          href="/test-processing-workflow"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Ir al procesamiento <ArrowUpRight className="h-4 w-4" />
        </Link>
      </footer>
    </section>
  );
}
