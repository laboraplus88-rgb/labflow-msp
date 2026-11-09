import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessPath,
  defaultHomeForRole,
  isAppRole,
  type AppRole,
} from "@/lib/roles";

/**
 * Middleware de sesión + autorización por rol (defensa en profundidad).
 *
 * - Mantiene el refresh de cookies de Supabase Auth.
 * - Tras autenticar, lee profiles (role, active, laboratory_id).
 * - Opcionalmente comprueba laboratories.active.
 * - Restringe rutas admin/operativas según ROUTE_ACCESS en roles.ts.
 *
 * La seguridad de datos sigue dependiendo de RLS en Postgres.
 * Este middleware evita que un rol vea UIs que no le corresponden.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/sign-up-login-screen");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/lab-inactive";

  // --- Sin sesión ---
  if (!user && !isAuthPage && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-up-login-screen";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // --- Con sesión en página de login ---
  if (user && isAuthPage) {
    const role = await resolveRole(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = defaultHomeForRole(role);
    return NextResponse.redirect(url);
  }

  // Rutas públicas restantes
  if (!user) {
    return supabaseResponse;
  }

  // --- Perfil y autorización ---
  const profile = await loadProfile(supabase, user.id);

  // Usuario sin perfil: no abrir paneles admin (evita estados rotos)
  if (!profile) {
    if (isPrivilegedPath(path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "profile_missing");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Cuenta desactivada
  if (profile.active === false) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/sign-up-login-screen";
    url.searchParams.set("error", "account_inactive");
    return NextResponse.redirect(url);
  }

  const role: AppRole | null = isAppRole(profile.role) ? profile.role : null;

  // Laboratorio inactivo (solo personal de lab; superadmin puede seguir en admin-global)
  if (
    role !== "superadmin" &&
    profile.laboratory_id &&
    isPrivilegedPath(path)
  ) {
    const labActive = await isLaboratoryActive(
      supabase,
      profile.laboratory_id
    );
    if (labActive === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "lab_inactive");
      return NextResponse.redirect(url);
    }
  }

  // Control de acceso por rol
  if (!canAccessPath(path, role)) {
    const url = request.nextUrl.clone();
    url.pathname = defaultHomeForRole(role);
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

function isPrivilegedPath(path: string): boolean {
  return (
    path.startsWith("/admin-global") ||
    path.startsWith("/admin-lab") ||
    path.startsWith("/doctor") ||
    path.startsWith("/inventory") ||
    path.startsWith("/test-processing-workflow") ||
    path.startsWith("/exam-request-sample-collection") ||
    path.startsWith("/patient-history") ||
    path.startsWith("/report")
  );
}

type ProfileRow = {
  role: string | null;
  active: boolean | null;
  laboratory_id: string | null;
};

async function loadProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, active, laboratory_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}

async function resolveRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<AppRole | null> {
  const profile = await loadProfile(supabase, userId);
  if (!profile?.role) return null;
  return isAppRole(profile.role) ? profile.role : null;
}

/**
 * null = no se pudo comprobar (no bloquear)
 * false = laboratorio inactivo
 * true = activo
 */
async function isLaboratoryActive(
  supabase: ReturnType<typeof createServerClient>,
  laboratoryId: string
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("laboratories")
    .select("active")
    .eq("id", laboratoryId)
    .maybeSingle();

  if (error || data == null) return null;
  return (data as { active: boolean }).active !== false;
}
