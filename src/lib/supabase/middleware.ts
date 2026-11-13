import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessPath,
  defaultHomeForRole,
  isAppRole,
  type AppRole,
} from "@/lib/roles";

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
  const isPortal = path === "/portal" || path.startsWith("/portal/");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/lab-inactive" ||
    isPortal;

  if (!user && !isAuthPage && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-up-login-screen";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const role = await resolveRole(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = defaultHomeForRole(role);
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  // Portal accesible también con sesión
  if (isPortal) {
    return supabaseResponse;
  }

  const profile = await loadProfile(supabase, user.id);

  if (!profile) {
    if (isPrivilegedPath(path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "profile_missing");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (profile.active === false) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/sign-up-login-screen";
    url.searchParams.set("error", "account_inactive");
    return NextResponse.redirect(url);
  }

  const role: AppRole | null = isAppRole(profile.role) ? profile.role : null;

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
    path.startsWith("/billing") ||
    path.startsWith("/appointments") ||
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
