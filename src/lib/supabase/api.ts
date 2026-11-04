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

/** Rol de app: jefa | tecnologo | toma | medico */
export async function getMyRole(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('my_role');
  if (error) {
    const profile = await getProfile();
    return profile?.role ?? null;
  }
  return data as string | null;
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

export async function getPatientById(id: string) {
  const supabase = createClient();
  return supabase.from('patients').select('*').eq('id', id).single();
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
  return supabase.from('exam_catalog').select('*').eq('active', true).order('category');
}

export async function createExamRequest(payload: {
  patient_id: string;
  order_type: OrderType;
  priority: Priority;
  facility_id?: string;
  diagnosis?: string;
  exams: { exam_code: string; exam_name: string; category: string; tube_type: string; range_text?: string; unit?: string }[];
}) {
  const supabase = createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc('create_exam_order', {
    p_patient_id: payload.patient_id,
    p_order_type: payload.order_type,
    p_priority: payload.priority,
    p_facility_id: payload.facility_id ?? null,
    p_diagnosis: payload.diagnosis ?? null,
    p_exams: payload.exams,
  });

  if (!rpcError && rpcData) {
    return {
      data: { request: rpcData.request, samples: rpcData.samples, tests: rpcData.tests },
      error: null,
    };
  }

  const user = await getSessionUser();
  const code = `REQ-${Date.now().toString(36).toUpperCase()}`;
  const { data: request, error: reqErr } = await supabase
    .from('exam_requests')
    .insert({
      code,
      patient_id: payload.patient_id,
      doctor_id: user?.id,
      order_type: payload.order_type,
      priority: payload.priority,
      facility_id: payload.facility_id,
      diagnosis: payload.diagnosis,
      status: 'registrada',
      created_by: user?.id,
    })
    .select()
    .single();

  if (reqErr || !request) return { data: null, error: reqErr ?? new Error('No request') };

  const byTube = new Map<string, typeof payload.exams>();
  payload.exams.forEach((e) => {
    const list = byTube.get(e.tube_type) ?? [];
    list.push(e);
    byTube.set(e.tube_type, list);
  });

  const samples: { id: string; code: string; tube_type: string }[] = [];
  let i = 0;
  for (const [tube, exams] of byTube) {
    i += 1;
    const scode = `M-${Date.now().toString(36).toUpperCase()}-${i}`;
    const { data: sample } = await supabase
      .from('samples')
      .insert({ code: scode, request_id: request.id, patient_id: payload.patient_id, tube_type: tube, status: 'generada' })
      .select()
      .single();
    if (sample) samples.push(sample);

    await supabase.from('tests').insert(
      exams.map((e) => ({
        code: `T-${Date.now().toString(36)}-${e.exam_code}`,
        request_id: request.id,
        patient_id: payload.patient_id,
        sample_id: sample?.id,
        exam_code: e.exam_code,
        exam_name: e.exam_name,
        category: e.category,
        stage: 'Solicitado' as Stage,
        priority: payload.priority,
        result_range: e.range_text,
        result_unit: e.unit,
      }))
    );
  }

  return { data: { request, samples, tests: [] }, error: null };
}

export async function listTests(filters?: { stage?: string; priority?: string }) {
  const supabase = createClient();
  let q = supabase
    .from('tests')
    .select('*, patients(primer_nombre, apellido_paterno, apellido_materno, cedula), exam_requests(order_type, priority)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.stage && filters.stage !== 'Todas') q = q.eq('stage', filters.stage);
  if (filters?.priority && filters.priority !== 'Todas') q = q.eq('priority', filters.priority);
  return q;
}

export async function updateTestStage(
  id: string,
  stage: Stage,
  extra?: { result?: string; result_flag?: string; note?: string }
) {
  const supabase = createClient();

  const { data: rpcRow, error: rpcErr } = await supabase.rpc('advance_test_stage', {
    p_test_id: id,
    p_stage: stage,
    p_result: extra?.result ?? null,
    p_result_flag: extra?.result_flag ?? null,
    p_note: extra?.note ?? null,
  });

  if (!rpcErr && rpcRow) return { data: rpcRow, error: null };

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
    .select('*, tests(*), facilities(name), profiles:profiles!exam_requests_doctor_profile_fkey(full_name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
}

export async function listRecentRequests() {
  const supabase = createClient();
  return supabase
    .from('exam_requests')
    .select('*, patients(primer_nombre, apellido_paterno, apellido_materno, cedula), tests(id)')
    .order('created_at', { ascending: false })
    .limit(30);
}

export async function dashboardStats() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('dashboard_stats');
  if (!error && data) {
    return {
      samplesToday: data.samplesToday ?? 0,
      testsToday: data.testsToday ?? 0,
      pending: data.pending ?? 0,
      urgentOpen: data.urgentOpen ?? 0,
      validatedToday: data.validatedToday ?? 0,
      role: data.role as string | undefined,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [samples, tests, pending, overdue] = await Promise.all([
    supabase.from('samples').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('tests').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('tests').select('id', { count: 'exact', head: true }).not('stage', 'in', '("Validado","Entregado")'),
    supabase.from('tests').select('id', { count: 'exact', head: true }).eq('priority', 'Urgente').not('stage', 'in', '("Validado","Entregado")'),
  ]);

  return {
    samplesToday: samples.count ?? 0,
    testsToday: tests.count ?? 0,
    pending: pending.count ?? 0,
    urgentOpen: overdue.count ?? 0,
  };
}

// ===== Laboratorio propio (multi-tenant) =====
export type MyLab = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  province: string | null;
  active: boolean;
  institution_name: string | null;
  unit_name: string | null;
  uo_code: string | null;
  location_code: string | null;
};

export async function getMyLaboratory(): Promise<MyLab | null> {
  const supabase = createClient() as any;
  const user = await getSessionUser();
  if (!user) return null;
  const { data: prof } = await supabase.from('profiles').select('laboratory_id').eq('id', user.id).single();
  if (!prof?.laboratory_id) return null;
  const { data } = await supabase.from('laboratories').select('*').eq('id', prof.laboratory_id).single();
  return (data as MyLab) ?? null;
}

export async function updateMyLaboratoryProfile(
  labId: string,
  v: { institution_name: string | null; unit_name: string | null; uo_code: string | null; location_code: string | null; city: string | null; province: string | null }
) {
  const supabase = createClient() as any;
  return supabase.from('laboratories').update(v).eq('id', labId);
}

export async function addFacility(v: { name: string; type: 'centro' | 'subcentro'; code: string }) {
  const supabase = createClient() as any;
  return supabase.from('facilities').insert({ name: v.name, type: v.type, code: v.code, active: true }).select().single();
}

export async function deactivateFacility(id: string) {
  const supabase = createClient() as any;
  return supabase.from('facilities').update({ active: false }).eq('id', id);
}

export async function setRequestingDoctor(requestId: string, name: string) {
  const supabase = createClient() as any;
  return supabase.from('exam_requests').update({ requesting_doctor: name }).eq('id', requestId);
}

// ===== Panel del médico =====
export type DoctorTest = {
  id: string; examName: string; category: string; stage: string; priority: string;
  ready: boolean; result: string | null; unit: string | null; range: string | null;
  flag: string | null; validatedAt: string | null;
};
export type DoctorOrder = {
  id: string; code: string; createdAt: string; orderType: string; priority: string; diagnosis: string | null;
  patient: { id: string; name: string; cedula: string; age: number | null; sex: string | null };
  examsTotal: number; examsReady: number; lastValidatedAt: string | null; tests: DoctorTest[];
};
export type DoctorPanelData = {
  from: string; to: string;
  kpis: { issued: number; delivered: number; open: number; urgentOpen: number; avgTatMin: number | null };
  orders: DoctorOrder[];
};

export async function getDoctorPanel(from: Date, to: Date): Promise<{ data: DoctorPanelData | null; error: string | null }> {
  const supabase = createClient() as any;
  const { data, error } = await supabase.rpc('doctor_panel', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) return { data: null, error: error.message };
  return { data: data as DoctorPanelData, error: null };
}
