'use client';
import React, { useMemo, useState } from 'react';
import { WORKFLOW_TESTS, WorkflowTest, Stage } from '@/lib/labData';
import StagePipeline from './StagePipeline';
import WorkflowFilters, { FilterState } from './WorkflowFilters';
import WorkflowTable from './WorkflowTable';
import TestDrawer from './TestDrawer';
import Toast from '@/components/ui/Toast';

const NEXT_STAGE: Record<Stage, Stage> = {
  Solicitado: 'Muestra recolectada',
  'Muestra recolectada': 'Recibida en laboratorio',
  'Recibida en laboratorio': 'En proceso',
  'En proceso': 'Resultado ingresado',
  'Resultado ingresado': 'Validado',
  Validado: 'Entregado',
  Entregado: 'Entregado',
};

export default function WorkflowBoard() {
  const [tests, setTests] = useState<WorkflowTest[]>(WORKFLOW_TESTS);
  const [filters, setFilters] = useState<FilterState>({ query: '', stage: 'Todas', priority: 'Todas', tech: 'Todos', orderType: 'Todas' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tests.filter((t) => {
      const mq = !q || t.patient.toLowerCase().includes(q) || t.exam.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.cedula.includes(q);
      const ms = filters.stage === 'Todas' || t.stage === filters.stage;
      const mp = filters.priority === 'Todas' || t.priority === filters.priority;
      const mt = filters.tech === 'Todos' || t.tech === filters.tech;
      const mo = filters.orderType === 'Todas' || t.orderType === filters.orderType;
      return mq && ms && mp && mt && mo;
    });
  }, [tests, filters]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    tests.forEach((t) => (out[t.stage] = (out[t.stage] ?? 0) + 1));
    return out;
  }, [tests]);

  const opened = tests.find((t) => t.id === openId) ?? null;

  const advance = (id: string) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, stage: NEXT_STAGE[t.stage] } : t)));
    setToast('Examen avanzado a la siguiente etapa.');
  };

  const saveResult = (id: string, result: string) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, result, stage: 'Resultado ingresado' } : t)));
    setToast('Resultado ingresado. Pendiente de validación.');
  };

  const approve = (id: string) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, stage: 'Validado' } : t)));
    setToast('Resultado validado por el responsable.');
  };

  const reject = (id: string, reason: string) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, stage: 'Solicitado', note: `Muestra rechazada: ${reason}` } : t)));
    setOpenId(null);
    setToast('Muestra rechazada y devuelta a toma de muestras.');
  };

  return (
    <div className="space-y-5">
      <StagePipeline
        counts={counts}
        active={filters.stage}
        onSelect={(s) => setFilters((f) => ({ ...f, stage: f.stage === s ? 'Todas' : s }))}
      />
      <WorkflowFilters filters={filters} onChange={setFilters} total={tests.length} shown={filtered.length} />
      <WorkflowTable tests={filtered} onOpen={setOpenId} onAdvance={advance} onResetFilters={() => setFilters({ query: '', stage: 'Todas', priority: 'Todas', tech: 'Todos', orderType: 'Todas' })} />
      {opened && (
        <TestDrawer test={opened} onClose={() => setOpenId(null)} onSaveResult={saveResult} onApprove={approve} onReject={reject} onAdvance={advance} />
      )}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
