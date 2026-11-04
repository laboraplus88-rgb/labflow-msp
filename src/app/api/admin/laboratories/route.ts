import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

function clean(v: unknown, max = 120): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Crea un laboratorio y su administrador (rol jefa). Solo superadmin.
 * Body: { name, code, city?, province?, maxUsers?, adminName, adminEmail, adminPassword }
 */
export async function POST(request: Request) {
  // 1) Quién llama: debe ser un superadmin activo.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }
  const { data: me } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single();
  if (!me || me.role !== 'superadmin' || !me.active) {
    return NextResponse.json({ error: 'Solo el Admin Global puede crear laboratorios.' }, { status: 403 });
  }

  // 2) Validar datos.
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
  const name = clean(body.name);
  const code = clean(body.code, 24).toUpperCase();
  const city = clean(body.city) || null;
  const province = clean(body.province) || null;
  const adminName = clean(body.adminName);
  const adminEmail = clean(body.adminEmail, 160).toLowerCase();
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : '';
  const maxUsersRaw = Number(body.maxUsers);
  const maxUsers = Number.isInteger(maxUsersRaw) && maxUsersRaw >= 1 && maxUsersRaw <= 1000 ? maxUsersRaw : 50;

  if (name.length < 3) return NextResponse.json({ error: 'Ingrese el nombre del laboratorio.' }, { status: 400 });
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: 'Código inválido: use 3 a 24 letras, números o guiones (ej. LAB-QUITO-01).' }, { status: 400 });
  }
  if (adminName.length < 3) return NextResponse.json({ error: 'Ingrese el nombre del administrador.' }, { status: 400 });
  if (!EMAIL_RE.test(adminEmail)) return NextResponse.json({ error: 'Correo del administrador inválido.' }, { status: 400 });
  if (adminPassword.length < 10) {
    return NextResponse.json({ error: 'La contraseña temporal debe tener al menos 10 caracteres.' }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // 3) Crear laboratorio.
  const { data: lab, error: labErr } = await admin
    .from('laboratories')
    .insert({ name, code, city, province, max_users: maxUsers, active: true })
    .select('id, name, code')
    .single();
  if (labErr || !lab) {
    const dup = labErr?.code === '23505';
    return NextResponse.json(
      { error: dup ? `Ya existe un laboratorio con el código ${code}.` : 'No se pudo crear el laboratorio.' },
      { status: dup ? 409 : 500 }
    );
  }

  // 4) Crear el usuario administrador (ya confirmado, con contraseña temporal).
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });
  if (userErr || !created?.user) {
    await admin.from('laboratories').delete().eq('id', lab.id); // deshacer
    const exists = /already|registered|exists/i.test(userErr?.message ?? '');
    return NextResponse.json(
      { error: exists ? 'Ya existe un usuario con ese correo.' : 'No se pudo crear el usuario administrador.' },
      { status: exists ? 409 : 500 }
    );
  }

  // 5) Asignar rol jefa y vincular al laboratorio.
  const { error: profErr } = await admin.from('profiles').upsert({
    id: created.user.id,
    email: adminEmail,
    full_name: adminName,
    role: 'jefa',
    laboratory_id: lab.id,
    active: true,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id); // deshacer
    await admin.from('laboratories').delete().eq('id', lab.id);
    return NextResponse.json({ error: 'No se pudo asignar el rol de administrador.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    laboratory: lab,
    admin: { email: adminEmail, name: adminName },
  });
}
