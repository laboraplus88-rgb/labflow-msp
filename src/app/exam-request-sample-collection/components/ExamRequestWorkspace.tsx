'use client';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CATALOG, TUBES, TubeKey, CatalogExam, Priority, OrderType } from '@/lib/labData';
import PatientForm from './PatientForm';
import ExamCatalog from './ExamCatalog';
import OrderSummary from './OrderSummary';
import Toast from '@/components/ui/Toast';

export interface CollectedLabel {
  code: string;
  tube: TubeKey;
  exams: string[];
}

export type FormValues = {
  historia: string;
  cedula: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  edad: string;
  sexo: 'F' | 'M' | '';
  provincia: string;
  canton: string;
  parroquia: string;
  orderType: OrderType;
  priority: Priority;
  doctor: string;
  diagnosis: string;
  facility: string;
};

export default function ExamRequestWorkspace() {
  const form = useForm<FormValues>({
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
      canton: 'Quito',
      parroquia: '',
      orderType: 'Consulta externa',
      priority: 'Rutina',
      doctor: '',
      diagnosis: '',
      facility: 'C.S. El Para\u00edso',
    },
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [labels, setLabels] = useState<CollectedLabel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const selectedExams = useMemo(
    () => CATALOG.filter((e) => selected.includes(e.id)),
    [selected]
  );

  const tubeGroups = useMemo(() => {
    const map = new Map<TubeKey, CatalogExam[]>();
    selectedExams.forEach((e) => {
      const list = map.get(e.tube) ?? [];
      list.push(e);
      map.set(e.tube, list);
    });
    return Array.from(map.entries()).map(([tube, exams]) => ({
      tube,
      exams: exams.map((e) => e.name),
    }));
  }, [selectedExams]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (selected.length === 0) {
      setToast('Seleccione al menos un examen del cat\u00e1logo.');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    const base = 88200 + Math.floor(Math.random() * 90);
    const next: CollectedLabel[] = tubeGroups.map((g, i) => ({
      code: `M-${base + i}`,
      tube: g.tube,
      exams: g.exams,
    }));
    setLabels(next);
    setSubmitting(false);
    setToast(`Solicitud registrada. ${next.length} etiqueta(s) generada(s) para ${values.primerNombre} ${values.apellidoPaterno}.`);
  });

  const patientName = [form.watch('apellidoPaterno'), form.watch('apellidoMaterno'), form.watch('primerNombre'), form.watch('segundoNombre')]
    .filter(Boolean)
    .join(' ');

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_340px] 2xl:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <PatientForm form={form} />
        <ExamCatalog selected={selected} onToggle={toggle} />
      </div>
      <OrderSummary
        selectedExams={selectedExams}
        tubeGroups={tubeGroups}
        labels={labels}
        submitting={submitting}
        orderType={form.watch('orderType')}
        priority={form.watch('priority')}
        patientName={patientName}
        cedula={form.watch('cedula')}
        onClear={() => setSelected([])}
        onRemove={(id) => setSelected((prev) => prev.filter((x) => x !== id))}
      />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </form>
  );
}
