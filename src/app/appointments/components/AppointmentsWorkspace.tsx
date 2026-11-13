'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Plus, RefreshCw } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import {
  cancelAppointment,
  createAppointment,
  listAppointmentsForDay,
  listResources,
  rescheduleAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentResource,
  type ApptPriority,
  type ApptStatus,
} from '@/lib/supabase/appointments';

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30';

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function statusTone(s: ApptStatus) {
  if (s === 'completed' || s === 'confirmed') return 'success' as const;
  if (s === 'cancelled' || s === 'no_show') return 'danger' as const;
  if (s === 'checked_in' || s === 'in_progress') return 'warning' as const;
  return 'info' as const;
}

export default function AppointmentsWorkspace() {
  const [day, setDay] = useState(todayLocal());
  const [rows, setRows] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<AppointmentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('08:00');
  const [resourceId, setResourceId] = useState('');
  const [priority, setPriority] = useState<ApptPriority>('normal');
  const [notes, setNotes] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([listAppointmentsForDay(day), listResources()]);
      if (a.error) setToast(a.error.message);
      else setRows((a.data as Appointment[]) ?? []);
      if (!r.error) {
        const list = (r.data as AppointmentResource[]) ?? [];
        setResources(list);
        if (!resourceId && list[0]) setResourceId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [day, resourceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openCount = useMemo(
    () => rows.filter((r) => !['cancelled', 'completed', 'no_show'].includes(r.status)).length,
    [rows]
  );

  const onCreate = async () => {
    if (!name.trim()) {
      setToast('Indique el nombre del paciente');
      return;
    }
    const scheduled = new Date(`${day}T${time}:00`);
    if (Number.isNaN(scheduled.getTime())) {
      setToast('Fecha/hora inválida');
      return;
    }
    setSaving(true);
    try {
      const { error } = await createAppointment({
        scheduled_at: scheduled.toISOString(),
        resource_id: resourceId || null,
        patient_name: name,
        patient_cedula: cedula || undefined,
        patient_phone: phone || undefined,
        priority,
        notes: notes || undefined,
      });
      if (error) setToast(error.message);
      else {
        setToast('Cita creada');
        setName('');
        setCedula('');
        setPhone('');
        setNotes('');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const onStatus = async (id: string, status: ApptStatus) => {
    setSaving(true);
    try {
      const { error } = await updateAppointmentStatus(id, status);
      if (error) setToast(error.message);
      else await reload();
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async (id: string) => {
    const reason = window.prompt('Motivo de cancelación') ?? '';
    setSaving(true);
    try {
      const { error } = await cancelAppointment(id, reason || undefined);
      if (error) setToast(error.message);
      else {
        setToast('Cita cancelada');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const onReschedule = async (id: string) => {
    const next = window.prompt('Nueva fecha y hora (YYYY-MM-DDTHH:mm)', `${day}T${time}`);
    if (!next) return;
    const dt = new Date(next);
    if (Number.isNaN(dt.getTime())) {
      setToast('Fecha inválida');
      return;
    }
    setSaving(true);
    try {
      const { error } = await rescheduleAppointment(id, dt.toISOString());
      if (error) setToast(error.message);
      else {
        setToast('Cita reprogramada');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <input type="date" className={inputCls + ' max-w-[180px]'} value={day} onChange={(e) => setDay(e.target.value)} />
          <span className="text-sm text-muted-foreground">{openCount} citas activas</span>
        </div>
        <button type="button" onClick={reload} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4" /> Nueva cita
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input className={inputCls} placeholder="Nombre paciente *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} placeholder="Cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} />
          <input className={inputCls} placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <select className={inputCls} value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">Sin recurso</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as ApptPriority)}>
            <option value="normal">Normal</option>
            <option value="prioritario">Prioritario</option>
            <option value="programa_publico">Programa público</option>
            <option value="urgente">Urgente</option>
          </select>
          <input className={inputCls + ' sm:col-span-2'} placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Agendar
        </button>
      </section>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando agenda…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Hora', 'Paciente', 'Recurso', 'Prioridad', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No hay citas para este día.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-semibold tabular">
                        {new Date(row.scheduled_at).toLocaleTimeString('es-EC', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.patient_name || '—'}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.patient_cedula || ''} {row.patient_phone ? `· ${row.patient_phone}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.appointment_resources?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">{row.priority}</td>
                      <td className="px-3 py-2">
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.status === 'scheduled' && (
                            <button type="button" className="text-xs font-semibold text-primary" onClick={() => onStatus(row.id, 'confirmed')}>
                              Confirmar
                            </button>
                          )}
                          {['scheduled', 'confirmed'].includes(row.status) && (
                            <button type="button" className="text-xs font-semibold text-primary" onClick={() => onStatus(row.id, 'checked_in')}>
                              Llegó
                            </button>
                          )}
                          {['scheduled', 'confirmed'].includes(row.status) && (
                            <>
                              <button type="button" className="text-xs font-semibold" onClick={() => onReschedule(row.id)}>
                                Reprogramar
                              </button>
                              <button type="button" className="text-xs font-semibold text-destructive" onClick={() => onCancel(row.id)}>
                                Cancelar
                              </button>
                            </>
                          )}
                          {row.status === 'checked_in' && (
                            <button type="button" className="text-xs font-semibold text-primary" onClick={() => onStatus(row.id, 'completed')}>
                              Completar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
