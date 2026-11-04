import React from 'react';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import DoctorDashboard from './components/DoctorDashboard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DoctorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-up-login-screen');
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role === 'superadmin') redirect('/admin-global');
  if (me?.role !== 'medico') redirect('/');

  return (
    <AppLayout
      title="Panel del médico"
      subtitle="Órdenes emitidas y resultados entregados durante su guardia"
    >
      <DoctorDashboard />
    </AppLayout>
  );
}
