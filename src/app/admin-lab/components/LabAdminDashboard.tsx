'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, UserPlus, Activity, FlaskConical, Loader2, RefreshCw,
  Wifi, Shield, CheckCircle2, Pencil, Power, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LabProfilePanel from './LabProfilePanel';

type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  current_path?: string | null;
  last_seen?: string | null;
};
type LabOverview = {
  scope: string;
  laboratoryId?: string;
  onlineUsers: number;
  staff: StaffRow[];
  pending_tests?: number;
  tests_today?: number;
};

const ROLE_LABEL: Record<string, string> = {
  jefa: 'Jefa de laboratorio',
  tecnologo: 'Bioquimico / Tecnologo',
  toma: 'Toma de muestras',
  medico: 'Medico solicitante',
  superadmin: 'Superadmin',
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

const emptyForm = {
  fullName: '',
  email: '',
  role: 'tecnologo',
  active: true,
};

export default function LabAdminDashboard() {
  const [data, setData] = useState<LabOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const supabase = createClient();
      await supabase.rpc('presence_heartbeat', { p_path: '/admin-lab' });
      const { data: ov, error: err } = await supabase.rpc('traffic_overview');
      if (err) {
        setError(err.message);
        setData(null);
      } else {
        setData(ov as LabOverview);
        setUpdatedAt(new Date());
      }
    } catch {
      setError('Ejecute 04_multitenant.sql y 05_staff_manage.sql. Solo jefa/superadmin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (s: StaffRow) => {
    setEditingId(s.id);
    setForm({
      fullName: s.full_name || '',
      email: s.email || '',
      role: s.role || 'tecnologo',
      active: s.active !== false,
    });
    setToast('');
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setToast('Ingrese el correo del usuario (debe existir en Supabase Auth).');
      return;
    }
    if (!form.fullName.trim()) {
      setToast('Ingrese el nombre completo.');
      return;
    }
    setSaving(true);
    setToast('');
    try {
      const supabase = createClient();

      if (editingId) {
        const { error: err } = await supabase.rpc('update_staff_profile', {
          p_user_id: editingId,
          p_full_name: form.fullName.trim(),
          p_role: form.role,
          p_active: form.active,
        });
        if (err) {
          setToast(err.message);
        } else {
          setToast('Perfil actualizado correctamente.');
          resetForm();
          await load();
        }
      } else {
        const { error: err } = await supabase.rpc('assign_staff_to_lab', {
          p_email: form.email.trim(),
          p_role: form.role,
          p_laboratory_id: data?.laboratoryId ?? null,
          p_full_name: form.fullName.trim(),
          p_active: form.active,
        });
        if (err) {
          setToast(
            err.message +
              (err.message.includes('no encontrado')
                ? ' → Authentication → Users → Add user (Auto Confirm), luego reintente.'
                : '')
          );
        } else {
          setToast(`Personal asignado: ${form.fullName} (${ROLE_LABEL[form.role] ?? form.role})`);
          resetForm();
          await load();
        }
      }
    } catch {
      setToast('Error al guardar. Verifique Supabase y 05_staff_manage.sql.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: StaffRow) => {
    setToast('');
    try {
      const supabase = createClient();
      const { error: err } = await supabase.rpc('set_staff_active', {
        p_user_id: s.id,
        p_active: !s.active,
      });
      if (err) setToast(err.message);
      else {
        setToast(s.active ? `${s.full_name || s.email} desactivado` : `${s.full_name || s.email} activado`);
        await load();
      }
    } catch {
      setToast('No se pudo cambiar el estado.');
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
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {toast && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">{toast}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString('es-EC')} · ` : ''}
          se refresca solo cada 15 s
        </p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
        >
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
          <p className="mt-1 text-xs text-muted-foreground">
            {staff.filter((s) => s.active).length} activos
          </p>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        <section className="rounded-xl border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Personal del laboratorio</h2>
            </div>
          </header>
          {staff.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Use el formulario para asignar personal (usuario ya creado en Auth).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-4 py-3">Nombre / correo</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className="px-4 py-3">Sesion</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
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
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                            {ROLE_LABEL[s.role] ?? s.role}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {s.active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Activo
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">Inactivo</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {on ? (
                            <span className="text-xs font-semibold text-primary">
                              Online · {s.current_path || '—'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Offline</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(s)}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                              title="Editar perfil"
                            >
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(s)}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${
                                s.active
                                  ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
                                  : 'border-success/40 text-success hover:bg-success/10'
                              }`}
                              title={s.active ? 'Desactivar' : 'Activar'}
                            >
                              <Power className="h-3 w-3" />
                              {s.active ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
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
          <header className="flex items-center justify-between rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <h2 className="text-sm font-bold">
                {editingId ? 'Editar personal' : 'Asignar / crear perfil'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded p-1 hover:bg-primary-foreground/15"
                aria-label="Cancelar edicion"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </header>
          <form onSubmit={saveStaff} className="space-y-3 p-4">
            <p className="text-xs text-muted-foreground">
              {editingId
                ? 'Actualice nombre, rol o estado del miembro del equipo.'
                : 'Primero cree el usuario en Supabase Auth (Auto Confirm). Aqui se asigna nombre, rol y laboratorio.'}
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Nombre completo *
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Bq. Diana Pillajo"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Correo electronico *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="tecnologo@labflow.msp.gob.ec"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
                required
                disabled={!!editingId}
              />
              {editingId && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  El correo no se cambia aqui (Auth).
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rol *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Cuenta activa</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Asignar al laboratorio'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-border py-2 text-sm font-semibold hover:bg-muted"
              >
                Cancelar edicion
              </button>
            )}
          </form>
        </section>
      </div>

      <LabProfilePanel />
    </div>
  );
}
