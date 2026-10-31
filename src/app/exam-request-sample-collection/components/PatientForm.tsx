'use client';
import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { UserRound, Stethoscope, Siren, Building2, AlertCircle } from 'lucide-react';
import { DOCTORS, PROVINCES, FACILITIES } from '@/lib/labData';

export interface PatientFormValues {
  historia: string;
  cedula: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  edad: string;
  sexo: string;
  provincia: string;
  canton: string;
  parroquia: string;
  doctor: string;
  orderType: string;
  priority: string;
  diagnosis: string;
  facility: string;
}

interface PatientFormProps {
  form: UseFormReturn<any>;
}

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" />
      {msg}
    </p>
  );
}

export default function PatientForm({ form }: PatientFormProps) {
  const { register, watch, formState: { errors } } = form;
  const orderType = watch('orderType');
  const priority = watch('priority');

  return (
    <div className="space-y-6">
      {/* Institution strip 010A */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-2 bg-lilac text-lilac-foreground sm:grid-cols-4">
          {['Institucion del sistema', 'Unidad operativa', 'COD. UO', 'Cod. localizacion'].map((h) => (
            <div key={h} className="px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide">{h}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {['MSP Ecuador', 'C.S. El Paraiso', '493', '17D03'].map((v) => (
            <div key={v} className="px-3 py-2 text-center text-sm font-semibold text-foreground">{v}</div>
          ))}
        </div>
      </div>

      {/* Patient data */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <UserRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Datos del paciente</h2>
        </header>
        <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">N. historia clinica *</label>
            <input className={inputCls} placeholder="07123456789" {...register('historia', { required: 'Requerido' })} />
            <FieldError msg={errors.historia?.message as string} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cedula *</label>
            <input className={inputCls} placeholder="0712345678" {...register('cedula', { required: 'Requerido' })} />
            <FieldError msg={errors.cedula?.message as string} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Apellido paterno *</label>
            <input className={inputCls} {...register('apellidoPaterno', { required: 'Requerido' })} />
            <FieldError msg={errors.apellidoPaterno?.message as string} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Apellido materno</label>
            <input className={inputCls} {...register('apellidoMaterno')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Primer nombre *</label>
            <input className={inputCls} {...register('primerNombre', { required: 'Requerido' })} />
            <FieldError msg={errors.primerNombre?.message as string} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Segundo nombre</label>
            <input className={inputCls} {...register('segundoNombre')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Edad *</label>
            <input type="number" className={inputCls} {...register('edad', { required: 'Requerido' })} />
            <FieldError msg={errors.edad?.message as string} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Sexo *</label>
            <select className={inputCls} {...register('sexo', { required: 'Requerido' })}>
              <option value="">Seleccione</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
            <FieldError msg={errors.sexo?.message as string} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provincia</label>
            <select className={inputCls} {...register('provincia')}>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Canton</label>
            <input className={inputCls} {...register('canton')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Parroquia</label>
            <input className={inputCls} {...register('parroquia')} />
          </div>
        </div>
      </section>

      {/* Order type, priority, doctor, facility */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Stethoscope className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Solicitud y origen</h2>
        </header>
        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Tipo de orden</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { value: 'Emergencia', icon: Siren, hint: 'Atencion inmediata' },
                { value: 'Consulta externa', icon: Stethoscope, hint: 'Cita medica' },
                { value: 'Ambulatorio', icon: Building2, hint: 'Rutina / control' },
              ].map((o) => {
                const Icon = o.icon;
                const active = orderType === o.value;
                return (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                      active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input type="radio" value={o.value} className="sr-only" {...register('orderType')} />
                    <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{o.value}</p>
                      <p className="text-xs text-muted-foreground">{o.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Prioridad</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'Urgente', hint: 'Plazo 1 h' },
                { value: 'Rutina', hint: 'Plazo 24 h' },
                { value: 'Control', hint: 'Plazo 48 h' },
              ].map((p) => {
                const active = priority === p.value;
                return (
                  <label
                    key={p.value}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-center transition-all ${
                      active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input type="radio" value={p.value} className="sr-only" {...register('priority')} />
                    <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{p.value}</p>
                    <p className="text-xs text-muted-foreground">{p.hint}</p>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Medico solicitante *</label>
              <select className={inputCls} {...register('doctor', { required: 'Requerido' })}>
                <option value="">Seleccione medico</option>
                {DOCTORS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <FieldError msg={errors.doctor?.message as string} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Diagnostico / motivo</label>
              <input className={inputCls} placeholder="Ej. Control glucemico" {...register('diagnosis')} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Establecimiento de origen</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FACILITIES.map((f) => {
                const active = watch('facility') === f.name;
                return (
                  <label
                    key={f.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                      active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input type="radio" value={f.name} className="sr-only" {...register('facility')} />
                    <Building2 className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.type} · COD {f.code}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
