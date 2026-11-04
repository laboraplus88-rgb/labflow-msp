'use client';
import React from 'react';
import { ArrowRight, Eye, FlaskConical, AlertTriangle } from 'lucide-react';
import { WorkflowTest, TAT_MINUTES, formatMinutes } from '@/lib/labData';
import Badge, { priorityTone, orderTone, stageTone } from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';

interface WorkflowTableProps {
  tests: WorkflowTest[];
  onOpen: (id: string) => void;
  onAdvance: (id: string) => void;
  onResetFilters: () => void;
}

function tatState(t: WorkflowTest) {
  const limit = TAT_MINUTES[t.priority];
  const left = limit - t.minutesElapsed;
  const done = t.stage === 'Entregado' || t.stage === 'Validado';
  if (done) return { tone: 'success' as const, label: 'Cumplido', left };
  if (left < 0) return { tone: 'danger' as const, label: `Vencido +${formatMinutes(-left)}`, left };
  if (left <= limit * 0.2) return { tone: 'warning' as const, label: `Quedan ${formatMinutes(left)}`, left };
  return { tone: 'neutral' as const, label: `Quedan ${formatMinutes(left)}`, left };
}

export default function WorkflowTable({ tests, onOpen, onAdvance, onResetFilters }: WorkflowTableProps) {
  if (tests.length === 0) {
    return (
      <EmptyState
        icon={<FlaskConical className="h-6 w-6" />}
        title="Ningún examen en esta vista"
        description="No hay exámenes que coincidan con los filtros activos. Quite algún filtro para ver el flujo completo."
        actionLabel="Limpiar filtros"
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              {['ID prueba', 'Paciente', 'Examen', 'Muestra', 'Orden / Prioridad', 'Médico solicitante', 'Responsable', 'Validador', 'Etapa', 'Plazo de entrega', ''].map((h) => (
                <th key={`wh-${h || 'actions'}`} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => {
              const tat = tatState(t);
              const overdue = tat.tone === 'danger';
              return (
                <tr
                  key={`test-${t.id}`}
                  className={`group border-t border-border transition-colors hover:bg-primary/5 ${
                    overdue ? 'bg-destructive/5' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-primary">{t.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{t.patient}</p>
                    <p className="font-mono text-[11px] text-muted-foreground tabular">CI {t.cedula}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{t.exam}</p>
                    <p className="text-[11px] text-muted-foreground">{t.category}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground tabular">{t.sample}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={orderTone(t.orderType)}>{t.orderType}</Badge>
                      <Badge tone={priorityTone(t.priority)} dot>{t.priority}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{t.doctor}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{t.tech}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t.validator}</td>
                  <td className="px-4 py-3"><Badge tone={stageTone(t.stage)}>{t.stage}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge tone={tat.tone}>
                      {overdue && <AlertTriangle className="h-3 w-3" />}
                      {tat.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip label="Abrir detalle y resultado">
                        <button
                          type="button"
                          onClick={() => onOpen(t.id)}
                          aria-label="Abrir detalle"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {t.stage !== 'Entregado' && (
                        <Tooltip label="Avanzar a la siguiente etapa">
                          <button
                            type="button"
                            onClick={() => onAdvance(t.id)}
                            aria-label="Avanzar etapa"
                            className="rounded-md p-1.5 text-primary transition-all duration-150 hover:bg-primary/10 active:scale-95"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
