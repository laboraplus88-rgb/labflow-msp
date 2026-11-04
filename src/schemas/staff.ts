import { z } from "zod";
import { ROLES } from "@/lib/roles";

export const createStaffSchema = z.object({
  full_name: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(ROLES),
  is_active: z.boolean().default(true),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe tener una mayúscula")
    .regex(/[a-z]/, "Debe tener una minúscula")
    .regex(/[0-9]/, "Debe tener un número")
    .regex(/[!@#$%&*?]/, "Debe tener un carácter especial"),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
