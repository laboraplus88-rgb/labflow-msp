'use client';
import React from 'react';
import { Search, FilterX } from 'lucide-react';
import { STAGES, TECHS } from '@/lib/labData';

export interface FilterState {
  query: string;
  stage: string;
  priority: string;
  tech: string;
  orderType: string;
}

interface WorkflowFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  total: number;
  shown: number;
}

const selectCls =
  'rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/30';

export default function WorkflowFilters({ filters, onChange, total, shown }: WorkflowFiltersProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });
  const dirty = filters.query || filters.stage !== 'Todas' || filters.priority !== 'Todas' || filters.tech !== 'Todos' || filters.orderType !== 'Todas';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="relative w-full min-w-0 flex-1 sm:min-w-[200px]">
        <span className="sr-only">Buscar examen, paciente o cédula</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Buscar examen, paciente, cédula o ID de prueba…"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
        />
      </label>

      <select aria-label="Etapa" className={selectCls} value={filters.stage} onChange={(e) => set({ stage: e.target.value })}>
        <option value="Todas">Todas las etapas</option>
        {STAGES.map((s) => (
          <option key={`fs-${s}`} value={s}>{s}</option>
        ))}
      </select>
      <select aria-label="Prioridad" className={selectCls} value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
        {['Todas', 'Urgente', 'Rutina', 'Control'].map((p) => (
          <option key={`fp-${p}`} value={p}>{p === 'Todas' ? 'Toda prioridad' : p}</option>
        ))}
      </select>
      <select aria-label="Tipo de orden" className={selectCls} value={filters.orderType} onChange={(e) => set({ orderType: e.target.value })}>
        {['Todas', 'Emergencia', 'Consulta externa', 'Ambulatorio'].map((p) => (
          <option key={`fo-${p}`} value={p}>{p === 'Todas' ? 'Todo tipo de orden' : p}</option>
        ))}
      </select>
      <select aria-label="Responsable" className={selectCls} value={filters.tech} onChange={(e) => set({ tech: e.target.value })}>
        <option value="Todos">Todos los responsables</option>
        {TECHS.map((t) => (
          <option key={`ft-${t}`} value={t}>{t}</option>
        ))}
      </select>

      {dirty && (
        <button
          type="button"
          onClick={() => onChange({ query: '', stage: 'Todas', priority: 'Todas', tech: 'Todos', orderType: 'Todas' })}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <FilterX className="h-4 w-4" /> Limpiar
        </button>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        <span className="font-semibold tabular text-foreground">{shown}</span> de <span className="tabular">{total}</span> exámenes
      </span>
    </div>
  );
}
