import React from 'react';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GlobalAdminDashboard from './components/GlobalAdminDashboard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalPage() {
  // Solo el Admin Global entra aquí (además de las políticas RLS en la base de datos).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-up-login-screen');
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'superadmin') redirect('/');

  return (
    <AppLayout
      title="Admin global · Multi-laboratorio"
      subtitle="Crear laboratorios y administradores · Tráfico en tiempo real · Estadísticas por laboratorio"
    >
      <GlobalAdminDashboard />
    </AppLayout>
  );
}
