/**
 * Edge Function: create-staff-user
 * Crea usuario en Auth + perfil en el laboratorio de la jefa que llama.
 *
 * Deploy:
 *   supabase functions deploy create-staff-user --no-verify-jwt
 *
 * Secrets necesarios (ya suelen estar):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = ["jefa", "tecnologo", "toma", "medico"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente del usuario que llama (para verificar permisos)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "No autenticado" }, 401);
    }

    // Perfil de quien llama
    const { data: me, error: meErr } = await userClient
      .from("profiles")
      .select("role, laboratory_id, facility_id")
      .eq("id", user.id)
      .single();

    if (meErr || !me) {
      return json({ error: "Perfil no encontrado" }, 403);
    }

    // Solo jefa o superadmin pueden crear personal
    if (!["jefa", "superadmin"].includes(me.role)) {
      return json({ error: "Sin permisos. Solo jefa/superadmin puede crear personal." }, 403);
    }

    const body = await req.json();
    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "").trim();
    const active = body.active !== false;
    const password = String(body.password ?? "");

    if (!full_name || full_name.length < 3) {
      return json({ error: "Nombre completo inválido (mínimo 3 caracteres)" }, 400);
    }
    if (!email || !email.includes("@")) {
      return json({ error: "Email inválido" }, 400);
    }
    if (!VALID_ROLES.includes(role as any)) {
      return json({ error: `Rol inválido. Use: ${VALID_ROLES.join(", ")}` }, 400);
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return json(
        { error: "Contraseña: mínimo 8 caracteres, con mayúscula, minúscula y número" },
        400
      );
    }

    // Cliente admin (service_role)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Crear usuario en Auth
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        must_change_password: true,
      },
    });

    if (createErr) {
      return json({ error: createErr.message }, 400);
    }

    const newUserId = created.user.id;

    // 2. Crear / upsert perfil ligado al laboratorio de la jefa
    const profilePayload: Record<string, unknown> = {
      id: newUserId,
      full_name,
      email,
      role,
      active,
    };

    // Soportar ambos nombres de columna según el schema actual
    if (me.laboratory_id) profilePayload.laboratory_id = me.laboratory_id;
    if (me.facility_id) profilePayload.facility_id = me.facility_id;

    const { error: profileErr } = await admin.from("profiles").upsert(profilePayload);

    if (profileErr) {
      // Rollback: borrar usuario de Auth
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: profileErr.message }, 400);
    }

    return json({
      ok: true,
      user_id: newUserId,
      email,
      role,
      full_name,
    });
  } catch (e) {
    return json({ error: (e as Error).message || "Error interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
