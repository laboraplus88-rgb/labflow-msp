/** Roles reales del sistema LabFlow (MSP) */
export const ROLES = ["jefa", "tecnologo", "toma", "medico"] as const;

export type Role = (typeof ROLES)[number];

/** Incluye superadmin (multi-tenant / panel global) */
export type AppRole = Role | "superadmin";

export const ROLE_LABELS: Record<Role, string> = {
  jefa: "Jefa de Laboratorio",
  tecnologo: "Tecnólogo / Técnico",
  toma: "Toma de Muestras",
  medico: "Médico / Doctor",
};

/** Quién puede crear personal */
export const ADMIN_ROLES: Role[] = ["jefa"];

/** Personal operativo de laboratorio (no médico, no superadmin) */
export const LAB_STAFF_ROLES: AppRole[] = ["jefa", "tecnologo", "toma"];

/** Roles que pueden operar el flujo clínico del lab */
export const LAB_OPERATIVE_ROLES: AppRole[] = ["jefa", "tecnologo", "toma", "medico"];

/**
 * Prefijos de ruta y roles permitidos.
 * El middleware usa esto para defensa en profundidad (además de RLS).
 */
export const ROUTE_ACCESS: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/admin-global", roles: ["superadmin"] },
  { prefix: "/admin-lab", roles: ["jefa", "superadmin"] },
  { prefix: "/doctor", roles: ["medico", "superadmin"] },
  {
    prefix: "/billing",
    roles: ["jefa", "tecnologo", "toma"],
  },
  {
    prefix: "/inventory",
    roles: ["jefa", "tecnologo", "toma", "superadmin"],
  },
  {
    prefix: "/test-processing-workflow",
    roles: ["jefa", "tecnologo", "toma", "superadmin"],
  },
  {
    prefix: "/exam-request-sample-collection",
    roles: ["jefa", "tecnologo", "toma", "medico", "superadmin"],
  },
  {
    prefix: "/patient-history",
    roles: ["jefa", "tecnologo", "toma", "medico", "superadmin"],
  },
  {
    prefix: "/report",
    roles: ["jefa", "tecnologo", "toma", "medico", "superadmin"],
  },
];

export function isAppRole(value: string | null | undefined): value is AppRole {
  if (!value) return false;
  return value === "superadmin" || (ROLES as readonly string[]).includes(value);
}

export function canAccessPath(pathname: string, role: AppRole | null): boolean {
  if (!role) return false;
  const rule = ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
  if (!rule) return true; // rutas no listadas: las cubre auth + RLS
  return rule.roles.includes(role);
}

/** Home sugerida por rol (post-login / acceso denegado) */
export function defaultHomeForRole(role: AppRole | null): string {
  switch (role) {
    case "superadmin":
      return "/admin-global";
    case "jefa":
      return "/admin-lab";
    case "medico":
      return "/doctor";
    case "tecnologo":
    case "toma":
      return "/test-processing-workflow";
    default:
      return "/";
  }
}
