import React from 'react';
import AppLayout from '@/components/AppLayout';
import QcWorkspace from './components/QcWorkspace';

export default function QcPage() {
  return (
    <AppLayout
      title="Control de calidad (QC)"
      subtitle="Controles por analito · Regla 2SD / límites · Bloqueo suave al validar"
    >
      <QcWorkspace />
    </AppLayout>
  );
}
