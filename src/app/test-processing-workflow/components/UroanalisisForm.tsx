'use client';
import React from 'react';
import { URO_SECTIONS, type UroValues } from '@/lib/uroanalisisPanel';

const inputCls =
  'w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/30';

interface Props {
  values: UroValues;
  onChange: (next: UroValues) => void;
  readOnly?: boolean;
}

export default function UroanalisisForm({ values, onChange, readOnly }: Props) {
  const set = (key: string, val: string) => onChange({ ...values, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">UROANÁLISIS</p>
      {URO_SECTIONS.map((section) => (
        <div key={section.id} className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
            {section.title}
          </div>
          <div className="divide-y divide-border">
            {section.fields.map((f) => (
              <div key={f.key} className="grid grid-cols-[1fr_minmax(100px,140px)] items-center gap-2 px-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{f.label}</p>
                  {f.ref && (
                    <p className="text-[10px] text-muted-foreground">Ref: {f.ref}</p>
                  )}
                </div>
                {f.type === 'select' ? (
                  <select
                    disabled={readOnly}
                    className={inputCls}
                    value={values[f.key] || ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    step={f.key === 'densidad' ? '0.001' : f.key === 'ph' ? '0.1' : undefined}
                    disabled={readOnly}
                    className={inputCls}
                    value={values[f.key] || ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.key === 'leucocitos_s' ? 'ej. 3-4' : ''}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
