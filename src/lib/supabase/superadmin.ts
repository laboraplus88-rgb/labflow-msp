import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from './server';

/** Verifica que quien llama a una ruta /api sea un superadmin activo. */
export async function requireSuperadmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, res: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const { data: me } = await supabase.from('profiles').select('role, active').eq('id', user.id).single();
  if (!me || me.role !== 'superadmin' || !me.active) {
    return { ok: false, res: NextResponse.json({ error: 'Solo el Admin Global puede hacer esto.' }, { status: 403 }) };
  }
  return { ok: true };
}
