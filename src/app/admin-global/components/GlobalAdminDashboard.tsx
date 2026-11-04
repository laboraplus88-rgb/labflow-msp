'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Users, Activity, AlertTriangle, FlaskConical,
  Loader2, RefreshCw, Wifi, MapPin, Plus, Power, Copy, KeyRound, ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';

type AdminRow = { id: string; full_name: string; email: string | null; active: boolean };
type CreatedInfo = { labName: string; code: string; email: string; password: string };

const EMPTY_FORM = {
  name: '', code: '', city: '', province: '', maxUsers: '50',
  adminName: '', adminEmail: '', adminPassword: '',
};

function genPassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#$%*';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join('');
}

type LabRow = {
  id: string; name: string; code: string; city: string | null; active: boolean;
  online: number; staff: number; pending_tests: number; tests_today: number;
};
type PathRow = { path: string; users: number };
type Overview = { scope: string; onlineUsers: number; laboratories: LabRow[]; byPath: PathRow[] };

export default function GlobalAdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'warning' } | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [toggling, setToggling] = useState(false);

  const setField = (k: keyof typeof EMPTY_FORM, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, adminPassword: genPassword() });
    setFormError('');
    setCreated(null);
    setShowCreate(true);
  };

  const submitCreate = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/laboratories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, maxUsers: Number(form.maxUsers) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error ?? 'No se pudo crear el laboratorio.');
        return;
      }
      setCreated({
        labName: json.laboratory.name,
        code: json.laboratory.code,
        email: json.admin.email,
        password: form.adminPassword,
      });
      setToast({ msg: 'Laboratorio creado', tone: 'success' });
      await load();
    } catch {
      setFormError('Error de conexión. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ msg: 'Copiado', tone: 'success' });
    } catch {
      setToast({ msg: 'No se pudo copiar', tone: 'warning' });
    }
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const supabase = createClient();
      await supabase.rpc('presence_heartbeat', { p_path: '/admin-global' });
      const { data: ov, error: err } = await supabase.rpc('traffic_overview');
      if (err) { setError(err.message); setData(null); }
      else setData(ov as Overview);
    } catch {
      setError('Ejecute 04_multitenant.sql en Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!selectedLab) { setAdmins([]); return; }
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, full_name, email, active')
        .eq('laboratory_id', selectedLab)
        .eq('role', 'jefa')
        .order('full_name');
      if (alive) setAdmins((rows ?? []) as AdminRow[]);
    })();
    return () => { alive = false; };
  }, [selectedLab, data]);

  const toggleLab = async (labId: string, active: boolean) => {
    setToggling(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('laboratories').update({ active: !active }).eq('id', labId);
    setToggling(false);
    if (err) {
      setToast({ msg: 'No se pudo cambiar el estado', tone: 'warning' });
      return;
    }
    setToast({ msg: active ? 'Laboratorio desactivado' : 'Laboratorio activado', tone: 'success' });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando control de trafico...
      </div>
    );
  }

  const labs = data?.laboratories ?? [];
  const selected = labs.find((l) => l.id === selectedLab) ?? null;
  const bottleneck = labs.filter((l) => l.pending_tests > 20 || l.online > 15);

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-primary p-4 text-primary-foreground sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Usuarios online</p>
            <Wifi className="h-5 w-5 opacity-80" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular">{data?.onlineUsers ?? 0}</p>
          <p className="mt-1 text-xs opacity-80">Heartbeat menos de 2 min · cada 15s</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laboratorios</p>
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-foreground">{labs.length}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes</p>
            <FlaskConical className="h-5 w-5 text-warning" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-foreground">
            {labs.reduce((a, l) => a + (l.pending_tests || 0), 0)}
          </p>
        </article>
        <article className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-destructive">Cuellos de botella</p>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular text-destructive">{bottleneck.length}</p>
        </article>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Vista general del sistema</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95">
            <Plus className="h-3.5 w-3.5" /> Nuevo laboratorio
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {labs.map((lab) => {
          const hot = lab.pending_tests > 20 || lab.online > 15;
          const active = selectedLab === lab.id;
          return (
            <button
              key={lab.id}
              type="button"
              onClick={() => setSelectedLab(active ? null : lab.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                : hot ? 'border-destructive/40 bg-destructive/5'
                : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {lab.name}
                    {!lab.active && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Inactivo</span>}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">{lab.code}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {lab.city ?? '—'}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Online</p>
                  <p className="text-sm font-bold tabular">{lab.online}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Staff</p>
                  <p className="text-sm font-bold tabular">{lab.staff}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Hoy</p>
                  <p className="text-sm font-bold tabular">{lab.tests_today}</p>
                </div>
                <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Cola</p>
                  <p className={`text-sm font-bold tabular ${hot ? 'text-destructive' : ''}`}>{lab.pending_tests}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold">{selected ? `Detalle · ${selected.name}` : 'Seleccione un laboratorio'}</h3>
          </header>
          {selected ? (
            <div className="space-y-2 p-4 text-sm">
              <p>Online: <strong>{selected.online}</strong> · Staff: <strong>{selected.staff}</strong></p>
              <p>Hoy / cola: <strong>{selected.tests_today} / {selected.pending_tests}</strong></p>
              {selected.pending_tests > 20 && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">Posible cuello de botella</p>
              )}
              <div className="border-t border-border pt-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Administrador del laboratorio
                </p>
                {admins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin administrador asignado</p>
                ) : (
                  <ul className="space-y-1">
                    {admins.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{a.full_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${a.active ? 'text-success' : 'text-muted-foreground'}`}>
                          {a.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                disabled={toggling}
                onClick={() => toggleLab(selected.id, selected.active)}
                className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 ${
                  selected.active ? 'border-destructive/40 text-destructive hover:bg-destructive/10' : 'border-border hover:bg-muted'
                }`}
              >
                <Power className="h-3.5 w-3.5" /> {selected.active ? 'Desactivar laboratorio' : 'Activar laboratorio'}
              </button>
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">Toque una tarjeta de laboratorio</p>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Trafico por pantalla</h3>
          </header>
          <ul className="divide-y divide-border">
            {(data?.byPath ?? []).length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin presencia activa</li>
            ) : (
              (data?.byPath ?? []).map((p) => (
                <li key={p.path} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs">{p.path}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                    <Users className="h-3 w-3" /> {p.users}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
      <Modal
        open={showCreate}
        title={created ? 'Laboratorio creado' : 'Nuevo laboratorio'}
        onClose={() => setShowCreate(false)}
        footer={
          created ? (
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Listo
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Crear laboratorio
              </button>
            </>
          )
        }
      >
        {created ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>{created.labName}</strong> ({created.code}) ya está activo. Entregue estas credenciales a su administrador:
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-xs">{created.email}</span>
                <button type="button" onClick={() => copyText(created.email)} aria-label="Copiar correo" className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-xs"><KeyRound className="h-3.5 w-3.5 shrink-0" /> {created.password}</span>
                <button type="button" onClick={() => copyText(created.password)} aria-label="Copiar contraseña" className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium">
              Esta contraseña temporal se muestra una sola vez y no queda guardada. Pida al administrador que la cambie al ingresar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {formError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
            )}
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Laboratorio</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Nombre</span>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Laboratorio Clínico C.S. ..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Código</span>
                <input value={form.code} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder="LAB-QUITO-01" className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Máx. usuarios</span>
                <input type="number" min={1} max={1000} value={form.maxUsers} onChange={(e) => setField('maxUsers', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Ciudad</span>
                <input value={form.city} onChange={(e) => setField('city', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Provincia</span>
                <input value={form.province} onChange={(e) => setField('province', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
            </div>
            <p className="pt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Administrador del laboratorio</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Nombre completo</span>
                <input value={form.adminName} onChange={(e) => setField('adminName', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Correo</span>
                <input type="email" value={form.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Contraseña temporal</span>
                <div className="flex gap-2">
                  <input value={form.adminPassword} onChange={(e) => setField('adminPassword', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/30" />
                  <button type="button" onClick={() => setField('adminPassword', genPassword())} className="shrink-0 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">Generar</button>
                </div>
              </label>
            </div>
          </div>
        )}
      </Modal>
      {toast && <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
