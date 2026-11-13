import { createClient } from './client';

export type PortalExam = {
  exam_name: string;
  category: string;
  result: string | null;
  result_unit: string | null;
  result_range: string | null;
  result_flag: string | null;
  stage: string;
  validated_at: string | null;
};

export type PortalOrder = {
  request_id: string;
  request_code: string;
  request_created_at: string;
  laboratory_name: string | null;
  exams: PortalExam[];
};

export type PortalAuthResponse = {
  patient: {
    id: string;
    cedula: string;
    name: string;
    laboratory_id: string;
  };
  orders: PortalOrder[];
};

/** Portal v2: cédula + PIN (6 dígitos) o código de orden */
export async function portalAuth(cedula: string, secret: string) {
  const supabase = createClient() as any;
  return supabase.rpc('patient_portal_auth', {
    p_cedula: cedula.trim(),
    p_secret: secret.trim(),
  });
}

export async function portalLookup(cedula: string, accessCode: string) {
  return portalAuth(cedula, accessCode);
}

/** Staff: emitir / renovar PIN de 6 dígitos (se muestra una sola vez) */
export async function portalIssuePin(patientId: string) {
  const supabase = createClient() as any;
  return supabase.rpc('portal_issue_pin', { p_patient_id: patientId });
}

/** Staff: encolar aviso resultados listos */
export async function portalEnqueueResultsReady(
  requestId: string,
  channel: 'email' | 'whatsapp' | 'sms' = 'whatsapp',
  destination?: string
) {
  const supabase = createClient() as any;
  return supabase.rpc('portal_enqueue_results_ready', {
    p_request_id: requestId,
    p_channel: channel,
    p_destination: destination ?? null,
  });
}
