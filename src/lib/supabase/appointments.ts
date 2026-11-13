import { createClient } from './client';

export type ApptStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ApptPriority = 'normal' | 'prioritario' | 'programa_publico' | 'urgente';

export type Appointment = {
  id: string;
  laboratory_id: string;
  resource_id: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_cedula: string | null;
  patient_phone: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: ApptStatus;
  priority: ApptPriority;
  program_name: string | null;
  notes: string | null;
  preparation_notes: string | null;
  exam_request_id: string | null;
  appointment_resources?: { name: string; code: string | null } | null;
};

export type AppointmentResource = {
  id: string;
  name: string;
  code: string | null;
  resource_type: string;
  active: boolean;
};

export async function listResources() {
  const supabase = createClient() as any;
  return supabase
    .from('appointment_resources')
    .select('id, name, code, resource_type, active')
    .eq('active', true)
    .order('sort_order')
    .order('name');
}

export async function listAppointmentsForDay(dayIso: string) {
  const supabase = createClient() as any;
  const start = new Date(dayIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return supabase
    .from('appointments')
    .select('*, appointment_resources(name, code)')
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .order('scheduled_at');
}

export async function createAppointment(params: {
  scheduled_at: string;
  duration_minutes?: number;
  resource_id?: string | null;
  patient_id?: string | null;
  patient_name?: string;
  patient_cedula?: string;
  patient_phone?: string;
  priority?: ApptPriority;
  program_name?: string;
  notes?: string;
  preparation_notes?: string;
}) {
  const supabase = createClient() as any;
  return supabase.rpc('appointment_create', {
    p_scheduled_at: params.scheduled_at,
    p_duration_minutes: params.duration_minutes ?? 15,
    p_resource_id: params.resource_id ?? null,
    p_patient_id: params.patient_id ?? null,
    p_patient_name: params.patient_name ?? null,
    p_patient_cedula: params.patient_cedula ?? null,
    p_patient_phone: params.patient_phone ?? null,
    p_priority: params.priority ?? 'normal',
    p_program_name: params.program_name ?? null,
    p_notes: params.notes ?? null,
    p_preparation_notes: params.preparation_notes ?? null,
    p_exam_request_id: null,
  });
}

export async function cancelAppointment(id: string, reason?: string) {
  const supabase = createClient() as any;
  return supabase.rpc('appointment_cancel', {
    p_appointment_id: id,
    p_reason: reason ?? null,
  });
}

export async function rescheduleAppointment(
  id: string,
  scheduled_at: string,
  resource_id?: string | null,
  duration_minutes?: number | null
) {
  const supabase = createClient() as any;
  return supabase.rpc('appointment_reschedule', {
    p_appointment_id: id,
    p_scheduled_at: scheduled_at,
    p_resource_id: resource_id ?? null,
    p_duration_minutes: duration_minutes ?? null,
  });
}

export async function updateAppointmentStatus(id: string, status: ApptStatus) {
  const supabase = createClient() as any;
  return supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}
