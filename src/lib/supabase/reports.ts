import { createClient } from '@/lib/supabase/client';

export type ReportTest = {
  id: string; examName: string; category: string; stage: string; ready: boolean;
  result: string | null; unit: string | null; range: string | null; flag: string | null; note: string | null;
  validatedAt: string | null; validatedBy: string | null; processedBy: string | null;
};
export type ReportData = {
  issuedAt: string;
  laboratory: {
    name: string; code: string; city: string | null; province: string | null;
    institution: string | null; unit: string | null; uoCode: string | null; locationCode: string | null;
  };
  request: {
    id: string; code: string; createdAt: string; orderType: string; priority: string;
    diagnosis: string | null; requestingDoctor: string | null; facility: string | null;
  };
  patient: {
    name: string; cedula: string; historia: string | null; age: number | null; sex: string | null;
    province: string | null; canton: string | null; parroquia: string | null;
  };
  samples: { code: string; tube: string; collectedAt: string | null; collectedBy: string | null }[];
  tests: ReportTest[];
};

export async function getReportData(requestId: string): Promise<{ data: ReportData | null; error: string | null }> {
  const supabase = createClient() as any;
  const { data, error } = await supabase.rpc('report_data', { p_request_id: requestId });
  if (error) return { data: null, error: error.message };
  return { data: data as ReportData, error: null };
}

/** Médicos del laboratorio y nombres ya usados, filtrados por lo que se escribe. */
export async function getDoctorNames(q: string): Promise<string[]> {
  const supabase = createClient() as any;
  const { data } = await supabase.rpc('lab_doctor_names', { p_q: q });
  return Array.isArray(data) ? (data as string[]) : [];
}
