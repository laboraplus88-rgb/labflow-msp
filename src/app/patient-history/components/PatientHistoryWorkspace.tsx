'use client';
import React, { useMemo, useState } from 'react';
import { Search, UserRound, CalendarDays, FlaskConical, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Stethoscope, Plus } from 'lucide-react';
import { PATIENTS, searchPatients, fullPatientName, PatientRecord } from '@/lib/labData';
import Badge, { priorityTone, orderTone } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

const FLAG_STYLE = {
  normal: 'bg-success/15 text-success',
  alto: 'bg-destructive/15 text-destructive',
  bajo: 'bg-warning/20 text-warning-foreground',
  critico: 'bg-destructive text-destructive-foreground font-bold',
} as const;

export default function PatientHistoryWorkspace() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [facilityFilter, setFacilityFilter] = useState('Todas');

  const results = useMemo(() => searchPatients(query), [query]);
  const patient = PATIENTS.find((p) => p.id === selectedId) ?? null;

  const filteredOrders = useMemo(() => {
    if (!patient) return [];
    if (facilityFilter === 'Todas') return patient.orders;
    return patient.orders.filter((o) => o.facility === facilityFilter || o.origin === facilityFilter);
  }, [patient, facilityFilter]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
      {/* Search panel */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Buscar paciente</h2>
          <p className="text-xs text-muted-foreground">Nombre, cedula o N. de historia clinica</p>
        </header>
        <div className="p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. Rodriguez o 0712345678"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              autoFocus
            />
          </label>

          <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto scrollbar-thin">
            {results.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">Ningun paciente coincide</li>
            ) : (
              results.map((p) => {
                const active = selectedId === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(p.id);
                        setExpandedOrder(null);
                      }}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                        active ? 'bg-primary/10 border border-primary' : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac text-xs font-bold text-lilac-foreground">
                        {p.primerNombre[0]}{p.apellidoPaterno[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{fullPatientName(p)}</p>
                        <p className="font-mono text-[11px] text-muted-foreground tabular">CI {p.cedula}</p>
                        <p className="text-[11px] text-muted-foreground">{p.edad} anos · {p.sexo === 'F' ? 'Mujer' : 'Hombre'} · {p.orders.length} orden(es)</p>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      {/* Detail */}
      <div className="min-w-0 space-y-5">
        {!patient ? (
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title="Seleccione un paciente"
            description="Busque por nombre o cedula en el panel izquierdo para ver el historial de examenes y resultados de laboratorio."
          />
        ) : (
          <>
            <article className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                    {patient.primerNombre[0]}{patient.apellidoPaterno[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{fullPatientName(patient)}</h2>
                    <p className="mt-0.5 font-mono text-sm text-muted-foreground tabular">
                      CI {patient.cedula} · HC {patient.historia}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {patient.edad} anos · {patient.sexo === 'F' ? 'Mujer' : 'Hombre'} · {patient.parroquia}, {patient.canton}
                    </p>
                  </div>
                </div>
                <Link
                  href="/exam-request-sample-collection"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Nueva solicitud
                </Link>
              </div>
            </article>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Origen / establecimiento:</span>
              {['Todas', 'C.S. El Paraiso', 'Consulta externa', 'Emergencia', 'Subcentro'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFacilityFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    facilityFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Historial de ordenes y resultados
              </h3>

              {filteredOrders.length === 0 ? (
                <EmptyState
                  icon={<FlaskConical className="h-6 w-6" />}
                  title="Sin ordenes en este filtro"
                  description="No hay solicitudes de laboratorio para este paciente con el filtro actual."
                />
              ) : (
                filteredOrders.map((order) => {
                  const open = expandedOrder === order.requestId;
                  return (
                    <article key={order.requestId} className="overflow-hidden rounded-xl border border-border bg-card">
                      <button
                        type="button"
                        onClick={() => setExpandedOrder(open ? null : order.requestId)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">{order.date.slice(5, 7)}/{order.date.slice(2, 4)}</span>
                          <span className="text-sm font-bold tabular text-foreground">{order.date.slice(8)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-primary">{order.requestId}</span>
                            <Badge tone={orderTone(order.orderType)}>{order.orderType}</Badge>
                            <Badge tone={priorityTone(order.priority)} dot>{order.priority}</Badge>
                            <Badge tone={order.status === 'Entregado' ? 'success' : order.status === 'Parcial' ? 'warning' : 'info'}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            <Stethoscope className="mr-1 inline h-3.5 w-3.5" />
                            {order.doctor} · {order.facility} · {order.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="tabular font-semibold text-foreground">{order.results.length}</span> resultados
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>

                      {open && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3">
                          {order.results.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              Resultados aun no disponibles — el examen esta en proceso o pendiente de validacion.
                            </p>
                          ) : (
                            <div className="overflow-x-auto scrollbar-thin">
                              <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <th className="pb-2 pr-3">Examen</th>
                                    <th className="pb-2 pr-3">Resultado</th>
                                    <th className="pb-2 pr-3">Referencia</th>
                                    <th className="pb-2 pr-3">Estado</th>
                                    <th className="pb-2">Validado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.results.map((r) => (
                                    <tr key={`${order.requestId}-${r.examId}`} className="border-t border-border/60">
                                      <td className="py-2.5 pr-3">
                                        <p className="font-medium text-foreground">{r.examName}</p>
                                        <p className="text-[11px] text-muted-foreground">{r.category}</p>
                                      </td>
                                      <td className="py-2.5 pr-3">
                                        <span className="text-base font-bold tabular text-foreground">{r.result}</span>
                                        {r.unit !== '-' && <span className="ml-1 text-xs text-muted-foreground">{r.unit}</span>}
                                      </td>
                                      <td className="py-2.5 pr-3 tabular text-muted-foreground">{r.range}</td>
                                      <td className="py-2.5 pr-3">
                                        {r.flag ? (
                                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${FLAG_STYLE[r.flag]}`}>
                                            {r.flag === 'critico' && <AlertTriangle className="h-3 w-3" />}
                                            {r.flag === 'normal' && <CheckCircle2 className="h-3 w-3" />}
                                            {r.flag === 'normal' ? 'Normal' : r.flag === 'alto' ? 'Alto' : r.flag === 'bajo' ? 'Bajo' : 'Critico'}
                                          </span>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td className="py-2.5 text-xs text-muted-foreground">
                                        <p>{r.validatedAt}</p>
                                        <p className="font-medium text-foreground">{r.validatedBy}</p>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
