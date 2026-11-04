'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Loader2, Save } from 'lucide-react';
import {
  addFacility,
  deactivateFacility,
  getFacilities,
  updateMyLaboratoryProfile,
} from '@/lib/supabase/api';
import { invalidateMyLaboratory, useMyLaboratory } from '@/lib/useMyLaboratory';

type Facility = { id: string; name: string; type: string; code: string };

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30';

export default function LabProfilePanel() {
  const lab = useMyLaboratory();

  const [form, setForm] = useState({
    institution_name: '', unit_name: '', uo_code: '', location_code: '', city: '', province: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [fac, setFac] = useState({ name: '', type: 'subcentro', code: '' });
  const [facBusy, setFacBusy] = useState(false);
  const [facMsg, setFacMsg] = useState('');

  useEffect(() => {
    if (!lab) return;
    setForm({
      institution_name: lab.institution_name ?? '',
      unit_name: lab.unit_name ?? '',
      uo_code: lab.uo_code ?? '',
      location_code: lab.location_code ?? '',
      city: lab.city ?? '',
      province: lab.province ?? '',
    });
  }, [lab]);

  const loadFacilities = useCallback(async () => {
    const { data } = await getFacilities();
    setFacilities((data ?? []).map((f: any) => ({ id: f.id, name: f.name, type: f.type, code: f.code })));
  }, []);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);

  if (!lab) return null;

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const t = (v: string) => v.trim() || null;
    const { error } = await updateMyLaboratoryProfile(lab.id, {
      institution_name: t(form.institution_name),
      unit_name: t(form.unit_name),
      uo_code: t(form.uo_code),
      location_code: t(form.location_code),
      city: t(form.city),
      province: t(form.province),
    });
    setSaving(false);
    if (error) { setMsg({ text: 'No se pudo guardar: ' + error.message, ok: false }); return; }
    invalidateMyLaboratory();
    setMsg({ text: 'Datos guardados. Ya aparecen en la solicitud de exámenes.', ok: true });
  };

  const add = async () => {
    setFacMsg('');
    if (fac.name.trim().length < 3 || !fac.code.trim()) {
      setFacMsg('Ingrese nombre y código del establecimiento.');
      return;
    }
    setFacBusy(true);
    const { error } = await addFacility({
      name: fac.name.trim(),
      type: fac.type === 'centro' ? 'centro' : 'subcentro',
      code: fac.code.trim(),
    });
    setFacBusy(false);
    if (error) {
      setFacMsg(error.code === '23505' ? 'Ya existe un establecimiento con ese código.' : 'No se pudo agregar: ' + error.message);
      return;
    }
    setFac({ name: '', type: 'subcentro', code: '' });
    await loadFacilities();
  };

  const remove = async (id: string) => {
    setFacBusy(true);
    await deactivateFacility(id);
    setFacBusy(false);
    await loadFacilities();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Datos del establecimiento (formulario 010A)</h2>
        </header>
        <div className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground">
            Complete con los códigos asignados por el MSP. Estos datos aparecen en el encabezado de la solicitud de exámenes.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Institución del sistema</span>
              <input className={inputCls} value={form.institution_name} onChange={(e) => setForm((f) => ({ ...f, institution_name: e.target.value }))} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Unidad operativa</span>
              <input className={inputCls} value={form.unit_name} onChange={(e) => setForm((f) => ({ ...f, unit_name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">COD. UO</span>
              <input className={inputCls} value={form.uo_code} onChange={(e) => setForm((f) => ({ ...f, uo_code: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Cód. localización</span>
              <input className={inputCls} value={form.location_code} onChange={(e) => setForm((f) => ({ ...f, location_code: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Ciudad</span>
              <input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Provincia</span>
              <input className={inputCls} value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
            </label>
          </div>
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-xs font-medium ${msg.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{msg.text}</p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar datos
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Establecimientos de origen</h2>
        </header>
        <div className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground">
            Centros o subcentros que envían muestras. Si no agrega ninguno, la solicitud no pedirá establecimiento.
          </p>
          {facilities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Aún no hay establecimientos registrados.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {facilities.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{f.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {f.type === 'subcentro' ? 'Subcentro' : 'Centro de salud'} · COD {f.code}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    disabled={facBusy}
                    aria-label={`Quitar ${f.name}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_130px_110px]">
            <input className={inputCls} placeholder="Nombre del establecimiento" value={fac.name} onChange={(e) => setFac((f) => ({ ...f, name: e.target.value }))} />
            <select className={inputCls} value={fac.type} onChange={(e) => setFac((f) => ({ ...f, type: e.target.value }))}>
              <option value="centro">Centro de salud</option>
              <option value="subcentro">Subcentro</option>
            </select>
            <input className={inputCls} placeholder="Código" value={fac.code} onChange={(e) => setFac((f) => ({ ...f, code: e.target.value }))} />
          </div>
          {facMsg && <p className="text-xs font-medium text-destructive">{facMsg}</p>}
          <button
            type="button"
            onClick={add}
            disabled={facBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar establecimiento
          </button>
        </div>
      </section>
    </div>
  );
}
