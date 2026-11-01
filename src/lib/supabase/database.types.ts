export type AppRole = 'jefa' | 'tecnologo' | 'toma' | 'medico';
export type OrderType = 'Emergencia' | 'Consulta externa' | 'Ambulatorio';
export type Priority = 'Urgente' | 'Rutina' | 'Control';
export type Stage =
  | 'Solicitado'
  | 'Muestra recolectada'
  | 'Recibida en laboratorio'
  | 'En proceso'
  | 'Resultado ingresado'
  | 'Validado'
  | 'Entregado';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          role: AppRole;
          facility_id: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          role: AppRole;
          facility_id?: string | null;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      facilities: {
        Row: {
          id: string;
          name: string;
          type: 'centro' | 'subcentro';
          code: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'centro' | 'subcentro';
          code: string;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['facilities']['Insert']>;
      };
      patients: {
        Row: {
          id: string;
          historia: string | null;
          cedula: string;
          apellido_paterno: string;
          apellido_materno: string | null;
          primer_nombre: string;
          segundo_nombre: string | null;
          edad: number | null;
          sexo: 'F' | 'M' | null;
          provincia: string | null;
          canton: string | null;
          parroquia: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          historia?: string | null;
          cedula: string;
          apellido_paterno: string;
          apellido_materno?: string | null;
          primer_nombre: string;
          segundo_nombre?: string | null;
          edad?: number | null;
          sexo?: 'F' | 'M' | null;
          provincia?: string | null;
          canton?: string | null;
          parroquia?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      exam_requests: {
        Row: {
          id: string;
          code: string;
          patient_id: string;
          doctor_id: string | null;
          order_type: OrderType;
          priority: Priority;
          facility_id: string | null;
          diagnosis: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          patient_id: string;
          doctor_id?: string | null;
          order_type: OrderType;
          priority: Priority;
          facility_id?: string | null;
          diagnosis?: string | null;
          status?: string;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['exam_requests']['Insert']>;
      };
      samples: {
        Row: {
          id: string;
          code: string;
          request_id: string;
          patient_id: string;
          tube_type: string;
          tube_label: string | null;
          collected_at: string | null;
          collected_by: string | null;
          status: string;
          reject_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          request_id: string;
          patient_id: string;
          tube_type: string;
          tube_label?: string | null;
          collected_at?: string | null;
          collected_by?: string | null;
          status?: string;
          reject_reason?: string | null;
        };
        Update: Partial<Database['public']['Tables']['samples']['Insert']>;
      };
      tests: {
        Row: {
          id: string;
          code: string;
          request_id: string;
          patient_id: string;
          sample_id: string | null;
          exam_code: string;
          exam_name: string;
          category: string;
          stage: Stage;
          priority: Priority;
          result: string | null;
          result_unit: string | null;
          result_range: string | null;
          result_flag: 'normal' | 'alto' | 'bajo' | 'critico' | null;
          tech_id: string | null;
          validator_id: string | null;
          stage_started_at: string;
          validated_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          request_id: string;
          patient_id: string;
          sample_id?: string | null;
          exam_code: string;
          exam_name: string;
          category: string;
          stage?: Stage;
          priority: Priority;
          result?: string | null;
          result_unit?: string | null;
          result_range?: string | null;
          result_flag?: 'normal' | 'alto' | 'bajo' | 'critico' | null;
          tech_id?: string | null;
          validator_id?: string | null;
          note?: string | null;
        };
        Update: Partial<Database['public']['Tables']['tests']['Insert']>;
      };
      exam_catalog: {
        Row: {
          id: string;
          name: string;
          category: string;
          range_text: string | null;
          unit: string | null;
          tube_type: string;
          active: boolean;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          range_text?: string | null;
          unit?: string | null;
          tube_type: string;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['exam_catalog']['Insert']>;
      };
    };
  };
};
