import React from 'react';
import AppLayout from '@/components/AppLayout';
import WorkflowBoard from './components/WorkflowBoard';

export default function TestProcessingWorkflowPage() {
  return (
    <AppLayout
      title="Procesamiento de exámenes"
      subtitle="Responsables, avance por etapa y aprobación de resultados · turno matutino"
    >
      <WorkflowBoard />
    </AppLayout>
  );
}
