import React from 'react';
import AppLayout from '@/components/AppLayout';
import LabAdminDashboard from './components/LabAdminDashboard';

export default function AdminLabPage() {
  return (
    <AppLayout
      title="Administracion del laboratorio"
      subtitle="Personal · Trafico del lab · Asignacion de roles"
    >
      <LabAdminDashboard />
    </AppLayout>
  );
}
