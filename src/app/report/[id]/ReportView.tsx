'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer, Loader2, AlertTriangle } from 'lucide-react';
import { getReportData, type ReportData, type ReportTest } from '@/lib/supabase/reports';
import { CATEGORIES, TUBES } from '@/lib/labData';
import { evalFlag, FLAG_LABEL } from '@/lib/resultFlags';
import {
  isUroanalisis,
  parseUroResult,
  URO_SECTIONS,
  type UroValues,
} from '@/lib/uroanalisisPanel';

const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const PRINT_CSS = `
  @page { size: A4; margin: 10mm 12mm 14mm; }
  @media print {
    html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .report-sheet {
      box-shadow: none !important;
      margin: 0 !important;
      width: auto !important;
      max-width: none !important;
      padding: 0 !important;
      min-height: 0 !important;
      border: none !important;
      border-radius: 0 !important;
    }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .print-accent { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function InfoCell({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="truncate text-[12px] font-semibold text-slate-900">{value || '—'}</p>
    </div>
  );
}

function UroReportTable({ values }: { values: UroValues }) {
  return (
    <div className="mt-2 space-y-3">
      {URO_SECTIONS.map((section) => {
        const rows = section.fields.filter((f) => {
          const val = (values[f.key] || '').trim();
          return val && val !== '—';
        });
        if (rows.length === 0) return null;
        return (
          <div key={section.id} className="avoid-break overflow-hidden rounded border border-slate-200">
            <div className="print-accent bg-[#0f766e] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {section.title}
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="w-[42%] px-3 py-1.5">Prueba</th>
                  <th className="w-[28%] px-3 py-1.5">Resultado</th>
                  <th className="w-[30%] px-3 py-1.5">Valores de referencia</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f, i) => (
                  <tr key={f.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                    <td className="border-t border-slate-100 px-3 py-1 font-medium text-slate-700">{f.label}</td>
                    <td className="border-t border-slate-100 px-3 py-1 font-bold text-slate-900">{values[f.key]}</td>
                    <td className="border-t border-slate-100 px-3 py-1 text-slate-500">{f.ref ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function isStructuredResult(result: string | null, examName: string, category: string): boolean {
  if (!result) return false;
  if (isUroanalisis(examName, category)) return true;
  return result.includes('\n') && result.length > 40;
}

function SimpleResultRow({ t, zebra }: { t: ReportTest; zebra: boolean }) {
  const kind = evalFlag(t.result, t.range, t.flag);
  const abnormal = Boolean(kind);
  return (
    <React.Fragment>
      <tr className={`${zebra ? 'bg-slate-50/70' : 'bg-white'} ${abnormal ? 'bg-red-50/60' : ''}`}>
        <td className="border-t border-slate-100 px-3 py-1.5 font-semibold text-slate-800">{t.examName}</td>
        <td className={`border-t border-slate-100 px-3 py-1.5 text-right text-[12px] ${
          abnormal ? 'font-extrabold text-red-700' : 'font-bold text-slate-900'
        }`}>
          {t.result ?? '—'}
        </td>
        <td className="border-t border-slate-100 px-3 py-1.5 text-slate-500">
          {t.unit && t.unit !== '-' ? t.unit : ''}
        </td>
        <td className="border-t border-slate-100 px-3 py-1.5 text-slate-500">
          {t.range && t.range !== 'Ver informe' ? t.range : ''}
        </td>
        <td className={`border-t border-slate-100 px-3 py-1.5 text-[10px] font-bold ${
          abnormal ? 'text-red-700' : 'text-emerald-700'
        }`}>
          {kind ? FLAG_LABEL[kind] : 'Normal'}
        </td>
      </tr>
      {t.note && (
        <tr className={zebra ? 'bg-slate-50/70' : 'bg-white'}>
          <td colSpan={5} className="px-3 pb-1.5 text-[10px] italic text-slate-500">
            Observación: {t.note}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function StructuredResultBlock({ t }: { t: ReportTest }) {
  const isUro = isUroanalisis(t.examName, t.category);
  const uroValues = isUro ? parseUroResult(t.result) : null;
  const hasUroData = uroValues && Object.values(uroValues).some((v) => v && v.trim() && v !== '—');

  return (
    <div className="avoid-break border-t border-slate-100 px-3 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">{t.examName}</p>
      {isUro && hasUroData ? (
        <UroReportTable values={uroValues!} />
      ) : (
        <pre className="mt-1 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-800">{t.result}</pre>
      )}
      {t.note && <p className="mt-1 text-[10px] italic text-slate-500">Observación: {t.note}</p>}
    </div>
  );
}

export default function ReportView({ requestId }: { requestId: string }) {
  const [autoPrint, setAutoPrint] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setAutoPrint(new URLSearchParams(window.location.search).get('print') === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    getReportData(requestId).then(({ data: d, error: e }) => {
      if (!alive) return;
      if (e || !d) setError(e ?? 'No se pudo cargar el informe.');
      else setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [requestId]);

  useEffect(() => {
    if (!loading && data && autoPrint && (data.tests ?? []).some((t) => t.ready)) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [loading, data, autoPrint]);

  const ready = useMemo(() => (data?.tests ?? []).filter((t) => t.ready), [data]);
  const pending = useMemo(() => (data?.tests ?? []).filter((t) => !t.ready), [data]);

  const groups = useMemo(() => {
    const map = new Map<string, ReportTest[]>();
    ready.forEach((t) => map.set(t.category, [...(map.get(t.category) ?? []), t]));
    const order: string[] = [...CATEGORIES];
    return Array.from(map.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [ready]);

  const validators = useMemo(
    () => Array.from(new Set(ready.map((t) => t.validatedBy).filter(Boolean))) as string[],
    [ready]
  );
  const processors = useMemo(
    () => Array.from(new Set(ready.map((t) => t.processedBy).filter(Boolean))) as string[],
    [ready]
  );
  const lastValidation = useMemo(
    () => ready.map((t) => t.validatedAt).filter(Boolean).sort().slice(-1)[0] ?? null,
    [ready]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Preparando el informe...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-semibold">No se puede mostrar este informe</p>
        <p className="text-xs text-muted-foreground">{error || 'La orden no existe o no tiene permiso para verla.'}</p>
        <button type="button" onClick={() => window.history.back()} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          Volver
        </button>
      </div>
    );
  }

  const { laboratory: lab, request: req, patient: p } = data;
  const partial = pending.length > 0;
  const noResults = ready.length === 0;
  const place = [lab.city, lab.province].filter(Boolean).join(', ');
  const collected = data.samples.map((s) => s.collectedAt).filter(Boolean).sort()[0] ?? null;
  const collectors = Array.from(new Set(data.samples.map((s) => s.collectedBy).filter(Boolean))) as string[];
  const initials = (lab.name || 'LF')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-slate-200/80 py-6 print:bg-white print:py-0">
      <style>{PRINT_CSS}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={noResults}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0d9488] disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Imprimir PDF
        </button>
      </div>

      <article
        className="report-sheet mx-auto w-full max-w-[210mm] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl print:rounded-none print:border-0 print:shadow-none"
        style={{ minHeight: '297mm' }}
      >
        {/* Barra superior de acento */}
        <div className="print-accent h-1.5 w-full bg-[#0f766e]" />

        <div className="px-6 pt-5 pb-6 sm:px-8">
          {/* Encabezado */}
          <header className="flex items-start gap-4 border-b border-slate-200 pb-4">
            <div className="print-accent flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0f766e] text-lg font-extrabold tracking-tight text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold uppercase leading-tight tracking-wide text-slate-900 sm:text-xl">
                {lab.name}
              </h1>
              <div className="mt-0.5 space-y-0.5 text-[11px] text-slate-500">
                {lab.institution && <p className="font-medium text-slate-600">{lab.institution}</p>}
                {lab.unit && <p>{lab.unit}</p>}
                <p>
                  {[lab.uoCode && `COD. UO ${lab.uoCode}`, lab.locationCode && `Loc. ${lab.locationCode}`, place]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f766e]">Informe de laboratorio</p>
              <p className="mt-1 font-mono text-sm font-extrabold text-slate-900">{req.code}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Emitido: {fmtDateTime(data.issuedAt)}</p>
            </div>
          </header>

          {partial && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              INFORME PARCIAL — {pending.length} examen{pending.length === 1 ? '' : 'es'} pendiente
              {pending.length === 1 ? '' : 's'} de validación
            </div>
          )}

          {/* Datos paciente / solicitud */}
          <section className="avoid-break mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-[#0f766e]">
                Datos del paciente
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="col-span-2">
                  <InfoCell label="Paciente" value={p.name} />
                </div>
                <InfoCell label="Cédula" value={p.cedula} />
                <InfoCell label="Historia clínica" value={p.historia} />
                <InfoCell label="Edad" value={p.age != null ? `${p.age} años` : null} />
                <InfoCell label="Sexo" value={p.sex === 'F' ? 'Mujer' : p.sex === 'M' ? 'Hombre' : null} />
                <div className="col-span-2">
                  <InfoCell
                    label="Procedencia"
                    value={[p.parroquia, p.canton, p.province].filter(Boolean).join(', ') || null}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-[#0f766e]">
                Datos de la solicitud
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="col-span-2">
                  <InfoCell label="Médico solicitante" value={req.requestingDoctor} />
                </div>
                <InfoCell label="Tipo de atención" value={req.orderType} />
                <InfoCell label="Prioridad" value={req.priority} />
                <InfoCell label="Establecimiento" value={req.facility} />
                <InfoCell label="Solicitud" value={fmtDateTime(req.createdAt)} />
                <InfoCell label="Toma de muestra" value={collected ? fmtDateTime(collected) : null} />
                <div className="col-span-2">
                  <InfoCell label="Diagnóstico / motivo" value={req.diagnosis} />
                </div>
              </div>
            </div>
          </section>

          {/* Resultados */}
          {noResults ? (
            <p className="mt-8 rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
              Esta orden aún no tiene resultados validados.
            </p>
          ) : (
            groups.map(([cat, list]) => {
              const simple = list.filter((t) => !isStructuredResult(t.result, t.examName, t.category));
              const structured = list.filter((t) => isStructuredResult(t.result, t.examName, t.category));
              return (
                <section key={cat} className="mt-5 avoid-break">
                  <div className="print-accent flex items-center gap-2 rounded-t-lg bg-[#134e4a] px-3 py-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">{cat}</span>
                    <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
                      {list.length} prueba{list.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {simple.length > 0 && (
                    <div className="overflow-hidden rounded-b-lg border border-t-0 border-slate-200">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Examen</th>
                            <th className="px-3 py-2 text-right">Resultado</th>
                            <th className="px-3 py-2">Unidad</th>
                            <th className="px-3 py-2">Referencia</th>
                            <th className="px-3 py-2">Interp.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simple.map((t, i) => (
                            <SimpleResultRow key={t.id} t={t} zebra={i % 2 === 1} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {structured.length > 0 && (
                    <div className={`${simple.length > 0 ? 'mt-0 border-t-0' : 'rounded-b-lg'} border border-slate-200`}>
                      {structured.map((t) => (
                        <StructuredResultBlock key={t.id} t={t} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}

          {partial && !noResults && (
            <section className="avoid-break mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                Pendientes de resultado
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">{pending.map((t) => t.examName).join(' · ')}</p>
            </section>
          )}

          {data.samples.length > 0 && (
            <section className="avoid-break mt-4 rounded-lg border border-slate-200 px-3 py-2.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Muestras</p>
              <p className="mt-0.5 text-[11px] text-slate-700">
                {data.samples
                  .map((s) => `${s.code} (${(TUBES as any)[s.tube]?.label ?? s.tube})`)
                  .join(' · ')}
                {collectors.length > 0 ? ` — Toma: ${collectors.join(', ')}` : ''}
              </p>
            </section>
          )}

          {/* Firmas */}
          {!noResults && (
            <section className="avoid-break mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-1.5 text-[11px]">
                <p>
                  <span className="text-slate-400">Procesado por:</span>{' '}
                  <span className="font-semibold text-slate-800">{processors.join(', ') || '—'}</span>
                </p>
                <p>
                  <span className="text-slate-400">Validado por:</span>{' '}
                  <span className="font-semibold text-slate-800">{validators.join(', ') || '—'}</span>
                </p>
                <p>
                  <span className="text-slate-400">Fecha de validación:</span>{' '}
                  <span className="font-semibold text-slate-800">{fmtDateTime(lastValidation)}</span>
                </p>
              </div>
              <div className="flex flex-col items-center justify-end pt-6">
                <div className="w-full max-w-[220px] border-t-2 border-slate-800 pt-2 text-center">
                  <p className="text-[12px] font-bold text-slate-900">
                    {validators[0] ?? 'Responsable del laboratorio'}
                  </p>
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                    Firma y sello del responsable
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Pie */}
          <footer className="mt-8 border-t border-slate-200 pt-3 text-center text-[9px] leading-relaxed text-slate-400">
            <p>
              Los resultados corresponden exclusivamente a las muestras recibidas y fueron validados
              por personal autorizado del laboratorio.
            </p>
            <p className="mt-0.5 font-medium text-slate-500">
              LabFlow · Orden {req.code} · {lab.name}
            </p>
          </footer>
        </div>

        <div className="print-accent h-1 w-full bg-[#0f766e]/30" />
      </article>
    </div>
  );
}
