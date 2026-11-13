'use client';

import React, { useState } from 'react';
import { Loader2, Search, FileCheck } from 'lucide-react';
import { portalLookup, type PortalResult } from '@/lib/supabase/portal';

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30';

export default function PortalWorkspace() {
  const [cedula, setCedula] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<PortalResult[] | null>(null);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRows(null);
    if (!cedula.trim() || !code.trim()) {
      setError('Ingrese cédula y código de la orden');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await portalLookup(cedula, code);
      if (err) {
        setError(err.message || 'No se pudo consultar');
        return;
      }
      const list = (data as PortalResult[]) ?? [];
      if (list.length === 0) {
        setError('No hay resultados validados para esos datos. Verifique cédula y código de orden.');
        return;
      }
      setRows(list);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSearch} className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h1 className="text-lg font-bold text-foreground">Consulta de resultados</h1>
        <p className="text-sm text-muted-foreground">
          Use la cédula del paciente y el código de la solicitud (ej. REQ-…). Solo se muestran
          exámenes ya validados o entregados.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputCls}
            placeholder="Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            autoComplete="off"
          />
          <input
            className={inputCls}
            placeholder="Código de orden"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar
        </button>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {rows && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileCheck className="h-4 w-4 text-primary" />
            {rows[0]?.patient_name} · {rows[0]?.cedula}
            {rows[0]?.laboratory_name ? ` · ${rows[0].laboratory_name}` : ''}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Examen', 'Resultado', 'Unidad', 'Rango', 'Validado'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.request_code}-${r.exam_name}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.exam_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.category} · {r.request_code}</div>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {r.result ?? '—'}
                      {r.result_flag ? ` (${r.result_flag})` : ''}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.result_unit ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.result_range ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.validated_at ? new Date(r.validated_at).toLocaleString('es-EC') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
