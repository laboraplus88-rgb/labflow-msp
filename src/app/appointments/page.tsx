import React from 'react';
import AppLayout from '@/components/AppLayout';
import AppointmentsWorkspace from './components/AppointmentsWorkspace';

export default function AppointmentsPage() {
  return (
    <AppLayout
      title="Agenda y citas"
      subtitle="Agenda del día · Crear · Confirmar · Cancelar · Reprogramar"
    >
      <AppointmentsWorkspace />
    </AppLayout>
  );
}
