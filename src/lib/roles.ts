/** Roles reales del sistema LabFlow (MSP) */
export const ROLES = ["jefa", "tecnologo", "toma", "medico"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  jefa: "Jefa de Laboratorio",
  tecnologo: "Tecnólogo / Técnico",
  toma: "Toma de Muestras",
  medico: "Médico / Doctor",
};

/** Quién puede crear personal */
export const ADMIN_ROLES: Role[] = ["jefa"];
