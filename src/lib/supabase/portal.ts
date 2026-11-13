import { createClient } from './client';

export type PortalResult = {
  patient_name: string;
  cedula: string;
  request_code: string;
  exam_name: string;
  category: string;
  result: string | null;
  result_unit: string | null;
  result_range: string | null;
  result_flag: string | null;
  validated_at: string | null;
  laboratory_name: string | null;
};

/**
 * Consulta pública (anon) vía RPC security definer.
 * Requiere: cédula + código de orden (exam_requests.code).
 * Solo devuelve exámenes Validado/Entregado.
 */
export async function portalLookup(cedula: string, accessCode: string) {
  const supabase = createClient() as any;
  return supabase.rpc('patient_portal_lookup', {
    p_cedula: cedula.trim(),
    p_access_code: accessCode.trim(),
  });
}
