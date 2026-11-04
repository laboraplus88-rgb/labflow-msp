'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, UserPlus, Activity, FlaskConical, Loader2, RefreshCw,
  Wifi, Shield, CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LabProfilePanel from './LabProfilePanel';

type StaffRow = {
  id: string; full_name: string; email: string; role: string; active: boolean;
  current_path?: string | null; last_seen?: string | null;
};
type LabOverview = {
  scope: string; laboratoryId?: string; onlineUsers: number;
  staff: StaffRow[]; pending_tests?: number; tests_today?: number;
};

const ROLE_LABEL: Record<string, string> = {
  jefa: 'Jefa', tecnologo: 'Tecnologo', toma: 'Toma de muestras',
  medico: 'Medico', superadmin: 'Superadmin',
};
const ROLE_OPTIONS = [
  { value: 'tecnologo', label: 'Bioquimico / Tecnologo' },
  { value: 'toma', label: 'Toma de muestras' },
  { value: 'medico', label: 'Medico solicitante' },
  { value: 'jefa', label: 'Jefa de laboratorio' },
];

function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 120_000;
}

export default function LabAdminDashboard() {
  const [data, setData] = useState<LabOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tecnologo');
  const [assigning, setAssigning] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const supabase = createClient();
      await supabase.rpc('presence_heartbeat', { p_path: '/admin-lab' });
      const { data: ov, error: err } = await supabase.rpc('traffic_overview');
      if (err) { setError(err.message); setData(null); }
      else { setData(ov as LabOverview); setUpdatedAt(new Date()); }
    } catch {
      setError('Ejecute 04_multitenant.sql. Solo jefa/superadmin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const assignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setToast('Ingrese el correo (usuario ya en Auth).'); return; }
    setAssigning(true);
    setToast('');
    try {
      const supabase = createClient();
      const { error: err } = await supabase.rpc('assign_staff_to_lab', {
        p_email: email.trim(),
        p_role: role,
        p_laboratory_id: data?.laboratoryId ?? null,
      });
      if (err) setToast(err.message);
      else {
        setToast(`Asignado: ${email} → ${ROLE_LABEL[role] ?? role}`);
        setEmail('');
        await load();
      }
    } catch {
      setToast('Error al asignar personal');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
      </div>
    );
  }

  const staff = data?.staff ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {toast && <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">{toast}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString('es-EC')} · ` : ''}se refresca solo cada 15 s
        </p>
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-primary p-4 text-primary-foreground sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Online en el lab</p>
            <Wifi className="h-5 w-5 opacity-80" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular">{data?.onlineUsers ?? 0}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal</p>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-foreground">{staff.length}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Examenes hoy</p>
            <FlaskConical className="h-5 w-5 text-accent" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular">{data?.tests_today ?? '—'}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cola</p>
            <Activity className="h-5 w-5 text-warning" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular">{data?.pending_tests ?? '—'}</p>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Personal del laboratorio</h2>
            </div>
            <button type="button" onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </header>
          {staff.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Asigne personal con el formulario.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Pantalla</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const on = isOnline(s.last_seen);
                    return (
                      <tr key={s.id} className="border-b border-border/60 hover:bg-muted/40">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{s.full_name || '—'}</p>
                          <p className="text-[11px] text-muted-foreground">{s.email}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{ROLE_LABEL[s.role] ?? s.role}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {on ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Offline</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {on ? s.current_path || '—' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card lg:sticky lg:top-20 lg:self-start">
          <header className="flex items-center gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
            <UserPlus className="h-4 w-4" />
            <h2 className="text-sm font-bold">Asignar personal</h2>
          </header>
          <form onSubmit={assignStaff} className="space-y-4 p-4">
            <p className="text-xs text-muted-foreground">
              El usuario debe existir en <strong>Supabase Auth</strong>. Aqui se fija rol y laboratorio.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Correo</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tecnologo@labflow.msp.gob.ec"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={assigning}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {assigning ? 'Asignando...' : 'Asignar al laboratorio'}
            </button>
          </form>
        </section>
      </div>

      <LabProfilePanel />
    </div>
  );
}
