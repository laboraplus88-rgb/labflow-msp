import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventoryWorkspace from './components/InventoryWorkspace';

export default function InventoryPage() {
  return (
    <AppLayout
      title="Inventario de insumos"
      subtitle="Kardex · Ingresos (distrito, donación, compra, intercambio) · Consumos · Responsable de recepción"
    >
      <InventoryWorkspace />
    </AppLayout>
  );
}
