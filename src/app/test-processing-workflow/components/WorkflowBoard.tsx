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
  resultRange?: string;
  resultUnit?: string;
  resultFlag?: string;
  note?: string;
  minutesElapsed: number;
};

function detectFlag(result: string, range?: string | null): 'normal' | 'alto' | 'bajo' | undefined {
  if (!range || !result) return undefined;
  const num = parseFloat(result.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  if (Number.isNaN(num)) return undefined;

  const between = range.match(/([\d.,]+)\s*[-–]\s*([\d.,]+)/);
  if (between) {
    const low = parseFloat(between[1].replace(',', '.'));
    const high = parseFloat(between[2].replace(',', '.'));
    if (num < low) return 'bajo';
    if (num > high) return 'alto';
    return 'normal';
  }
  const lt = range.match(/<\s*([\d.,]+)/);
  if (lt) {
    const limit = parseFloat(lt[1].replace(',', '.'));
    return num >= limit ? 'alto' : 'normal';
  }
  const gt = range.match(/>\s*([\d.,]+)/);
  if (gt) {
    const limit = parseFloat(gt[1].replace(',', '.'));
    return num <= limit ? 'bajo' : 'normal';
  }
  return undefined;
}

function mapRow(row: any): WorkflowTest {
  const p = row.patients;
  const name = p
    ? [p.apellido_paterno, p.apellido_materno, p.primer_nombre].filter(Boolean).join(' ')
    : '—';
  const started = row.stage_started_at ? new Date(row.stage_started_at).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((Date.now() - started) / 60000));

  const doctor = row.exam_requests?.requesting_doctor?.trim() || '—';
  const tech = row.tech_name?.trim() || '—';
  const validator = row.validator_name?.trim() || '—';

  return {
    id: row.id,
    code: row.code,
    exam: row.exam_name,
    patient: name,
    cedula: p?.cedula ?? '',
    sample: row.samples?.code ?? (row.sample_id ? String(row.sample_id).slice(0, 8) : '—'),
    orderType: row.exam_requests?.order_type ?? '—',
    priority: row.priority,
    stage: row.stage as Stage,
    doctor,
    tech,
    validator,
    category: row.category,
    result: row.result ?? undefined,
    resultRange: row.result_range ?? undefined,
    resultUnit: row.result_unit ?? undefined,
    resultFlag: row.result_flag ?? undefined,
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

  const techOptions = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.tech && t.tech !== '—') set.add(t.tech);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [tests]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return tests.filter((t) => {
      const mq =
        !q ||
        t.patient.toLowerCase().includes(q) ||
        t.exam.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.cedula.toLowerCase().includes(q) ||
        t.sample.toLowerCase().includes(q) ||
        t.doctor.toLowerCase().includes(q) ||
        t.tech.toLowerCase().includes(q) ||
        t.validator.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);

      const ms = filters.stage === 'Todas' || t.stage === filters.stage;
      const mp = filters.priority === 'Todas' || t.priority === filters.priority;
      const mo = filters.orderType === 'Todas' || t.orderType === filters.orderType;

      let mt = true;
      if (filters.tech === 'Sin asignar') {
        mt = !t.tech || t.tech === '—';
      } else if (filters.tech !== 'Todos') {
        mt = t.tech === filters.tech;
      }

      return mq && ms && mp && mo && mt;
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

    if ((t.stage === 'En proceso' || t.stage === 'Resultado ingresado') && !t.result?.trim()) {
      setToast('Debe ingresar el resultado del examen antes de continuar.');
      setOpenId(id);
      return;
    }

    let next = NEXT_STAGE[t.stage] ?? t.stage;
    if (t.stage === 'En proceso' && t.result?.trim()) {
      next = 'Resultado ingresado';
    }

    const { error: err } = await updateTestStage(id, next);
    if (err) {
      setToast(err.message);
      return;
    }
    setTests((prev) => prev.map((x) => (x.id === id ? { ...x, stage: next } : x)));
    setToast(`Examen avanzado a: ${next}`);
  };

  const saveResult = async (id: string, result: string) => {
    const t = tests.find((x) => x.id === id);
    if (!result.trim()) {
      setToast('Ingrese un valor de resultado.');
      return;
    }

    const flag = detectFlag(result, t?.resultRange);
    const { error: err } = await updateTestStage(id, 'Resultado ingresado', {
      result: result.trim(),
      result_flag: flag,
    });
    if (err) {
      setToast(err.message);
      return;
    }

    await reload();

    if (flag === 'alto') {
      setToast('Resultado guardado. ⚠ Valor ALTO respecto al rango de referencia.');
    } else if (flag === 'bajo') {
      setToast('Resultado guardado. ⚠ Valor BAJO respecto al rango de referencia.');
    } else {
      setToast('Resultado ingresado. Pendiente de validación.');
    }
  };

  const approve = async (id: string) => {
    const t = tests.find((x) => x.id === id);
    if (!t?.result?.trim()) {
      setToast('No se puede validar: falta el resultado del examen.');
      return;
    }
    const { error: err } = await updateTestStage(id, 'Validado');
    if (err) {
      setToast(err.message);
      return;
    }
    await reload();
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
        x.id === id ? { ...x, stage: 'Solicitado' as Stage, note: `Muestra rechazada: ${reason}` } : x
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
        techOptions={techOptions}
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
