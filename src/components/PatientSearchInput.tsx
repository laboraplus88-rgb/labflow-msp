'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserRound, X } from 'lucide-react';
import { searchPatients } from '@/lib/supabase/api';

export type PatientHit = {
  id: string;
  historia: string | null;
  cedula: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  primer_nombre: string;
  segundo_nombre: string | null;
  edad: number | null;
  sexo: string | null;
  provincia?: string | null;
  canton?: string | null;
  parroquia?: string | null;
  telefono?: string | null;
  phone?: string | null;
};

function fullName(p: PatientHit) {
  return [p.apellido_paterno, p.apellido_materno, p.primer_nombre, p.segundo_nombre]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Props = {
  /** Valor mostrado en el input (nombre libre o seleccionado) */
  value: string;
  onChange: (text: string) => void;
  /** Se dispara al elegir un paciente de la lista */
  onSelect: (patient: PatientHit) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Mínimo de caracteres para buscar (default 2) */
  minChars?: number;
};

export default function PatientSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Nombre, cédula o historia…',
  className = '',
  disabled,
  autoFocus,
  minChars = 2,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < minChars) {
        setHits([]);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await searchPatients(trimmed);
        if (err) {
          setError(err.message);
          setHits([]);
        } else {
          setHits((data as PatientHit[]) ?? []);
          setHighlight(0);
        }
      } catch {
        setError('No se pudo buscar pacientes');
        setHits([]);
      } finally {
        setLoading(false);
      }
    },
    [minChars]
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(value), 280);
    return () => clearTimeout(t);
  }, [value, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (p: PatientHit) => {
    onSelect(p);
    onChange(fullName(p));
    setOpen(false);
    setHits([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = hits[highlight];
      if (p) pick(p);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const showList = open && (loading || error || hits.length > 0 || value.trim().length >= minChars);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />
        {value && !disabled && (
          <button
            type="button"
            aria-label="Limpiar"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
            onClick={() => {
              onChange('');
              setHits([]);
              setOpen(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      {showList && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
        >
          {loading && (
            <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
            </li>
          )}
          {!loading && error && (
            <li className="px-3 py-3 text-sm text-destructive">{error}</li>
          )}
          {!loading && !error && hits.length === 0 && value.trim().length >= minChars && (
            <li className="px-3 py-3 text-sm text-muted-foreground">
              Sin coincidencias. Puede escribir el nombre y agendar como visitante.
            </li>
          )}
          {!loading &&
            hits.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(p)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                    i === highlight ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lilac text-[11px] font-bold text-lilac-foreground">
                    {(p.primer_nombre?.[0] || '?')}
                    {(p.apellido_paterno?.[0] || '')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{fullName(p)}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      CI {p.cedula}
                      {p.historia ? ` · HC ${p.historia}` : ''}
                    </span>
                    {(p.edad != null || p.sexo) && (
                      <span className="block text-[11px] text-muted-foreground">
                        {p.edad != null ? `${p.edad} años` : '—'}
                        {p.sexo === 'F' ? ' · Mujer' : p.sexo === 'M' ? ' · Hombre' : ''}
                      </span>
                    )}
                  </span>
                  <UserRound className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export { fullName as patientFullName };
