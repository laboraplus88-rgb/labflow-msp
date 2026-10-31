// LabFlow shared mock data and types
// BACKEND: replace with Supabase queries

export type Priority = 'Urgente' | 'Rutina' | 'Control';
export type OrderType = 'Emergencia' | 'Consulta externa' | 'Ambulatorio';
export type Stage =
  | 'Solicitado'
  | 'Muestra recolectada'
  | 'Recibida en laboratorio'
  | 'En proceso'
  | 'Resultado ingresado'
  | 'Validado'
  | 'Entregado';

export type TubeKey = 'yellow' | 'purple' | 'blue' | 'green' | 'gray' | 'urine' | 'stool' | 'other';

export const TUBES: Record<TubeKey, { label: string; note: string; swatch: string }> = {
  yellow: { label: 'Tubo amarillo (suero/gel)', note: 'Suero', swatch: 'bg-yellow-400' },
  purple: { label: 'Tubo lila (EDTA)', note: 'Sangre total', swatch: 'bg-purple-500' },
  blue: { label: 'Tubo azul (citrato)', note: 'Plasma citrato', swatch: 'bg-blue-500' },
  green: { label: 'Tubo verde (heparina)', note: 'Plasma heparina', swatch: 'bg-green-500' },
  gray: { label: 'Tubo gris (fluoruro)', note: 'Glucosa', swatch: 'bg-gray-400' },
  urine: { label: 'Frasco de orina', note: 'Orina', swatch: 'bg-amber-200' },
  stool: { label: 'Frasco de heces', note: 'Heces', swatch: 'bg-amber-700' },
  other: { label: 'Otro', note: 'Otro', swatch: 'bg-slate-300' },
};

export interface CatalogExam {
  id: string;
  name: string;
  category: string;
  range: string;
  unit: string;
  tube: TubeKey;
}

export const CATEGORIES = [
  'Hematologia',
  'Uroanalisis',
  'Coprologico',
  'Quimica sanguinea',
  'Serologia',
  'Bacteriologia',
  'Otros',
] as const;

export const CATALOG: CatalogExam[] = [
  { id: 'h-01', name: 'Biometria hematica', category: 'Hematologia', range: 'Ver informe', unit: '-', tube: 'purple' },
  { id: 'h-02', name: 'Hemoglobina', category: 'Hematologia', range: '12.0-16.0', unit: 'g/dL', tube: 'purple' },
  { id: 'h-03', name: 'Hematocrito', category: 'Hematologia', range: '36-46', unit: '%', tube: 'purple' },
  { id: 'h-04', name: 'Leucocitos', category: 'Hematologia', range: '4.5-11.0', unit: 'x10^3/uL', tube: 'purple' },
  { id: 'h-05', name: 'Plaquetas', category: 'Hematologia', range: '150-450', unit: 'x10^3/uL', tube: 'purple' },
  { id: 'h-09', name: 'Tiempo de protrombina (TP)', category: 'Hematologia', range: '11-13.5', unit: 's', tube: 'blue' },
  { id: 'h-10', name: 'T. tromboplastina parcial (TTP)', category: 'Hematologia', range: '25-35', unit: 's', tube: 'blue' },
  { id: 'u-01', name: 'Examen general de orina', category: 'Uroanalisis', range: 'Ver informe', unit: '-', tube: 'urine' },
  { id: 'c-01', name: 'Coproparasitario', category: 'Coprologico', range: 'Negativo', unit: '-', tube: 'stool' },
  { id: 'q-01', name: 'Glucosa en ayunas', category: 'Quimica sanguinea', range: '70-100', unit: 'mg/dL', tube: 'gray' },
  { id: 'q-03', name: 'Urea', category: 'Quimica sanguinea', range: '15-45', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-04', name: 'Creatinina', category: 'Quimica sanguinea', range: '0.6-1.2', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-06', name: 'Albumina', category: 'Quimica sanguinea', range: '3.5-5.0', unit: 'g/dL', tube: 'yellow' },
  { id: 'q-15', name: 'Colesterol total', category: 'Quimica sanguinea', range: '< 200', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-18', name: 'Trigliceridos', category: 'Quimica sanguinea', range: '< 150', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-19', name: 'Hierro serico', category: 'Quimica sanguinea', range: '60-170', unit: 'ug/dL', tube: 'yellow' },
  { id: 's-01', name: 'VDRL', category: 'Serologia', range: 'No reactivo', unit: '-', tube: 'yellow' },
  { id: 'b-01', name: 'Cultivo de orina', category: 'Bacteriologia', range: 'Sin crecimiento', unit: '-', tube: 'urine' },
  { id: 'b-03', name: 'Gram', category: 'Bacteriologia', range: 'Ver informe', unit: '-', tube: 'other' },
  { id: 'o-01', name: 'TSH', category: 'Otros', range: '0.4-4.0', unit: 'mUI/L', tube: 'yellow' },
];

export const STAGES: Stage[] = [
  'Solicitado',
  'Muestra recolectada',
  'Recibida en laboratorio',
  'En proceso',
  'Resultado ingresado',
  'Validado',
  'Entregado',
];

export const TECHS = [
  'Bq. Diana Pillajo',
  'Bq. Marco Naranjo',
  'Lcda. Andrea Bravo',
  'Lcda. Rosa Chiliquinga',
  'Dra. Tatiana Mejia',
];

export const DOCTORS = [
  'Dra. Juana Sarango',
  'Dr. Mauricio Quishpe',
  'Dr. Luis P. Andrade',
  'Dra. Carmen Villacis',
  'Dra. Paola Jaramillo',
  'Dr. Esteban Cevallos',
];

export const PROVINCES = ['Pichincha', 'Guayas', 'Azuay', 'Manabi', 'Tungurahua', 'Imbabura'];

export const TAT_MINUTES: Record<Priority, number> = {
  Urgente: 60,
  Rutina: 1440,
  Control: 2880,
};

export function formatMinutes(m: number): string {
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? h + ' h ' + min + ' min' : h + ' h';
}

export interface WorkflowTest {
  id: string;
  patient: string;
  cedula: string;
  exam: string;
  category: string;
  sample: string;
  orderType: OrderType;
  priority: Priority;
  doctor: string;
  tech: string;
  validator: string;
  stage: Stage;
  minutesElapsed: number;
  result: string;
  note: string;
}

export const WORKFLOW_TESTS: WorkflowTest[] = [
  { id: 'T-24884', patient: 'Macias Zambrano Jose Luis', cedula: '1305556677', exam: 'Tiempo de protrombina (TP)', category: 'Hematologia', sample: 'M-88101', orderType: 'Emergencia', priority: 'Urgente', doctor: 'Dr. Mauricio Quishpe', tech: 'Lcda. Andrea Bravo', validator: 'Dra. Tatiana Mejia', stage: 'Recibida en laboratorio', minutesElapsed: 71, result: '', note: '' },
  { id: 'T-24885', patient: 'Macias Zambrano Jose Luis', cedula: '1305556677', exam: 'T. tromboplastina parcial (TTP)', category: 'Hematologia', sample: 'M-88101', orderType: 'Emergencia', priority: 'Urgente', doctor: 'Dr. Mauricio Quishpe', tech: 'Lcda. Andrea Bravo', validator: 'Dra. Tatiana Mejia', stage: 'Recibida en laboratorio', minutesElapsed: 71, result: '', note: '' },
  { id: 'T-24880', patient: 'Maldonado Cuesta Pedro Pablo', cedula: '1712098345', exam: 'Cultivo de orina', category: 'Bacteriologia', sample: 'M-88090', orderType: 'Consulta externa', priority: 'Rutina', doctor: 'Dra. Juana Sarango', tech: 'Bq. Diana Pillajo', validator: 'Dra. Tatiana Mejia', stage: 'En proceso', minutesElapsed: 1570, result: '', note: 'Incubacion 24h' },
  { id: 'T-24891', patient: 'Espinoza Burbano Maria V.', cedula: '0912345678', exam: 'Gram', category: 'Bacteriologia', sample: 'M-88120', orderType: 'Emergencia', priority: 'Urgente', doctor: 'Dr. Mauricio Quishpe', tech: 'Bq. Diana Pillajo', validator: 'Dra. Tatiana Mejia', stage: 'Resultado ingresado', minutesElapsed: 55, result: 'Cocos Gram +', note: '' },
  { id: 'T-24870', patient: 'Rodriguez Lopez Maria Jose', cedula: '0712345678', exam: 'Glucosa en ayunas', category: 'Quimica sanguinea', sample: 'M-88050', orderType: 'Emergencia', priority: 'Urgente', doctor: 'Dr. Mauricio Quishpe', tech: 'Bq. Diana Pillajo', validator: 'Dra. Tatiana Mejia', stage: 'Validado', minutesElapsed: 48, result: '186 mg/dL', note: '' },
  { id: 'T-24860', patient: 'Fernandez Pablo Carlos', cedula: '0702736620', exam: 'Trigliceridos', category: 'Quimica sanguinea', sample: 'M-88231', orderType: 'Consulta externa', priority: 'Rutina', doctor: 'Dra. Paola Jaramillo', tech: 'Bq. Marco Naranjo', validator: 'Dra. Tatiana Mejia', stage: 'Entregado', minutesElapsed: 180, result: '168 mg/dL', note: '' },
];

export interface RecentRequest {
  id: string;
  patient: string;
  cedula: string;
  doctor: string;
  orderType: OrderType;
  priority: Priority;
  exams: number;
  tubes: number;
  status: string;
  time: string;
}

export const RECENT_REQUESTS: RecentRequest[] = [
  { id: 'SOL-0930', patient: 'Fernandez Pablo Carlos', cedula: '0702736620', doctor: 'Dra. Paola Jaramillo', orderType: 'Consulta externa', priority: 'Rutina', exams: 2, tubes: 2, status: 'Muestras recolectadas', time: '14:05' },
  { id: 'SOL-0921', patient: 'Macias Zambrano Jose Luis', cedula: '1305556677', doctor: 'Dr. Mauricio Quishpe', orderType: 'Emergencia', priority: 'Urgente', exams: 2, tubes: 1, status: 'Pendiente de toma', time: '11:48' },
  { id: 'SOL-0912', patient: 'Rodriguez Lopez Maria Jose', cedula: '0712345678', doctor: 'Dr. Mauricio Quishpe', orderType: 'Emergencia', priority: 'Urgente', exams: 3, tubes: 2, status: 'Muestras recolectadas', time: '08:15' },
];

export interface PatientResult {
  examId: string;
  examName: string;
  category: string;
  result: string;
  unit: string;
  range: string;
  flag: 'normal' | 'alto' | 'bajo' | 'critico' | null;
  validatedAt: string;
  validatedBy: string;
}

export interface PatientOrderHistory {
  requestId: string;
  date: string;
  time: string;
  orderType: OrderType;
  priority: Priority;
  doctor: string;
  origin: string;
  facility: string;
  status: string;
  results: PatientResult[];
}

export interface PatientRecord {
  id: string;
  historia: string;
  cedula: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  edad: number;
  sexo: 'F' | 'M';
  provincia: string;
  canton: string;
  parroquia: string;
  orders: PatientOrderHistory[];
}

export const PATIENTS: PatientRecord[] = [
  {
    id: 'pat-001',
    historia: '07123456789',
    cedula: '0712345678',
    apellidoPaterno: 'Rodriguez',
    apellidoMaterno: 'Lopez',
    primerNombre: 'Maria',
    segundoNombre: 'Jose',
    edad: 42,
    sexo: 'F',
    provincia: 'Pichincha',
    canton: 'Quito',
    parroquia: 'Chimbacalle',
    orders: [
      {
        requestId: 'SOL-0912',
        date: '2026-10-30',
        time: '08:15',
        orderType: 'Emergencia',
        priority: 'Urgente',
        doctor: 'Dr. Mauricio Quishpe',
        origin: 'Emergencia',
        facility: 'C.S. El Paraiso',
        status: 'Entregado',
        results: [
          { examId: 'q-01', examName: 'Glucosa en ayunas', category: 'Quimica sanguinea', result: '186', unit: 'mg/dL', range: '70-100', flag: 'alto', validatedAt: '30/10/26 09:02', validatedBy: 'Bq. Diana Pillajo' },
          { examId: 'q-04', examName: 'Creatinina', category: 'Quimica sanguinea', result: '1.9', unit: 'mg/dL', range: '0.6-1.2', flag: 'critico', validatedAt: '30/10/26 09:05', validatedBy: 'Bq. Diana Pillajo' },
        ],
      },
    ],
  },
  {
    id: 'pat-004',
    historia: '07027366200',
    cedula: '0702736620',
    apellidoPaterno: 'Fernandez',
    apellidoMaterno: 'Pablo',
    primerNombre: 'Carlos',
    segundoNombre: '',
    edad: 34,
    sexo: 'M',
    provincia: 'Pichincha',
    canton: 'Quito',
    parroquia: 'El Condado',
    orders: [
      {
        requestId: 'SOL-0930',
        date: '2026-10-30',
        time: '14:05',
        orderType: 'Consulta externa',
        priority: 'Rutina',
        doctor: 'Dra. Paola Jaramillo',
        origin: 'Consulta externa',
        facility: 'C.S. El Paraiso',
        status: 'Entregado',
        results: [
          { examId: 'q-18', examName: 'Trigliceridos', category: 'Quimica sanguinea', result: '168', unit: 'mg/dL', range: '< 150', flag: 'alto', validatedAt: '30/10/26 16:40', validatedBy: 'Bq. Marco Naranjo' },
        ],
      },
    ],
  },
];

export function searchPatients(query: string): PatientRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return PATIENTS;
  return PATIENTS.filter(
    (p) =>
      p.cedula.includes(q) ||
      p.historia.includes(q) ||
      (p.apellidoPaterno + ' ' + p.apellidoMaterno + ' ' + p.primerNombre).toLowerCase().includes(q)
  );
}

export function fullPatientName(p: PatientRecord): string {
  return (p.apellidoPaterno + ' ' + p.apellidoMaterno + ' ' + p.primerNombre + ' ' + p.segundoNombre).trim();
}

export const FACILITIES = [
  { id: 'cs-paraiso', name: 'C.S. El Paraiso', type: 'Centro de Salud', code: '493' },
  { id: 'sc-sanroque', name: 'Subcentro de Salud San Roque', type: 'Subcentro', code: '493-01' },
  { id: 'sc-chimbacalle', name: 'Subcentro Chimbacalle', type: 'Subcentro', code: '493-02' },
  { id: 'sc-laecuatorial', name: 'Subcentro La Ecuatorial', type: 'Subcentro', code: '493-03' },
] as const;
