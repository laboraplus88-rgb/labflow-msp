import React from 'react';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import CollectionCharts from './components/CollectionCharts';
import TatAlertsPanel from './components/TatAlertsPanel';
import BottleneckPanel from './components/BottleneckPanel';
import MixAndDoctors from './components/MixAndDoctors';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function StatisticsDashboardPage() {
  // El Admin Global solo gestiona laboratorios: no ve estadísticas clínicas.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role === 'superadmin') redirect('/admin-global');
  }

  return (
    <AppLayout
      title="Estadísticas del laboratorio"
      subtitle="Producción, cuellos de botella y cumplimiento de plazos"
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
