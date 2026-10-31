import React from 'react';
import AppLayout from '@/components/AppLayout';
import PatientHistoryWorkspace from './components/PatientHistoryWorkspace';

export default function PatientHistoryPage() {
  return (
    <AppLayout
      title="Historial y resultados del paciente"
      subtitle="Búsqueda por nombre o cédula · Resultados por fecha · Consulta médica"
    >
      <PatientHistoryWorkspace />
    </AppLayout>
  );
}
