import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperadmin } from '@/lib/supabase/superadmin';

export const dynamic = 'force-dynamic';

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(v: unknown, max = 120): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

type Ctx = { params: Promise<{ id: string }> };

/** Editar datos del laboratorio. Solo superadmin. Body: { name, code, city?, province?, maxUsers? } */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }

  const name = clean(body.name);
  const code = clean(body.code, 24).toUpperCase();
  const city = clean(body.city) || null;
  const province = clean(body.province) || null;
  const maxRaw = Number(body.maxUsers);
  if (name.length < 3) return NextResponse.json({ error: 'Ingrese el nombre del laboratorio.' }, { status: 400 });
  if (!CODE_RE.test(code)) return NextResponse.json({ error: 'Código inválido (3 a 24 letras, números o guiones).' }, { status: 400 });
  if (!Number.isInteger(maxRaw) || maxRaw < 1 || maxRaw > 1000) {
    return NextResponse.json({ error: 'El máximo de usuarios debe estar entre 1 y 1000.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('laboratories')
    .update({ name, code, city, province, max_users: maxRaw })
    .eq('id', id)
    .select('id, name, code')
    .single();
  if (error || !data) {
    const dup = error?.code === '23505';
    return NextResponse.json(
      { error: dup ? `Ya existe otro laboratorio con el código ${code}.` : 'No se pudo guardar los cambios.' },
      { status: dup ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true, laboratory: data });
}

/**
 * Eliminar un laboratorio. Solo superadmin y solo si NO tiene datos clínicos.
 * Body: { confirm: "<código del laboratorio>" }. Si ya operó, debe desactivarse (no se borra el historial clínico).
 */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* sin cuerpo */ }

  const admin = createAdminClient();
  const { data: lab } = await admin.from('laboratories').select('id, code, name').eq('id', id).single();
  if (!lab) return NextResponse.json({ error: 'Laboratorio no encontrado.' }, { status: 404 });
  if (clean(body.confirm, 24).toUpperCase() !== lab.code) {
    return NextResponse.json({ error: 'Escriba el código del laboratorio para confirmar.' }, { status: 400 });
  }

  // Protección del historial clínico: no se elimina un laboratorio con datos.
  for (const table of ['patients', 'exam_requests', 'samples', 'tests'] as const) {
    const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('laboratory_id', id);
    if (error) return NextResponse.json({ error: 'No se pudo verificar los datos del laboratorio.' }, { status: 500 });
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Este laboratorio ya tiene datos clínicos y no puede eliminarse. Desactívelo para bloquear el acceso.' },
        { status: 409 }
      );
    }
  }

  const { data: members } = await admin.from('profiles').select('id, role').eq('laboratory_id', id);
  if ((members ?? []).some((m) => m.role === 'superadmin')) {
    return NextResponse.json({ error: 'El laboratorio contiene una cuenta de Admin Global.' }, { status: 409 });
  }

  await admin.from('user_presence').delete().eq('laboratory_id', id);
  await admin.from('facilities').delete().eq('laboratory_id', id);
  for (const m of members ?? []) {
    await admin.auth.admin.deleteUser(m.id); // el perfil se elimina en cascada
  }
  const { error: delErr } = await admin.from('laboratories').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: 'No se pudo eliminar el laboratorio.' }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: { id: lab.id, code: lab.code, name: lab.name, users: (members ?? []).length } });
}
