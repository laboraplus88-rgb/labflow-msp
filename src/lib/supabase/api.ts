import { createClient } from './client';
import type { OrderType, Priority, Stage } from './database.types';

export async function getSessionUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile() {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName: string, role: string) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function searchPatients(query: string) {
  const supabase = createClient();
  const q = query.trim();
  if (!q) {
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(50);
    return { data: data ?? [], error };
  }
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .or(`cedula.ilike.%${q}%,historia.ilike.%${q}%,apellido_paterno.ilike.%${q}%,primer_nombre.ilike.%${q}%`)
    .order('apellido_paterno')
    .limit(30);
  return { data: data ?? [], error };
}

export async function createPatient(payload: {
  historia?: string;
  cedula: string;
  apellido_paterno: string;
  apellido_materno?: string;
  primer_nombre: string;
  segundo_nombre?: string;
  edad?: number;
  sexo?: 'F' | 'M';
  provincia?: string;
  canton?: string;
  parroquia?: string;
}) {
  const supabase = createClient();
  const user = await getSessionUser();
  return supabase.from('patients').insert({ ...payload, created_by: user?.id }).select().single();
}

export async function getFacilities() {
  const supabase = createClient();
  return supabase.from('facilities').select('*').eq('active', true).order('code');
}

export async function getCatalog() {
  const supabase = createClient();
  return supabase.from('exam_catalog').select('*').eq('active', true).order('category').order('name');
}

export async function createExamRequest(payload: {
  patient_id: string;
  doctor_id?: string;
  order_type: OrderType;
  priority: Priority;
  facility_id?: string;
  diagnosis?: string;
  exams: { exam_code: string; exam_name: string; category: string; tube_type: string; range_text?: string; unit?: string }[];
}) {
  const supabase = createClient();
  const user = await getSessionUser();

  const { data: request, error: reqErr } = await supabase
    .from('exam_requests')
    .insert({
      patient_id: payload.patient_id,
      doctor_id: payload.doctor_id ?? user?.id,
      order_type: payload.order_type,
      priority: payload.priority,
      facility_id: payload.facility_id,
      diagnosis: payload.diagnosis,
      created_by: user?.id,
      status: 'registrada',
    })
    .select()
    .single();

  if (reqErr || !request) return { data: null, error: reqErr };

  const byTube = new Map<string, typeof payload.exams>();
  payload.exams.forEach((e) => {
    const list = byTube.get(e.tube_type) ?? [];
    list.push(e);
    byTube.set(e.tube_type, list);
  });

  const samplesPayload = Array.from(byTube.entries()).map(([tube_type, exams]) => ({
    request_id: request.id,
    patient_id: payload.patient_id,
    tube_type,
    tube_label: exams.map((e) => e.exam_name).join(' · '),
    status: 'generada' as const,
    collected_by: user?.id,
  }));

  const { data: samples, error: sampErr } = await supabase.from('samples').insert(samplesPayload).select();
  if (sampErr) return { data: { request, samples: [], tests: [] }, error: sampErr };

  const tubeToSample = new Map((samples ?? []).map((s) => [s.tube_type, s.id]));

  const testsPayload = payload.exams.map((e) => ({
    request_id: request.id,
    patient_id: payload.patient_id,
    sample_id: tubeToSample.get(e.tube_type) ?? null,
    exam_code: e.exam_code,
    exam_name: e.exam_name,
    category: e.category,
    stage: 'Solicitado' as Stage,
    priority: payload.priority,
    result_range: e.range_text ?? null,
    result_unit: e.unit ?? null,
  }));

  const { data: tests, error: testErr } = await supabase.from('tests').insert(testsPayload).select();

  return {
    data: { request, samples: samples ?? [], tests: tests ?? [] },
    error: testErr,
  };
}

export async function listTests() {
  const supabase = createClient();
  return supabase
    .from('tests')
    .select('*, patients(primer_nombre, apellido_paterno, apellido_materno, cedula)')
    .order('created_at', { ascending: false })
    .limit(100);
}

export async function updateTestStage(id: string, stage: Stage, extra?: { result?: string; result_flag?: string; note?: string }) {
  const supabase = createClient();
  const user = await getSessionUser();
  const patch: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString(),
  };
  if (extra?.result !== undefined) patch.result = extra.result;
  if (extra?.result_flag) patch.result_flag = extra.result_flag;
  if (extra?.note) patch.note = extra.note;
  if (stage === 'Resultado ingresado') patch.tech_id = user?.id;
  if (stage === 'Validado') {
    patch.validator_id = user?.id;
    patch.validated_at = new Date().toISOString();
  }
  return supabase.from('tests').update(patch).eq('id', id).select().single();
}

export async function getPatientOrders(patientId: string) {
  const supabase = createClient();
  return supabase
    .from('exam_requests')
    .select('*, tests(*), facilities(name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
}

export async function dashboardStats() {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = today.toISOString();

  const [samples, tests, pending, urgent] = await Promise.all([
    supabase.from('samples').select('id', { count: 'exact', head: true }).gte('created_at', iso),
    supabase.from('tests').select('id', { count: 'exact', head: true }).gte('created_at', iso),
    supabase.from('tests').select('id', { count: 'exact', head: true }).not('stage', 'in', '("Validado","Entregado")'),
    supabase.from('tests').select('id', { count: 'exact', head: true }).eq('priority', 'Urgente').not('stage', 'in', '("Validado","Entregado")'),
  ]);

  return {
    samplesToday: samples.count ?? 0,
    testsToday: tests.count ?? 0,
    pending: pending.count ?? 0,
    urgentOpen: urgent.count ?? 0,
  };
}
