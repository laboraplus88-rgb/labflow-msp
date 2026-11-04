"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStaffSchema } from "@/schemas/staff";
import { ADMIN_ROLES } from "@/lib/roles";

export async function createStaffUser(input: unknown) {
  const data = createStaffSchema.parse(input);

  // 1. Verificar que quien llama es Jefa (admin del lab)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, facility_id, laboratory_id")
    .eq("id", user.id)
    .single();

  if (!me || !ADMIN_ROLES.includes(me.role as any)) {
    throw new Error("Sin permisos. Solo la Jefa de Laboratorio puede crear personal.");
  }

  // 2. Cliente admin (service_role) — solo servidor
  const admin = createAdminClient();

  // 3. Crear usuario en Auth
  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
      must_change_password: true,
    },
  });

  if (error) throw new Error(error.message);

  // 4. Crear perfil (facility_id / laboratory_id del admin, nunca del formulario)
  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: data.full_name,
    email: data.email,
    role: data.role,
    active: data.is_active,
    facility_id: me.facility_id ?? null,
    // Si el schema tiene laboratory_id:
    // laboratory_id: (me as any).laboratory_id ?? null,
  } as any);

  if (pErr) {
    // Rollback
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(pErr.message);
  }

  return { ok: true };
}
