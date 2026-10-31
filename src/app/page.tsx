import React from 'react';
import AppLayout from '@/components/AppLayout';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import CollectionCharts from './components/CollectionCharts';
import TatAlertsPanel from './components/TatAlertsPanel';
import BottleneckPanel from './components/BottleneckPanel';
import MixAndDoctors from './components/MixAndDoctors';

export default function StatisticsDashboardPage() {
  return (
    <AppLayout
      title="Estadísticas del laboratorio"
      subtitle="Producción, cuellos de botella y cumplimiento de plazos · C.S. El Paraíso"
    >
      <div className="space-y-4 sm:space-y-6">
        <MetricsBentoGrid />
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.4fr_1fr]">
          <CollectionCharts />
          <TatAlertsPanel />
        </div>
        <BottleneckPanel />
        <MixAndDoctors />
      </div>
    </AppLayout>
  );
}
