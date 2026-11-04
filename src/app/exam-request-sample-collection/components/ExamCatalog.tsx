'use client';
import React, { useMemo, useState } from 'react';
import { Search, Check, FlaskConical } from 'lucide-react';
import { CATALOG, CATEGORIES, TUBES } from '@/lib/labData';
import EmptyState from '@/components/ui/EmptyState';

interface ExamCatalogProps {
  selected: string[];
  onToggle: (id: string) => void;
}

const CATEGORY_NUM: Record<string, string> = {
  Hematologia: '1',
  Uroanalisis: '2',
  Coprologico: '3',
  'Quimica sanguinea': '4',
  Serologia: '5',
  Bacteriologia: '6',
  Otros: '7',
};

export default function ExamCatalog({ selected, onToggle }: ExamCatalogProps) {
  const [active, setActive] = useState<string>(CATEGORIES[0]);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    selected.forEach((id) => {
      const exam = CATALOG.find((c) => c.id === id);
      if (exam) map[exam.category] = (map[exam.category] ?? 0) + 1;
    });
    return map;
  }, [selected]);

  const visible = useMemo(() => {
    if (q) {
      return CATALOG.filter(
        (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }
    return CATALOG.filter((c) => c.category === active);
  }, [active, q]);

  const allSelected = visible.length > 0 && visible.every((v) => selected.includes(v.id));

  const toggleMany = (ids: string[], on: boolean) => {
    ids.forEach((id) => {
      const isOn = selected.includes(id);
      if (on && !isOn) onToggle(id);
      if (!on && isOn) onToggle(id);
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-2 rounded-t-xl bg-lilac px-3 py-2.5 text-lilac-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Catalogo de examenes</h2>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular">
            {selected.length}
          </span>
        </div>
        <label className="relative">
          <span className="sr-only">Buscar examen</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar examen (ej. glucosa)..."
            className="w-full rounded-md border border-input bg-card py-1.5 pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 sm:w-60"
          />
        </label>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3">
        {CATEGORIES.map((cat) => {
          const isActive = !q && active === cat;
          const count = countsByCategory[cat] ?? 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActive(cat);
                setQuery('');
              }}
              className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-lilac text-[11px] font-bold text-lilac-foreground">
                {CATEGORY_NUM[cat]}
              </span>
              {cat}
              {count > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground tabular">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {visible.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-6 w-6" />}
            title="Ningun examen coincide"
            description="Pruebe con otro nombre o revise la seccion del catalogo."
            actionLabel="Limpiar busqueda"
            onAction={() => setQuery('')}
          />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {q
                  ? `${visible.length} resultados para "${query}"`
                  : `${visible.length} examenes en ${active}`}{' '}
                · valores de referencia del laboratorio
              </p>
              <button
                type="button"
                onClick={() => toggleMany(visible.map((v) => v.id), !allSelected)}
                className="shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {visible.map((ex) => {
                const checked = selected.includes(ex.id);
                const tube = TUBES[ex.tube];
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(ex.id)}
                      aria-pressed={checked}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all active:scale-[0.99] ${
                        checked
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:bg-muted/60'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-yellowcell'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{ex.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Ref: <span className="font-medium text-foreground tabular">{ex.range}</span>
                          {ex.unit !== '-' && <span> {ex.unit}</span>}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/10"
                            style={{ backgroundColor: tube.color }}
                          />
                          {tube.label}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
