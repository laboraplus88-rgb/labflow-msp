import React from 'react';
import AppLayout from '@/components/AppLayout';
import BillingWorkspace from './components/BillingWorkspace';

export default function BillingPage() {
  return (
    <AppLayout
      title="Facturación y cobranza"
      subtitle="Emitir desde órdenes · Registrar pagos · Anular (jefa) · Solo por RPC"
    >
      <BillingWorkspace />
    </AppLayout>
  );
}
