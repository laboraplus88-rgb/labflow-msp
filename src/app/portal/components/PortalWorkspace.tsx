'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search, FileCheck, Printer, Download, LogOut } from 'lucide-react';
import { portalAuth, type PortalAuthResponse, type PortalOrder } from '@/lib/supabase/portal';

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30';

function printOrder(patientName: string, cedula: string, order: PortalOrder) {
  const rows = order.exams
    .map(
      (e) =>
        `<tr>
          <td style="padding:6px;border:1px solid #ddd">${e.exam_name}</td>
          <td style="padding:6px;border:1px solid #ddd">${e.result ?? '—'} ${e.result_flag ? '(' + e.result_flag + ')' : ''}</td>
          <td style="padding:6px;border:1px solid #ddd">${e.result_unit ?? '—'}</td>
          <td style="padding:6px;border:1px solid #ddd">${e.result_range ?? '—'}</td>
          <td style="padding:6px;border:1px solid #ddd">${e.validated_at ? new Date(e.validated_at).toLocaleString('es-EC') : '—'}</td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><title>Informe ${order.request_code}</title>
    <meta charset="utf-8"/>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 4px}
      .meta{color:#555;font-size:12px;margin-bottom:16px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th{background:#f3f4f6;text-align:left;padding:6px;border:1px solid #ddd}
    </style></head><body>
    <h1>Informe de laboratorio</h1>
    <div class="meta">
      <div><strong>${patientName}</strong> · Cédula ${cedula}</div>
      <div>Orden ${order.request_code}${order.laboratory_name ? ' · ' + order.laboratory_name : ''}</div>
      <div>Generado ${new Date().toLocaleString('es-EC')} · LabFlow</div>
    </div>
    <table>
      <thead><tr><th>Examen</th><th>Resultado</th><th>Unidad</th><th>Rango</th><th>Validado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:24px;font-size:11px;color:#666">Documento informativo. Conserve este archivo o imprímalo desde su navegador (Guardar como PDF).</p>
    </body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function PortalWorkspace() {
  const [cedula, setCedula] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<PortalAuthResponse | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const selectedOrder = useMemo(() => {
    if (!session?.orders?.length) return null;
    if (selectedCode) return session.orders.find((o) => o.request_code === selectedCode) ?? session.orders[0];
    return session.orders[0];
  }, [session, selectedCode]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSession(null);
    if (!cedula.trim() || !secret.trim()) {
      setError('Ingrese cédula y PIN (6 dígitos) o código de orden');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await portalAuth(cedula, secret);
      if (err) {
        setError(err.message || 'No se pudo consultar');
        return;
      }
      const payload = data as PortalAuthResponse;
      if (!payload?.orders?.length) {
        setError('No hay resultados validados para estos datos.');
        return;
      }
      setSession(payload);
      setSelectedCode(payload.orders[0]?.request_code ?? null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    setSecret('');
    setSelectedCode(null);
    setError('');
  };

  if (session && selectedOrder) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileCheck className="h-4 w-4 text-primary" />
              {session.patient.name}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cédula {session.patient.cedula}
              {selectedOrder.laboratory_name ? ` · ${selectedOrder.laboratory_name}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {session.orders.length} orden(es) con resultados validados
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => printOrder(session.patient.name, session.patient.cedula, selectedOrder)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>

        {session.orders.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {session.orders.map((o) => (
              <button
                key={o.request_id}
                type="button"
                onClick={() => setSelectedCode(o.request_code)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedCode === o.request_code
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {o.request_code}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold">Orden {selectedOrder.request_code}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedOrder.request_created_at).toLocaleString('es-EC')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => printOrder(session.patient.name, session.patient.cedula, selectedOrder)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Download className="h-3.5 w-3.5" /> Descargar informe
            </button>
          </div>
          <div className="overflow-x-auto">
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
                {selectedOrder.exams.map((r, i) => (
                  <tr key={`${selectedOrder.request_code}-${r.exam_name}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.exam_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.category}</div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSearch} className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h1 className="text-lg font-bold text-foreground">Consulta de resultados</h1>
        <p className="text-sm text-muted-foreground">
          Ingrese su <strong>cédula</strong> y el <strong>PIN de 6 dígitos</strong> que le entregó el laboratorio,
          o el <strong>código de la orden</strong> (ej. REQ-…). Solo se muestran exámenes validados o entregados.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputCls}
            placeholder="Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            autoComplete="off"
            inputMode="numeric"
          />
          <input
            className={inputCls}
            placeholder="PIN (6 dígitos) o código de orden"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
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
      <p className="text-center text-xs text-muted-foreground">
        Máximo 10 intentos cada 15 minutos por cédula. Si no tiene PIN, solicítelo en el laboratorio.
      </p>
    </div>
  );
}
