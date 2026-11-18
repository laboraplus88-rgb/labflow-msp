'use client';
import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, ArrowRight, AlertTriangle, Clock, History, ShieldCheck } from 'lucide-react';
import { WorkflowTest, TAT_MINUTES, formatMinutes, STAGES } from '@/lib/labData';
import Badge, { priorityTone, orderTone, stageTone } from '@/components/ui/Badge';
import { getMyRole, getTestStageHistory } from '@/lib/supabase/api';
import { qcStatusForExam, type QcStatus } from '@/lib/supabase/qc';
import UroanalisisForm from './UroanalisisForm';
import {
  formatUroResult,
  isUroanalisis,
  parseUroResult,
  type UroValues,
} from '@/lib/uroanalisisPanel';

interface TestDrawerProps {
  test: WorkflowTest & {
    resultRange?: string;
    resultUnit?: string;
    resultFlag?: string;
    examCode?: string;
    validatedAt?: string;
    validatorName?: string;
    techName?: string;
  };
  onClose: () => void;
  onSaveResult: (id: string, result: string) => void;
  onApprove: (id: string, opts?: { qcOverride?: boolean; rangeOverride?: boolean }) => void;
  onReject: (id: string, reason: string) => void;
  onAdvance: (id: string) => void;
}

type StageLog = {
  id: string;
  from_stage: string | null;
  to_stage: string;
  action: string;
  result: string | null;
  result_flag: string | null;
  note: string | null;
  user_name: string | null;
  created_at: string;
};

export default function TestDrawer({
  test,
  onClose,
  onSaveResult,
  onApprove,
  onReject,
  onAdvance,
}: TestDrawerProps) {
  const isUro = isUroanalisis(test.exam, test.category);
  const [result, setResult] = useState(test.result || '');
  const [uro, setUro] = useState<UroValues>(() => parseUroResult(test.result));
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [canReadLogs, setCanReadLogs] = useState(false);
  const [logs, setLogs] = useState<StageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [qc, setQc] = useState<QcStatus | null>(null);
  const [qcLoading, setQcLoading] = useState(false);

  useEffect(() => {
    getMyRole().then((role) => setCanReadLogs(role === 'jefa' || role === 'tecnologo'));
  }, []);

  useEffect(() => {
    if (!canReadLogs) return;
    setLoadingLogs(true);
    getTestStageHistory(test.id)
      .then(({ data }) => setLogs((data as StageLog[]) ?? []))
      .finally(() => setLoadingLogs(false));
  }, [canReadLogs, test.id]);

  useEffect(() => {
    setResult(test.result || '');
    setUro(parseUroResult(test.result));
  }, [test.id, test.result]);

  useEffect(() => {
    const code = (test as any).examCode || (test as any).exam_code;
    if (!code || test.stage !== 'Resultado ingresado') {
      setQc(null);
      return;
    }
    setQcLoading(true);
    qcStatusForExam(String(code), 24)
      .then(({ data, error }) => {
        if (!error && data) setQc(data as QcStatus);
        else setQc(null);
      })
      .finally(() => setQcLoading(false));
  }, [test.id, test.stage]);

  const limit = TAT_MINUTES[test.priority as keyof typeof TAT_MINUTES] ?? 1440;
  const left = limit - test.minutesElapsed;
  const pct = Math.min(100, Math.round((test.minutesElapsed / limit) * 100));
  const overdue = left < 0;
  const stageIdx = STAGES.indexOf(test.stage);
  const uroFilled = isUro && Boolean(uro.color || uro.aspecto || uro.densidad || uro.ph);
  const hasResult = isUro
    ? uroFilled || Boolean((test.result || '').trim())
    : Boolean((test.result || result).trim());
  const canEditResult =
    test.stage === 'En proceso' ||
    test.stage === 'Resultado ingresado' ||
    test.stage === 'Recibida en laboratorio';
  const rangeAlert =
    test.resultFlag === 'alto' || test.resultFlag === 'bajo' || test.resultFlag === 'critico';

  const actionLabel = (a: string) => {
    if (a === 'resultado') return 'Ingresó resultado';
    if (a === 'rechazo') return 'Rechazó muestra';
    if (a === 'avance') return 'Avanzó etapa';
    if (a === 'validacion') return 'Validó resultado';
    return a;
  };

  const handleSave = () => {
    if (isUro) onSaveResult(test.id, formatUroResult(uro));
    else if (result.trim()) onSaveResult(test.id, result);
  };

  const handleApprove = () => {
    if (qc?.soft_block) {
      const ok = window.confirm(
        `QC: ${qc.message || 'Control no conforme'}.\n\n¿Validar de todos modos? (quedará en bitácora)`
      );
      if (!ok) return;
      onApprove(test.id, { qcOverride: true, rangeOverride: rangeAlert });
      return;
    }
    if (rangeAlert) {
      const ok = window.confirm(
        `Resultado marcado como ${test.resultFlag} vs rango de referencia.\n\n¿Confirmar validación?`
      );
      if (!ok) return;
      onApprove(test.id, { rangeOverride: true });
      return;
    }
    onApprove(test.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <aside className="slide-in-right relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-primary">
              {test.id?.slice(0, 8)} · {test.code}
            </p>
            <h2 className="text-base font-bold text-foreground">{test.exam}</h2>
            <p className="text-sm text-muted-foreground">{test.patient}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={stageTone(test.stage)}>{test.stage}</Badge>
            <Badge tone={priorityTone(test.priority)} dot>{test.priority}</Badge>
            <Badge tone={orderTone(test.orderType)}>{test.orderType}</Badge>
            {test.resultFlag === 'alto' && <Badge tone="danger">▲ Alto</Badge>}
            {test.resultFlag === 'bajo' && <Badge tone="warning">▼ Bajo</Badge>}
            {test.resultFlag === 'critico' && <Badge tone="danger">⚠ Crítico</Badge>}
          </div>

          {(test.stage === 'Validado' || test.stage === 'Entregado' || test.validator || test.validatorName) && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Validación
              </p>
              <p className="font-medium text-foreground">{test.validatorName || test.validator || '—'}</p>
              <p className="text-xs text-muted-foreground">
                {test.validatedAt
                  ? new Date(test.validatedAt).toLocaleString('es-EC')
                  : 'Pendiente / sin fecha'}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cédula</p>
                <p className="font-mono font-medium text-foreground">{test.cedula || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Muestra</p>
                <p className="font-mono font-medium text-foreground">{test.sample}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Médico</p>
                <p className="font-medium text-foreground">{test.doctor}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sección</p>
                <p className="font-medium text-foreground">{test.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Analista</p>
                <p className="font-medium text-foreground">{test.techName || test.tech}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validador</p>
                <p className="font-medium text-foreground">{test.validatorName || test.validator || '—'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Plazo ({test.priority})
              </span>
              <span className={`font-bold tabular ${overdue ? 'text-destructive' : pct > 80 ? 'text-warning' : 'text-foreground'}`}>
                {overdue ? `Vencido +${formatMinutes(-left)}` : `Quedan ${formatMinutes(left)}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${overdue ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Límite {formatMinutes(limit)} · Transcurrido {formatMinutes(test.minutesElapsed)}
            </p>
          </div>

          {test.stage === 'Resultado ingresado' && (
            <div className={`rounded-xl border p-3 text-sm ${
              qc?.soft_block ? 'border-warning/50 bg-warning/10' : qc?.ok ? 'border-success/40 bg-success/5' : 'border-border bg-muted/30'
            }`}>
              <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Control de calidad</p>
              {qcLoading ? (
                <p className="text-xs text-muted-foreground">Consultando QC…</p>
              ) : qc ? (
                <>
                  <p className="font-medium">{qc.message}</p>
                  {qc.last_run_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Última corrida: {new Date(qc.last_run_at).toLocaleString('es-EC')}
                    </p>
                  )}
                  {qc.soft_block && (
                    <p className="mt-1 text-xs">Bloqueo suave: puede validar confirmando el aviso.</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Configure controles en /qc</p>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Etapas</p>
            <ol className="space-y-1.5">
              {STAGES.map((s, i) => {
                const done = i < stageIdx;
                const current = i === stageIdx;
                return (
                  <li key={s} className={`flex items-center gap-2 text-sm ${current ? 'font-semibold text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      current ? 'bg-primary text-primary-foreground' : done ? 'bg-success/20 text-success' : 'bg-muted'
                    }`}>{done ? '✓' : i + 1}</span>
                    {s}
                  </li>
                );
              })}
            </ol>
          </div>

          {canReadLogs && (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Bitácora
              </p>
              {loadingLogs ? (
                <p className="text-xs text-muted-foreground">Cargando…</p>
              ) : logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin registros aún.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {logs.map((log) => (
                    <li key={log.id} className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-semibold">{actionLabel(log.action)}</p>
                          <p className="text-muted-foreground">
                            {log.from_stage ? `${log.from_stage} → ` : ''}
                            <span className="text-foreground">{log.to_stage}</span>
                          </p>
                          {log.note && <p className="mt-0.5 text-muted-foreground">{log.note}</p>}
                        </div>
                        <div className="shrink-0 text-right text-muted-foreground">
                          <p className="font-medium text-foreground">{log.user_name || '—'}</p>
                          <p>{new Date(log.created_at).toLocaleString('es-EC')}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {test.note && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <AlertTriangle className="mb-0.5 inline h-3.5 w-3.5" /> {test.note}
            </div>
          )}

          {test.result && !canEditResult && (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1 text-xs text-muted-foreground">Resultado</p>
              {isUro ? (
                <UroanalisisForm values={parseUroResult(test.result)} onChange={() => {}} readOnly />
              ) : (
                <>
                  <p className="text-lg font-bold">{test.result}{test.resultUnit ? ` ${test.resultUnit}` : ''}</p>
                  {test.resultRange && <p className="text-xs text-muted-foreground">Ref: {test.resultRange}</p>}
                </>
              )}
            </div>
          )}

          {canEditResult && (
            <div>
              {isUro ? (
                <UroanalisisForm values={uro} onChange={setUro} />
              ) : (
                <>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Resultado {test.resultRange ? `(ref: ${test.resultRange})` : ''} *
                  </label>
                  <input
                    type="text"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </>
              )}
            </div>
          )}

          {showReject && (
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              placeholder="Motivo de rechazo"
              className="w-full rounded-lg border border-destructive/40 px-3 py-2 text-sm"
            />
          )}
        </div>

        <footer className="space-y-2 border-t border-border p-4">
          {test.stage === 'Resultado ingresado' && (
            <button type="button" onClick={handleApprove} disabled={!hasResult}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-success py-2.5 text-sm font-semibold text-success-foreground disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> Validar resultado
            </button>
          )}
          {(test.stage === 'En proceso' || test.stage === 'Recibida en laboratorio') && (
            <button type="button" onClick={handleSave} disabled={isUro ? !uroFilled : !result.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Guardar resultado
            </button>
          )}
          {test.stage !== 'Entregado' && test.stage !== 'Resultado ingresado' && (
            <button type="button" onClick={() => onAdvance(test.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary py-2.5 text-sm font-semibold text-primary">
              <ArrowRight className="h-4 w-4" /> Avanzar etapa
            </button>
          )}
          {!showReject ? (
            <button type="button" onClick={() => setShowReject(true)} className="w-full py-2 text-sm font-semibold text-destructive">
              Rechazar muestra
            </button>
          ) : (
            <button type="button" disabled={!rejectReason} onClick={() => rejectReason && onReject(test.id, rejectReason)}
              className="w-full rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50">
              Confirmar rechazo
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
