'use client';
import React from 'react';
import { Loader2, Printer, ScanBarcode, X, PackageOpen, ClipboardCheck } from 'lucide-react';
import { TUBES, TubeKey, Priority, OrderType } from '@/lib/labData';
import { CatalogExam } from '@/lib/labData';
import Badge, { priorityTone, orderTone } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { CollectedLabel } from './ExamRequestWorkspace';

interface OrderSummaryProps {
  selectedExams: CatalogExam[];
  tubeGroups: { tube: TubeKey; exams: string[] }[];
  labels: CollectedLabel[];
  submitting: boolean;
  orderType: OrderType;
  priority: Priority;
  patientName: string;
  cedula: string;
  onClear: () => void;
  onRemove: (id: string) => void;
}

export default function OrderSummary({
  selectedExams,
  tubeGroups,
  labels,
  submitting,
  orderType,
  priority,
  patientName,
  cedula,
  onClear,
  onRemove,
}: OrderSummaryProps) {
  return (
    <aside className="xl:sticky xl:top-20 xl:self-start">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <h2 className="text-sm font-bold">Resumen de la solicitud</h2>
          </div>
          <span className="text-xs font-semibold tabular opacity-90">{selectedExams.length} ex\u00e1menes</span>
        </header>

        <div className="space-y-4 p-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground">Paciente</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{patientName || 'Sin ingresar'}</p>
            <p className="font-mono text-xs text-muted-foreground tabular">{cedula || '\u2014'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={orderTone(orderType)}>{orderType}</Badge>
              <Badge tone={priorityTone(priority)} dot>{priority}</Badge>
            </div>
          </div>

          {selectedExams.length === 0 ? (
            <EmptyState
              icon={<PackageOpen className="h-6 w-6" />}
              title="Sin ex\u00e1menes seleccionados"
              description="Elija ex\u00e1menes del cat\u00e1logo para generar la clasificaci\u00f3n de tubos y las etiquetas."
            />
          ) : (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ex\u00e1menes ordenados</p>
                  <button type="button" onClick={onClear} className="text-xs font-semibold text-destructive hover:underline">
                    Limpiar
                  </button>
                </div>
                <ul className="max-h-44 space-y-1 overflow-y-auto scrollbar-thin pr-1">
                  {selectedExams.map((e) => (
                    <li
                      key={`sel-${e.id}`}
                      className="group flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="truncate text-foreground">{e.name}</span>
                      <button
                        type="button"
                        aria-label={`Quitar ${e.name}`}
                        onClick={() => onRemove(e.id)}
                        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Clasificaci\u00f3n por tubo ({tubeGroups.length})
                </p>
                <ul className="space-y-2">
                  {tubeGroups.map((g) => {
                    const t = TUBES[g.tube];
                    return (
                      <li key={`tg-${g.tube}`} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
                        <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border border-border ${t.swatch}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{t.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{g.exams.join(' \u00b7 ')}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
            {submitting ? 'Registrando\u2026' : 'Registrar y generar etiquetas'}
          </button>
        </div>
      </div>

      {labels.length > 0 && (
        <div className="slide-up mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Etiquetas de muestra</p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground transition-all duration-150 hover:opacity-90 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </div>
          <ul className="space-y-2">
            {labels.map((l) => {
              const t = TUBES[l.tube];
              const shortName = (patientName || 'Paciente').toLowerCase().replace(/\s+/g, '');
              return (
                <li key={`label-${l.code}`} className="flex items-stretch overflow-hidden rounded-md border border-input bg-white shadow-sm">
                  <span className={`w-2.5 shrink-0 ${t.swatch}`} />
                  <div className="min-w-0 flex-1 px-3 py-2">
                    <p className="truncate text-xs font-bold tracking-tight text-foreground">{shortName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground tabular">
                      CI {cedula || '\u2014'} \u00b7 {t.note}
                    </p>
                    <div className="mt-1.5 flex items-end gap-px" aria-hidden="true">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <span
                          key={`bar-${l.code}-${i}`}
                          className="inline-block bg-foreground"
                          style={{
                            width: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
                            height: 12 + ((i * 7) % 10),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center border-l border-border bg-muted/80 px-3">
                    <span className="font-mono text-sm font-bold tracking-wide text-foreground tabular">{l.code}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
