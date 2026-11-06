'use client';
import React, { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDoctorSuggestions } from '@/lib/useDoctorSuggestions';

/**
 * Médico solicitante: se puede escribir cualquier nombre (campo libre) y, mientras se escribe
 * o al entrar al campo, aparece la lista de médicos del laboratorio para elegir.
 */
export default function DoctorField({ form, className }: { form: UseFormReturn<any>; className: string }) {
  const { register, setValue, watch, formState: { errors } } = form;
  const value: string = watch('doctor') ?? '';
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const all = useDoctorSuggestions(value, open);
  const names = all.filter((n) => n.trim().toLowerCase() !== value.trim().toLowerCase());
  const reg = register('doctor', { required: 'Requerido' });

  const pick = (n: string) => {
    setValue('doctor', n, { shouldValidate: true, shouldDirty: true });
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || names.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % names.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? names.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(names[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="relative">
      <input
        {...reg}
        className={className}
        placeholder="Escriba o elija al médico"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && names.length > 0}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => { reg.onChange(e); setOpen(true); setActive(-1); }}
        onBlur={(e) => { reg.onBlur(e); setTimeout(() => setOpen(false), 150); }}
        onKeyDown={onKeyDown}
      />
      {open && names.length > 0 && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
          {names.map((n, i) => (
            <li key={n} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(n); }}
                className={`block w-full px-3 py-2 text-left text-sm ${i === active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}
      {errors.doctor?.message ? <p className="mt-1 text-xs text-destructive">{String(errors.doctor.message)}</p> : null}
    </div>
  );
}
