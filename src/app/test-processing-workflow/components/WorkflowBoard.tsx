'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage } from '@/lib/labData';
import StagePipeline from './StagePipeline';
import WorkflowFilters, { FilterState } from './WorkflowFilters';
import WorkflowTable from './WorkflowTable';
import TestDrawer from './TestDrawer';
import Toast from '@/components/ui/Toast';
import { listTests, updateTestStage } from '@/lib/supabase/api';
import { Loader2 } from 'lucide-react';

const NEXT_STAGE: Record<string, Stage> = {
  Solicitado: 'Muestra recolectada',
  'Muestra recolectada': 'Recibida en laboratorio',
  'Recibida en laboratorio': 'En proceso',
  'En proceso': 'Resultado ingresado',
  'Resultado ingresado': 'Validado',
  Validado: 'Entregado',
  Entregado: 'Entregado',
};

type WorkflowTest = {
  id: string;
  code: string;
  exam: string;
  patient: string;
  cedula: string;
  sample: string;
  orderType: string;
  priority: string;
  stage: Stage;
  doctor: string;
  tech: string;
  validator: string;
  category: string;
  result?: string;
  note?: string;
  minutesElapsed: number;
};

function mapRow(row: any): WorkflowTest {
  const p = row.patients;
  const name = p
    ? [p.apellido_paterno, p.apellido_materno, p.primer_nombre].filter(Boolean).join(' ')
    : '\u2014';
  const started = row.stage_started_at ? new Date(row.stage_started_at).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((Date.now() - started) / 60000));
  return {
    id: row.id,
    code: row.code,
    exam: row.exam_name,
    patient: name,
    cedula: p?.cedula ?? '',
    sample: row.sample_id ? String(row.sample_id).slice(0, 8) : '\u2014',
    orderType: row.exam_requests?.order_type ?? '\u2014',
    priority: row.priority,
    stage: row.stage as Stage,
    doctor: '\u2014',
    tech: '\u2014',
    validator: '\u2014',
    category: row.category,
    result: row.result ?? undefined,
    note: row.note ?? undefined,
    minutesElapsed: minutes,
  };
}

export default function WorkflowBoard() {
  const [tests, setTests] = useState<WorkflowTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    stage: 'Todas',
    priority: 'Todas',
    tech: 'Todos',
    orderType: 'Todas',
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await listTests();
      if (err) {
        setError(err.message);
        setTests([]);
      } else {
        setTests(((data as any[]) ?? []).map(mapRow));
      }
    } catch {
      setError('No se pudo cargar el workflow desde Supabase.');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tests.filter((t) => {
      const mq =
        !q ||
        t.patient.toLowerCase().includes(q) ||
        t.exam.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.cedula.includes(q);
      const ms = filters.stage === 'Todas' || t.stage === filters.stage;
      const mp = filters.priority === 'Todas' || t.priority === filters.priority;
      const mo = filters.orderType === 'Todas' || t.orderType === filters.orderType;
      return mq && ms && mp && mo;
    });
  }, [tests, filters]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    tests.forEach((t) => {
      out[t.stage] = (out[t.stage] ?? 0) + 1;
    });
    return out;
  }, [tests]);

  const opened = tests.find((t) => t.id === openId) ?? null;

  const advance = async (id: string) => {
    const t = tests.find((x) => x.id === id);
    if (!t) return;
    const next = NEXT_STAGE[t.stage] ?? t.stage;
    const { error: err } = await updateTestStage(id, next);
    if (err) {
      setToast(err.message);
      return;
    }
    setTests((prev) => prev.map((x) => (x.id === id ? { ...x, stage: next } : x)));
    setToast('Examen avanzado a la siguiente etapa.');
  };

  const saveResult = async (id: string, result: string) => {
    const { error: err } = await updateTestStage(id, 'Resultado ingresado', { result });
    if (err) {
      setToast(err.message);
      return;
    }
    setTests((prev) =>
      prev.map((x) => (x.id === id ? { ...x, result, stage: 'Resultado ingresado' } : x))
    );
    setToast('Resultado ingresado. Pendiente de validacion.');
  };

  const approve = async (id: string) => {
    const { error: err } = await updateTestStage(id, 'Validado');
    if (err) {
      setToast(err.message);
      return;
    }
    setTests((prev) => prev.map((x) => (x.id === id ? { ...x, stage: 'Validado' } : x)));
    setToast('Resultado validado.');
  };

  const reject = async (id: string, reason: string) => {
    const { error: err } = await updateTestStage(id, 'Solicitado', {
      note: `Muestra rechazada: ${reason}`,
    });
    if (err) {
      setToast(err.message);
      return;
    }
    setTests((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, stage: 'Solicitado', note: `Muestra rechazada: ${reason}` } : x
      )
    );
    setOpenId(null);
    setToast('Muestra rechazada.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando workflow...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}{' '}
          <button type="button" className="underline" onClick={reload}>
            Reintentar
          </button>
        </p>
      )}
      <StagePipeline
        counts={counts}
        active={filters.stage}
        onSelect={(s) => setFilters((f) => ({ ...f, stage: f.stage === s ? 'Todas' : s }))}
      />
      <WorkflowFilters
        filters={filters}
        onChange={setFilters}
        total={tests.length}
        shown={filtered.length}
      />
      <WorkflowTable
        tests={filtered as any}
        onOpen={setOpenId}
        onAdvance={advance}
        onResetFilters={() =>
          setFilters({ query: '', stage: 'Todas', priority: 'Todas', tech: 'Todos', orderType: 'Todas' })
        }
      />
      {opened && (
        <TestDrawer
          test={opened as any}
          onClose={() => setOpenId(null)}
          onSaveResult={saveResult}
          onApprove={approve}
          onReject={reject}
          onAdvance={advance}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
