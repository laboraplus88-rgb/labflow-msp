'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CATALOG, TubeKey, Priority, OrderType } from '@/lib/labData';
import PatientForm, { PatientFormValues } from './PatientForm';
import ExamCatalog from './ExamCatalog';
import OrderSummary from './OrderSummary';
import Toast from '@/components/ui/Toast';
import {
  getFacilities,
  createPatient,
  createExamRequest,
  searchPatients,
  setRequestingDoctor,
  getProfile,
} from '@/lib/supabase/api';
import { useMyLaboratory } from '@/lib/useMyLaboratory';

export interface CollectedLabel {
  tube: TubeKey;
  code: string;
  exams: string[];
}

export default function ExamRequestWorkspace() {
  const form = useForm<PatientFormValues>({
    defaultValues: {
      historia: '',
      cedula: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      primerNombre: '',
      segundoNombre: '',
      edad: '',
      sexo: '',
      provincia: 'Pichincha',
      canton: '',
      parroquia: '',
      doctor: '',
      orderType: 'Consulta externa',
      priority: 'Rutina',
      diagnosis: '',
      facility: '',
    },
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [labels, setLabels] = useState<CollectedLabel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const lab = useMyLaboratory();
  const [facilities, setFacilities] = useState<{ id: string; name: string; type: string; code: string }[]>([]);

  useEffect(() => {
    getFacilities().then(({ data }) => {
      setFacilities((data ?? []).map((f: any) => ({ id: f.id, name: f.name, type: f.type, code: f.code })));
    });
  }, []);

  // Prefill desde el panel del médico (?cedula=...) y médico solicitante por defecto.
  useEffect(() => {
    let alive = true;
    (async () => {
      const profile: any = await getProfile();
      if (alive && profile?.role === 'medico' && profile.full_name) form.setValue('doctor', profile.full_name);
      const ced = new URLSearchParams(window.location.search).get('cedula')?.trim();
      if (!ced || !alive) return;
      const { data } = await searchPatients(ced);
      const p: any = (data ?? []).find((x: any) => x.cedula === ced);
      form.setValue('cedula', ced);
      if (p && alive) {
        form.setValue('historia', p.historia ?? '');
        form.setValue('apellidoPaterno', p.apellido_paterno ?? '');
        form.setValue('apellidoMaterno', p.apellido_materno ?? '');
        form.setValue('primerNombre', p.primer_nombre ?? '');
        form.setValue('segundoNombre', p.segundo_nombre ?? '');
        form.setValue('edad', p.edad != null ? String(p.edad) : '');
        form.setValue('sexo', p.sexo ?? '');
        if (p.provincia) form.setValue('provincia', p.provincia);
        form.setValue('canton', p.canton ?? '');
        form.setValue('parroquia', p.parroquia ?? '');
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedExams = useMemo(() => CATALOG.filter((c) => selected.includes(c.id)), [selected]);

  const tubeGroups = useMemo(() => {
    const map = new Map<TubeKey, string[]>();
    selectedExams.forEach((e) => {
      map.set(e.tube, [...(map.get(e.tube) ?? []), e.name]);
    });
    return Array.from(map.entries()).map(([tube, exams]) => ({ tube, exams }));
  }, [selectedExams]);

  const values = form.watch();
  const patientName = [values.apellidoPaterno, values.apellidoMaterno, values.primerNombre, values.segundoNombre]
    .filter(Boolean)
    .join(' ');

  const onSubmit = async (vals: PatientFormValues) => {
    if (selected.length === 0) {
      setToast('Seleccione al menos un examen del catalogo.');
      return;
    }
    if (!vals.cedula?.trim() || !vals.apellidoPaterno?.trim() || !vals.primerNombre?.trim()) {
      setToast('Complete cedula, apellido paterno y primer nombre.');
      return;
    }
    setSubmitting(true);
    setToast('');
    try {
      let patientId: string | null = null;

      const { data: found } = await searchPatients(vals.cedula.trim());
      const existing = (found ?? []).find((p: any) => p.cedula === vals.cedula.trim());
      if (existing) {
        patientId = existing.id;
      } else {
        const { data: patient, error: pErr } = await createPatient({
          historia: vals.historia || undefined,
          cedula: vals.cedula.trim(),
          apellido_paterno: vals.apellidoPaterno.trim(),
          apellido_materno: vals.apellidoMaterno || undefined,
          primer_nombre: vals.primerNombre.trim(),
          segundo_nombre: vals.segundoNombre || undefined,
          edad: vals.edad ? Number(vals.edad) : undefined,
          sexo: vals.sexo === 'F' || vals.sexo === 'M' ? vals.sexo : undefined,
          provincia: vals.provincia || undefined,
          canton: vals.canton || undefined,
          parroquia: vals.parroquia || undefined,
        });
        if (pErr || !patient) {
          setToast(pErr?.message || 'Error al crear paciente');
          setSubmitting(false);
          return;
        }
        patientId = patient.id;
      }

      const facility = facilities.find((f) => f.name === vals.facility);

      const { data, error: rErr } = await createExamRequest({
        patient_id: patientId!,
        order_type: (vals.orderType as OrderType) || 'Consulta externa',
        priority: (vals.priority as Priority) || 'Rutina',
        facility_id: facility?.id,
        diagnosis: vals.diagnosis || undefined,
        exams: selectedExams.map((e) => ({
          exam_code: e.id,
          exam_name: e.name,
          category: e.category,
          tube_type: e.tube,
          range_text: e.range,
          unit: e.unit,
        })),
      });

      if (rErr || !data) {
        setToast(rErr?.message || 'Error al registrar solicitud en Supabase');
        setSubmitting(false);
        return;
      }

      if (vals.doctor?.trim()) {
        await setRequestingDoctor(data.request.id, vals.doctor.trim());
      }

      setLabels(
        (data.samples ?? []).map((s: any) => ({
          tube: s.tube_type as TubeKey,
          code: s.code,
          exams: selectedExams.filter((e) => e.tube === s.tube_type).map((e) => e.name),
        }))
      );
      setToast(`Solicitud ${data.request.code} guardada: ${selected.length} examenes.`);
      setSelected([]);
    } catch {
      setToast('Error de conexion con Supabase. Revise variables de entorno.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_340px] 2xl:grid-cols-[1fr_400px]"
    >
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <PatientForm form={form} lab={lab} facilities={facilities} />
        <ExamCatalog selected={selected} onToggle={toggle} />
      </div>
      <OrderSummary
        selectedExams={selectedExams}
        tubeGroups={tubeGroups}
        labels={labels}
        submitting={submitting}
        orderType={(values.orderType as OrderType) || 'Consulta externa'}
        priority={(values.priority as Priority) || 'Rutina'}
        patientName={patientName}
        cedula={values.cedula || ''}
        onClear={() => setSelected([])}
        onRemove={(id) => setSelected((prev) => prev.filter((x) => x !== id))}
      />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </form>
  );
}
