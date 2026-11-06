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
  @page { size: A4; margin: 12mm 12mm 18mm; }
  @media print {
    html, body { background: #fff !important; }
    .no-print { display: none !important; }
    .report-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; max-width: none !important; padding: 0 !important; min-height: 0 !important; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .report-footer { position: fixed; left: 0; right: 0; bottom: 0; }
  }
`;

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <p className="text-[11px] leading-snug">
      <span className="font-semibold text-slate-500">{label}: </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </p>
  );
}

/** Tabla de uroanálisis estilo informe clínico */
function UroReportTable({ values }: { values: UroValues }) {
  return (
    <div className="mt-1">
      {URO_SECTIONS.map((section) => (
        <div key={section.id} className="mb-2 avoid-break">
          <p className="bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-800">
            {section.title}
          </p>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[9px] font-bold uppercase tracking-wide text-slate-500">
                <th className="w-[40%] px-2 py-1">Prueba</th>
                <th className="w-[30%] px-2 py-1">Resultado</th>
                <th className="w-[30%] px-2 py-1">Valores de Ref.</th>
              </tr>
            </thead>
            <tbody>
              {section.fields.map((f) => {
                const val = (values[f.key] || '').trim();
                if (!val || val === '—') return null;
                return (
                  <tr key={f.key} className="border-b border-slate-150 border-slate-100">
                    <td className="px-2 py-0.5 font-medium text-slate-800">{f.label}</td>
                    <td className="px-2 py-0.5 font-bold text-slate-900">{val}</td>
                    <td className="px-2 py-0.5 text-slate-500">{f.ref ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** Detecta si el texto de resultado es un informe multilínea estructurado */
function isStructuredResult(result: string | null, examName: string, category: string): boolean {
  if (!result) return false;
  if (isUroanalisis(examName, category)) return true;
  return result.includes('\n') && result.length > 40;
}

function SimpleResultRow({ t }: { t: ReportTest }) {
  const kind = evalFlag(t.result, t.range, t.flag);
  return (
    <React.Fragment>
      <tr className="border-b border-slate-200">
        <td className="px-2 py-1.5 font-semibold">{t.examName}</td>
        <td
          className={`px-2 py-1.5 text-right text-xs ${
            kind ? 'font-extrabold underline decoration-1' : 'font-bold'
          }`}
        >
          {t.result ?? '—'}
        </td>
        <td className="px-2 py-1.5 text-slate-600">{t.unit && t.unit !== '-' ? t.unit : ''}</td>
        <td className="px-2 py-1.5 text-slate-600">
          {t.range && t.range !== 'Ver informe' ? t.range : ''}
        </td>
        <td className={`px-2 py-1.5 font-bold ${kind ? 'text-red-700' : 'text-slate-500'}`}>
          {kind ? FLAG_LABEL[kind] : 'Dentro del rango'}
        </td>
      </tr>
      {t.note && (
        <tr className="border-b border-slate-200">
          <td colSpan={5} className="px-2 pb-1.5 text-[10px] italic text-slate-600">
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
  const hasUroData =
    uroValues &&
    Object.values(uroValues).some((v) => v && v.trim() && v !== '—');

  return (
    <div className="border-b border-slate-200 px-2 py-2 avoid-break">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase text-slate-900">{t.examName}</p>
        {t.flag && (
          <span className="text-[10px] font-bold text-red-700">{FLAG_LABEL[t.flag as keyof typeof FLAG_LABEL] ?? t.flag}</span>
        )}
      </div>

      {isUro && hasUroData ? (
        <UroReportTable values={uroValues!} />
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-900">
          {t.result}
        </pre>
      )}

      {t.note && (
        <p className="mt-1 text-[10px] italic text-slate-600">Observación: {t.note}</p>
      )}
    </div>
  );
}

export default function ReportView({ requestId }: { requestId: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
        <p className="text-xs text-muted-foreground">
          {error || 'La orden no existe o no tiene permiso para verla.'}
        </p>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
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
  const collectors = Array.from(
    new Set(data.samples.map((s) => s.collectedBy).filter(Boolean))
  ) as string[];

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{PRINT_CSS}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={noResults}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      <article
        className="report-sheet mx-auto w-full max-w-[210mm] bg-white p-[12mm] text-slate-900 shadow-lg"
        style={{ minHeight: '297mm' }}
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold uppercase leading-tight tracking-wide">{lab.name}</h1>
            <div className="mt-1 space-y-0.5">
              <Field label="Institución" value={lab.institution} />
              <Field label="Unidad operativa" value={lab.unit} />
              <p className="text-[11px] leading-snug text-slate-600">
                {lab.uoCode ? `COD. UO ${lab.uoCode}` : ''}
                {lab.uoCode && lab.locationCode ? ' · ' : ''}
                {lab.locationCode ? `Cód. localización ${lab.locationCode}` : ''}
              </p>
              {place && <p className="text-[11px] text-slate-600">{place}</p>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-extrabold uppercase leading-tight">
              Informe de resultados
              <br />
              de laboratorio clínico
            </p>
            <p className="mt-1.5 font-mono text-xs font-bold">{req.code}</p>
            <p className="text-[11px] text-slate-600">Emitido: {fmtDateTime(data.issuedAt)}</p>
          </div>
        </header>

        {partial && (
          <p className="mt-3 rounded border border-amber-500 bg-amber-50 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-amber-800">
            Informe parcial — {pending.length} examen{pending.length === 1 ? '' : 'es'} pendiente
            {pending.length === 1 ? '' : 's'} de validación
          </p>
        )}

        <section className="avoid-break mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-slate-300 p-3">
          <div className="space-y-0.5">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Datos del paciente
            </p>
            <Field label="Paciente" value={p.name} />
            <Field label="Cédula" value={p.cedula} />
            <Field label="N.º historia clínica" value={p.historia} />
            <Field label="Edad" value={p.age != null ? `${p.age} años` : null} />
            <Field label="Sexo" value={p.sex === 'F' ? 'Mujer' : p.sex === 'M' ? 'Hombre' : null} />
            <Field
              label="Procedencia"
              value={[p.parroquia, p.canton, p.province].filter(Boolean).join(', ') || null}
            />
          </div>
          <div className="space-y-0.5">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Datos de la solicitud
            </p>
            <Field label="Médico solicitante" value={req.requestingDoctor} />
            <Field label="Tipo de atención" value={req.orderType} />
            <Field label="Prioridad" value={req.priority} />
            <Field label="Establecimiento" value={req.facility} />
            <Field label="Fecha de solicitud" value={fmtDateTime(req.createdAt)} />
            <Field label="Toma de muestra" value={collected ? fmtDateTime(collected) : null} />
            <Field label="Diagnóstico / motivo" value={req.diagnosis} />
          </div>
        </section>

        {noResults ? (
          <p className="mt-6 rounded border border-dashed border-slate-400 px-4 py-10 text-center text-sm text-slate-600">
            Esta orden aún no tiene resultados validados. El informe se podrá imprimir cuando el
            laboratorio los valide.
          </p>
        ) : (
          groups.map(([cat, list]) => {
            const simple = list.filter((t) => !isStructuredResult(t.result, t.examName, t.category));
            const structured = list.filter((t) =>
              isStructuredResult(t.result, t.examName, t.category)
            );

            return (
              <section key={cat} className="mt-4">
                <h2 className="bg-slate-800 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">
                  {cat}
                </h2>

                {/* Exámenes simples: tabla clásica */}
                {simple.length > 0 && (
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-400 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        <th className="px-2 py-1.5">Examen</th>
                        <th className="px-2 py-1.5 text-right">Resultado</th>
                        <th className="px-2 py-1.5">Unidad</th>
                        <th className="px-2 py-1.5">Valores de referencia</th>
                        <th className="px-2 py-1.5">Interpretación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simple.map((t) => (
                        <SimpleResultRow key={t.id} t={t} />
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Uroanálisis / estructurados: panel completo */}
                {structured.map((t) => (
                  <StructuredResultBlock key={t.id} t={t} />
                ))}
              </section>
            );
          })
        )}

        {partial && !noResults && (
          <section className="avoid-break mt-4 rounded border border-slate-300 p-3">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Exámenes pendientes de resultado
            </p>
            <p className="text-[11px] text-slate-700">
              {pending.map((t) => t.examName).join(' · ')}
            </p>
          </section>
        )}

        {data.samples.length > 0 && (
          <section className="avoid-break mt-4">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Muestras
            </p>
            <p className="text-[11px] text-slate-700">
              {data.samples
                .map((s) => `${s.code} (${(TUBES as any)[s.tube]?.label ?? s.tube})`)
                .join(' · ')}
              {collectors.length > 0 ? ` — Toma: ${collectors.join(', ')}` : ''}
            </p>
          </section>
        )}

        {!noResults && (
          <section className="avoid-break mt-8 grid grid-cols-2 gap-8">
            <div className="space-y-0.5">
              <Field label="Procesado por" value={processors.join(', ') || null} />
              <Field label="Validado por" value={validators.join(', ') || null} />
              <Field label="Fecha de validación" value={fmtDateTime(lastValidation)} />
            </div>
            <div className="pt-10 text-center">
              <div className="border-t border-slate-800 pt-1 text-[11px] font-semibold">
                {validators[0] ?? 'Responsable del laboratorio'}
                <span className="block text-[10px] font-normal text-slate-600">
                  Firma y sello del responsable
                </span>
              </div>
            </div>
          </section>
        )}

        <footer className="report-footer mt-8 border-t border-slate-300 pt-2 text-center text-[9px] leading-snug text-slate-500">
          Los resultados corresponden exclusivamente a las muestras recibidas y fueron validados por
          personal autorizado del laboratorio. Documento generado electrónicamente con LabFlow ·
          Orden {req.code} · {lab.name}
        </footer>
      </article>
    </div>
  );
}
