'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, FlaskConical } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import {
  createQcDefinition,
  listQcDefinitions,
  listQcRuns,
  qcRegisterRun,
  type QcDefinition,
  type QcRun,
} from '@/lib/supabase/qc';

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30';

export default function QcWorkspace() {
  const [defs, setDefs] = useState<QcDefinition[]>([]);
  const [runs, setRuns] = useState<QcRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [examCode, setExamCode] = useState('q-01');
  const [name, setName] = useState('Control normal');
  const [target, setTarget] = useState('100');
  const [sd, setSd] = useState('5');
  const [minV, setMinV] = useState('');
  const [maxV, setMaxV] = useState('');
  const [runDef, setRunDef] = useState('');
  const [runVal, setRunVal] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([listQcDefinitions(), listQcRuns(undefined, 40)]);
      if (!d.error) setDefs((d.data as QcDefinition[]) ?? []);
      if (!r.error) setRuns((r.data as QcRun[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onCreate = async () => {
    setSaving(true);
    try {
      const { error } = await createQcDefinition({
        exam_code: examCode,
        name,
        target: target ? Number(target) : null,
        sd: sd ? Number(sd) : null,
        min_value: minV ? Number(minV) : null,
        max_value: maxV ? Number(maxV) : null,
      });
      if (error) setToast(error.message);
      else {
        setToast('Control configurado');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const onRun = async () => {
    if (!runDef || !runVal) {
      setToast('Seleccione control y valor medido');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await qcRegisterRun(runDef, Number(runVal));
      if (error) setToast(error.message);
      else {
        const st = (data as any)?.status;
        setToast(st === 'out_of_control' ? 'Corrida FUERA de control' : 'Corrida en control');
        setRunVal('');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando QC…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Plus className="h-4 w-4" /> Definir control
          </h2>
          <p className="text-xs text-muted-foreground">
            exam_code del catálogo (ej. q-01). Fuera de control si &gt;2 SD del target o fuera de min/max.
          </p>
          <input className={inputCls} value={examCode} onChange={(e) => setExamCode(e.target.value)} placeholder="exam_code" />
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" />
            <input className={inputCls} value={sd} onChange={(e) => setSd(e.target.value)} placeholder="SD" />
            <input className={inputCls} value={minV} onChange={(e) => setMinV(e.target.value)} placeholder="Min (opc)" />
            <input className={inputCls} value={maxV} onChange={(e) => setMaxV(e.target.value)} placeholder="Max (opc)" />
          </div>
          <button type="button" disabled={saving} onClick={onCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Guardar definición
          </button>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <FlaskConical className="h-4 w-4" /> Registrar corrida
          </h2>
          <select className={inputCls} value={runDef} onChange={(e) => setRunDef(e.target.value)}>
            <option value="">Seleccione control…</option>
            {defs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.exam_code} · {d.name}
              </option>
            ))}
          </select>
          <input className={inputCls} value={runVal} onChange={(e) => setRunVal(e.target.value)} placeholder="Valor medido" />
          <button type="button" disabled={saving} onClick={onRun} className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary">
            Registrar
          </button>
        </section>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-bold">Definiciones activas</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              {['Código', 'Nombre', 'Target', 'SD', 'Min', 'Max'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {defs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin controles</td></tr>
            ) : (
              defs.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{d.exam_code}</td>
                  <td className="px-3 py-2">{d.name}</td>
                  <td className="px-3 py-2 tabular">{d.target ?? '—'}</td>
                  <td className="px-3 py-2 tabular">{d.sd ?? '—'}</td>
                  <td className="px-3 py-2 tabular">{d.min_value ?? '—'}</td>
                  <td className="px-3 py-2 tabular">{d.max_value ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-bold">Últimas corridas</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              {['Fecha', 'Examen', 'Valor', 'Estado', 'Usuario'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.run_at).toLocaleString('es-EC')}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.exam_code}</td>
                <td className="px-3 py-2 tabular font-semibold">{r.measured_value}</td>
                <td className="px-3 py-2">
                  <Badge tone={r.status === 'in_control' ? 'success' : 'danger'}>{r.status}</Badge>
                </td>
                <td className="px-3 py-2 text-xs">{r.user_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
