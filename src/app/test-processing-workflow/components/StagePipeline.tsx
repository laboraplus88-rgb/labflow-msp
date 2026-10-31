'use client';
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { STAGES } from '@/lib/labData';

interface StagePipelineProps {
  counts: Record<string, number>;
  active: string;
  onSelect: (s: (typeof STAGES)[number]) => void;
}

export default function StagePipeline({ counts, active, onSelect }: StagePipelineProps) {
  const max = Math.max(...STAGES.map((s) => counts[s] ?? 0), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-2 sm:p-3">
      <p className="mb-2 px-1 text-[11px] font-semibold text-muted-foreground sm:hidden">
        Deslice para ver todas las etapas →
      </p>
      <div className="overflow-x-auto scrollbar-thin">
        <ol className="flex min-w-[720px] items-stretch gap-1 sm:min-w-[900px]">
          {STAGES.map((s, i) => {
            const n = counts[s] ?? 0;
            const isActive = active === s;
            const heavy = n === max && n > 3 && s !== 'Entregado';
            return (
              <React.Fragment key={`stage-${s}`}>
                <li className="flex-1">
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    aria-pressed={isActive}
                    className={`w-full rounded-lg border px-2 py-2 text-left transition-all duration-150 active:scale-95 sm:px-3 sm:py-2.5 ${
                      isActive
                        ? 'border-primary bg-primary/10'
                        : heavy
                        ? 'border-warning bg-warning/15 hover:bg-warning/25'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                      {i + 1}. {s}
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-1">
                      <span className="text-xl font-bold tabular text-foreground sm:text-2xl">{n}</span>
                      {heavy && (
                        <span className="rounded bg-warning px-1 py-0.5 text-[9px] font-bold text-warning-foreground sm:px-1.5 sm:text-[10px]">
                          Cuello
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted sm:mt-2">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${(n / max) * 100}%` }}
                      />
                    </div>
                  </button>
                </li>
                {i < STAGES.length - 1 && (
                  <li aria-hidden="true" className="flex items-center text-muted-foreground">
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
