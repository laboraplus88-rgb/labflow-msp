import React from 'react';
import AppLayout from '@/components/AppLayout';
import ExamRequestWorkspace from './components/ExamRequestWorkspace';
import RecentRequestsTable from './components/RecentRequestsTable';

export default function ExamRequestSampleCollectionPage() {
  return (
    <AppLayout
      title="Solicitud de exámenes y toma de muestras"
      subtitle="Formulario SNS-MSP / HCU-form.010A / 2008 · Laboratorio Clínico — Solicitud"
    >
      <div className="space-y-8">
        <ExamRequestWorkspace />
        <RecentRequestsTable />
      </div>
    </AppLayout>
  );
}
