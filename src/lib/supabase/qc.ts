import { createClient } from './client';

export type QcStatus = {
  configured: boolean;
  ok: boolean;
  soft_block?: boolean;
  message?: string;
  last_status?: string;
  last_run_at?: string;
  rule_hit?: string;
};

export type QcDefinition = {
  id: string;
  exam_code: string;
  name: string;
  level: string;
  target: number | null;
  sd: number | null;
  min_value: number | null;
  max_value: number | null;
  active: boolean;
};

export type QcRun = {
  id: string;
  exam_code: string;
  measured_value: number;
  status: 'in_control' | 'out_of_control';
  rule_hit: string | null;
  run_at: string;
  user_name: string | null;
  notes: string | null;
};

export async function qcStatusForExam(examCode: string, maxAgeHours = 24) {
  const supabase = createClient() as any;
  return supabase.rpc('qc_status_for_exam', {
    p_exam_code: examCode,
    p_max_age_hours: maxAgeHours,
  });
}

export async function listQcDefinitions(examCode?: string) {
  const supabase = createClient() as any;
  let q = supabase
    .from('qc_control_definitions')
    .select('*')
    .eq('active', true)
    .order('exam_code');
  if (examCode) q = q.eq('exam_code', examCode);
  return q;
}

export async function createQcDefinition(payload: {
  exam_code: string;
  name?: string;
  level?: string;
  target?: number | null;
  sd?: number | null;
  min_value?: number | null;
  max_value?: number | null;
}) {
  const supabase = createClient() as any;
  const { data: lab } = await supabase.rpc('my_role');
  void lab;
  // laboratory_id lo fija default RLS / trigger si existe; usamos select de perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('laboratory_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.laboratory_id) {
    return { data: null, error: new Error('Usuario sin laboratorio') };
  }

  return supabase
    .from('qc_control_definitions')
    .insert({
      laboratory_id: profile.laboratory_id,
      exam_code: payload.exam_code.trim(),
      name: payload.name ?? 'Control',
      level: payload.level ?? 'N',
      target: payload.target ?? null,
      sd: payload.sd ?? null,
      min_value: payload.min_value ?? null,
      max_value: payload.max_value ?? null,
    })
    .select()
    .single();
}

export async function qcRegisterRun(definitionId: string, measuredValue: number, notes?: string) {
  const supabase = createClient() as any;
  return supabase.rpc('qc_register_run', {
    p_definition_id: definitionId,
    p_measured_value: measuredValue,
    p_notes: notes ?? null,
  });
}

export async function listQcRuns(examCode?: string, limit = 30) {
  const supabase = createClient() as any;
  let q = supabase
    .from('qc_runs')
    .select('*')
    .order('run_at', { ascending: false })
    .limit(limit);
  if (examCode) q = q.eq('exam_code', examCode);
  return q;
}

export async function tatAlertsSummary() {
  const supabase = createClient() as any;
  return supabase.rpc('tat_alerts_summary');
}
