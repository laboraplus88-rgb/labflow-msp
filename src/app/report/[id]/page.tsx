import React from 'react';
import { redirect } from 'next/navigation';
import ReportView from './ReportView';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-up-login-screen');
  return <ReportView requestId={id} />;
}
