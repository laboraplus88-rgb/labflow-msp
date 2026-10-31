'use client';
import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { WorkflowTest, TAT_MINUTES, formatMinutes, STAGES } from '@/lib/labData';
import Badge, { priorityTone, orderTone, stageTone } from '@/components/ui/Badge';

interface TestDrawerProps {
  test: WorkflowTest;
  onClose: () => void;
  onSaveResult: (id: string, result: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onAdvance: (id: string) => void;
}

export default function TestDrawer({
  test,
  onClose,
  onSaveResult,
  onApprove,
  onReject,
  onAdvance,
}: TestDrawerProps) {
  const [result, setResult] = useState(test.result || '');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const limit = TAT_MINUTES[test.priority];
  const left = limit - test.minutesElapsed;
  const pct = Math.min(100, Math.round((test.minutesElapsed / limit) * 100));
  const overdue = left < 0;
  const stageIdx = STAGES.indexOf(test.stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <aside className="slide-in-right relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-primary">{test.id}</p>
            <h2 className="text-base font-bold text-foreground">{test.exam}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
          {/* Patient */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-semibold text-foreground">{test.patient}</p>
            <p className="font-mono text-xs text-muted-foreground tabular">CI {test.cedula} · Muestra {test.sample}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={orderTone(test.orderType)}>{test.orderType}</Badge>
              <Badge tone={priorityTone(test.priority)} dot>{test.priority}</Badge>
              <Badge tone={stageTone(test.stage)}>{test.stage}</Badge>
            </div>
          </div>

          {/* TAT */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Plazo de entrega
              </span>
              <span className={`font-bold tabular ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                {overdue ? `Vencido +${formatMinutes(-left)}` : `Quedan ${formatMinutes(left)}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${overdue ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Transcurrido {formatMinutes(test.minutesElapsed)} de {formatMinutes(limit)} ({test.priority})
            </p>
          </div>

          {/* Timeline stages */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Etapas</p>
            <ol className="space-y-1.5">
              {STAGES.map((s, i) => {
                const done = i < stageIdx;
                const current = i === stageIdx;
                return (
                  <li key={s} className={`flex items-center gap-2 text-sm ${current ? 'font-semibold text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      current ? 'bg-primary text-primary-foreground' : done ? 'bg-success/20 text-success' : 'bg-muted'
                    }`}>
                      {done ? '✓' : i + 1}
                    </span>
                    {s}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Staff */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Medico solicitante</p>
              <p className="font-medium text-foreground">{test.doctor}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsable</p>
              <p className="font-medium text-foreground">{test.tech}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Validador</p>
              <p className="font-medium text-foreground">{test.validator}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categoria</p>
              <p className="font-medium text-foreground">{test.category}</p>
            </div>
          </div>

          {test.note && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
              <AlertTriangle className="mb-0.5 inline h-3.5 w-3.5 text-warning" /> {test.note}
            </div>
          )}

          {/* Result input */}
          {(test.stage === 'En proceso' || test.stage === 'Resultado ingresado' || test.stage === 'Recibida en laboratorio') && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Resultado</label>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Ej. 186 mg/dL"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}

          {showReject && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-destructive">Motivo de rechazo</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Ej. Hemolisis, muestra insuficiente..."
                className="w-full rounded-lg border border-destructive/40 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive/30"
              />
            </div>
          )}
        </div>

        <footer className="space-y-2 border-t border-border p-4">
          {test.stage === 'Resultado ingresado' && (
            <button
              type="button"
              onClick={() => onApprove(test.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-success py-2.5 text-sm font-semibold text-success-foreground transition-all hover:opacity-90"
            >
              <CheckCircle2 className="h-4 w-4" /> Validar resultado
            </button>
          )}
          {(test.stage === 'En proceso' || test.stage === 'Recibida en laboratorio') && (
            <button
              type="button"
              onClick={() => result && onSaveResult(test.id, result)}
              disabled={!result}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              Guardar resultado
            </button>
          )}
          {test.stage !== 'Entregado' && test.stage !== 'Resultado ingresado' && (
            <button
              type="button"
              onClick={() => onAdvance(test.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/10"
            >
              <ArrowRight className="h-4 w-4" /> Avanzar etapa
            </button>
          )}
          {!showReject ? (
            <button
              type="button"
              onClick={() => setShowReject(true)}
              className="w-full rounded-lg py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              Rechazar muestra
            </button>
          ) : (
            <button
              type="button"
              onClick={() => rejectReason && onReject(test.id, rejectReason)}
              disabled={!rejectReason}
              className="w-full rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              Confirmar rechazo
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
