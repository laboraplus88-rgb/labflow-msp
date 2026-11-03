import React from 'react';
import AppLayout from '@/components/AppLayout';
import GlobalAdminDashboard from './components/GlobalAdminDashboard';

export default function AdminGlobalPage() {
  return (
    <AppLayout
      title="Admin global · Multi-laboratorio"
      subtitle="Trafico en tiempo real · Estadisticas por laboratorio · Control de cuellos de botella"
    >
      <GlobalAdminDashboard />
    </AppLayout>
  );
}
