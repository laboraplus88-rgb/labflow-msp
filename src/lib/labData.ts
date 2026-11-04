// LabFlow shared catalog and types (UTF-8)
// Colores de tapa segun estandar CLSI / practica MSP Ecuador

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

/** Colores estandar de tubos de extraccion (hex imprimibles) */
export const TUBES: Record<
  TubeKey,
  { label: string; note: string; swatch: string; color: string }
> = {
  purple: {
    label: 'Tubo lila (EDTA)',
    note: 'Sangre total',
    swatch: 'bg-[#7c3aed]',
    color: '#7c3aed',
  },
  blue: {
    label: 'Tubo celeste (citrato)',
    note: 'Plasma citratado',
    swatch: 'bg-[#38bdf8]',
    color: '#38bdf8',
  },
  yellow: {
    label: 'Tubo amarillo (suero/gel)',
    note: 'Suero',
    swatch: 'bg-[#facc15]',
    color: '#facc15',
  },
  green: {
    label: 'Tubo verde (heparina)',
    note: 'Plasma heparina',
    swatch: 'bg-[#22c55e]',
    color: '#22c55e',
  },
  gray: {
    label: 'Tubo gris (fluoruro)',
    note: 'Glucosa',
    swatch: 'bg-[#9ca3af]',
    color: '#9ca3af',
  },
  urine: {
    label: 'Frasco de orina',
    note: 'Orina',
    swatch: 'bg-[#fde68a]',
    color: '#fde68a',
  },
  stool: {
    label: 'Frasco de heces',
    note: 'Heces',
    swatch: 'bg-[#a16207]',
    color: '#a16207',
  },
  other: {
    label: 'Recipiente especial',
    note: 'Especial',
    swatch: 'bg-[#cbd5e1]',
    color: '#cbd5e1',
  },
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
  { id: 'h-06', name: 'Grupo sanguineo', category: 'Hematologia', range: 'A, B, AB, O / Rh', unit: '-', tube: 'purple' },
  { id: 'h-07', name: 'Reticulocitos', category: 'Hematologia', range: '0.5-2.5', unit: '%', tube: 'purple' },
  { id: 'h-08', name: 'Indices hematicos (VCM, HCM, CHCM)', category: 'Hematologia', range: 'VCM 80-100', unit: 'fL', tube: 'purple' },
  { id: 'h-09', name: 'Tiempo de protrombina (TP)', category: 'Hematologia', range: '11-13.5', unit: 's', tube: 'blue' },
  { id: 'h-10', name: 'T. tromboplastina parcial (TTP)', category: 'Hematologia', range: '25-35', unit: 's', tube: 'blue' },
  { id: 'h-11', name: 'Tiempo de coagulacion', category: 'Hematologia', range: '5-10', unit: 'min', tube: 'blue' },
  { id: 'h-12', name: 'Tiempo de sangria', category: 'Hematologia', range: '1-6', unit: 'min', tube: 'other' },
  { id: 'h-13', name: 'Hematozoario', category: 'Hematologia', range: 'Negativo', unit: '-', tube: 'purple' },
  { id: 'h-14', name: 'Celula L.E.', category: 'Hematologia', range: 'Negativo', unit: '-', tube: 'yellow' },
  { id: 'h-15', name: 'Drepanocitos', category: 'Hematologia', range: 'Negativo', unit: '-', tube: 'purple' },
  { id: 'h-16', name: 'Coombs directo', category: 'Hematologia', range: 'Negativo', unit: '-', tube: 'purple' },
  { id: 'h-17', name: 'Coombs indirecto', category: 'Hematologia', range: 'Negativo', unit: '-', tube: 'yellow' },
  { id: 'h-18', name: 'Velocidad de sedimentacion (VSG)', category: 'Hematologia', range: '0-20', unit: 'mm/h', tube: 'purple' },
  { id: 'h-19', name: 'Frotis de sangre periferica', category: 'Hematologia', range: 'Ver informe', unit: '-', tube: 'purple' },
  { id: 'u-01', name: 'Examen general de orina', category: 'Uroanalisis', range: 'Ver informe', unit: '-', tube: 'urine' },
  { id: 'u-02', name: 'Microscopia de orina', category: 'Uroanalisis', range: 'Ver informe', unit: '-', tube: 'urine' },
  { id: 'u-03', name: 'Proteinuria 24 h', category: 'Uroanalisis', range: '< 150', unit: 'mg/24h', tube: 'urine' },
  { id: 'u-04', name: 'Depuracion de creatinina', category: 'Uroanalisis', range: '90-120', unit: 'mL/min', tube: 'urine' },
  { id: 'u-05', name: 'Gravidez en orina (hCG)', category: 'Uroanalisis', range: 'Negativo', unit: '-', tube: 'urine' },
  { id: 'c-01', name: 'Coproparasitario', category: 'Coprologico', range: 'Negativo', unit: '-', tube: 'stool' },
  { id: 'c-02', name: 'Coprologico funcional', category: 'Coprologico', range: 'Ver informe', unit: '-', tube: 'stool' },
  { id: 'c-03', name: 'Sangre oculta en heces', category: 'Coprologico', range: 'Negativo', unit: '-', tube: 'stool' },
  { id: 'c-04', name: 'Rotavirus / Adenovirus', category: 'Coprologico', range: 'Negativo', unit: '-', tube: 'stool' },
  { id: 'q-01', name: 'Glucosa en ayunas', category: 'Quimica sanguinea', range: '70-100', unit: 'mg/dL', tube: 'gray' },
  { id: 'q-02', name: 'Glucosa postprandial', category: 'Quimica sanguinea', range: '< 140', unit: 'mg/dL', tube: 'gray' },
  { id: 'q-03', name: 'Urea', category: 'Quimica sanguinea', range: '15-45', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-04', name: 'Creatinina', category: 'Quimica sanguinea', range: '0.6-1.2', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-05', name: 'Acido urico', category: 'Quimica sanguinea', range: '3.5-7.2', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-06', name: 'Albumina', category: 'Quimica sanguinea', range: '3.5-5.0', unit: 'g/dL', tube: 'yellow' },
  { id: 'q-07', name: 'Proteinas totales', category: 'Quimica sanguinea', range: '6.0-8.3', unit: 'g/dL', tube: 'yellow' },
  { id: 'q-08', name: 'Bilirrubina total', category: 'Quimica sanguinea', range: '0.1-1.2', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-09', name: 'Bilirrubina directa', category: 'Quimica sanguinea', range: '0.0-0.3', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-10', name: 'TGO (AST)', category: 'Quimica sanguinea', range: '10-40', unit: 'U/L', tube: 'yellow' },
  { id: 'q-11', name: 'TGP (ALT)', category: 'Quimica sanguinea', range: '7-56', unit: 'U/L', tube: 'yellow' },
  { id: 'q-12', name: 'Fosfatasa alcalina', category: 'Quimica sanguinea', range: '40-129', unit: 'U/L', tube: 'yellow' },
  { id: 'q-13', name: 'GGT', category: 'Quimica sanguinea', range: '9-48', unit: 'U/L', tube: 'yellow' },
  { id: 'q-14', name: 'Amilasa', category: 'Quimica sanguinea', range: '30-110', unit: 'U/L', tube: 'yellow' },
  { id: 'q-15', name: 'Colesterol total', category: 'Quimica sanguinea', range: '< 200', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-16', name: 'HDL colesterol', category: 'Quimica sanguinea', range: '> 40', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-17', name: 'LDL colesterol', category: 'Quimica sanguinea', range: '< 100', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-18', name: 'Trigliceridos', category: 'Quimica sanguinea', range: '< 150', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-19', name: 'Hierro serico', category: 'Quimica sanguinea', range: '60-170', unit: 'ug/dL', tube: 'yellow' },
  { id: 'q-20', name: 'Calcio', category: 'Quimica sanguinea', range: '8.5-10.5', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-21', name: 'Fosforo', category: 'Quimica sanguinea', range: '2.5-4.5', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-22', name: 'Magnesio', category: 'Quimica sanguinea', range: '1.7-2.2', unit: 'mg/dL', tube: 'yellow' },
  { id: 'q-23', name: 'Sodio', category: 'Quimica sanguinea', range: '135-145', unit: 'mEq/L', tube: 'green' },
  { id: 'q-24', name: 'Potasio', category: 'Quimica sanguinea', range: '3.5-5.1', unit: 'mEq/L', tube: 'green' },
  { id: 'q-25', name: 'Cloro', category: 'Quimica sanguinea', range: '98-107', unit: 'mEq/L', tube: 'green' },
  { id: 's-01', name: 'VDRL', category: 'Serologia', range: 'No reactivo', unit: '-', tube: 'yellow' },
  { id: 's-02', name: 'HIV 1/2', category: 'Serologia', range: 'No reactivo', unit: '-', tube: 'yellow' },
  { id: 's-03', name: 'HBsAg', category: 'Serologia', range: 'No reactivo', unit: '-', tube: 'yellow' },
  { id: 's-04', name: 'Anti-HBc', category: 'Serologia', range: 'No reactivo', unit: '-', tube: 'yellow' },
  { id: 's-05', name: 'Anti-HCV', category: 'Serologia', range: 'No reactivo', unit: '-', tube: 'yellow' },
  { id: 's-06', name: 'ASO', category: 'Serologia', range: '< 200', unit: 'UI/mL', tube: 'yellow' },
  { id: 's-07', name: 'PCR cuantitativa', category: 'Serologia', range: '< 5', unit: 'mg/L', tube: 'yellow' },
  { id: 's-08', name: 'Factor reumatoide', category: 'Serologia', range: '< 14', unit: 'UI/mL', tube: 'yellow' },
  { id: 's-09', name: 'Toxoplasma IgG / IgM', category: 'Serologia', range: 'Ver informe', unit: '-', tube: 'yellow' },
  { id: 'b-01', name: 'Cultivo de orina', category: 'Bacteriologia', range: 'Sin crecimiento', unit: '-', tube: 'urine' },
  { id: 'b-02', name: 'Cultivo de heces', category: 'Bacteriologia', range: 'Sin patogenos', unit: '-', tube: 'stool' },
  { id: 'b-03', name: 'Gram', category: 'Bacteriologia', range: 'Ver informe', unit: '-', tube: 'other' },
  { id: 'b-04', name: 'Cultivo de secrecion', category: 'Bacteriologia', range: 'Ver informe', unit: '-', tube: 'other' },
  { id: 'b-05', name: 'Hemocultivo', category: 'Bacteriologia', range: 'Sin crecimiento', unit: '-', tube: 'other' },
  { id: 'o-01', name: 'TSH', category: 'Otros', range: '0.4-4.0', unit: 'mUI/L', tube: 'yellow' },
  { id: 'o-02', name: 'T4 libre', category: 'Otros', range: '0.8-1.8', unit: 'ng/dL', tube: 'yellow' },
  { id: 'o-03', name: 'T3 total', category: 'Otros', range: '80-200', unit: 'ng/dL', tube: 'yellow' },
  { id: 'o-04', name: 'HbA1c', category: 'Otros', range: '< 5.7', unit: '%', tube: 'purple' },
  { id: 'o-05', name: 'PSA total', category: 'Otros', range: '< 4.0', unit: 'ng/mL', tube: 'yellow' },
  { id: 'o-06', name: 'Ferritina', category: 'Otros', range: '15-150', unit: 'ng/mL', tube: 'yellow' },
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

export const FACILITIES = [
  { id: 'cs-paraiso', name: 'C.S. El Paraiso', type: 'Centro de Salud', code: '493' },
  { id: 'sc-sanroque', name: 'Subcentro de Salud San Roque', type: 'Subcentro', code: '493-01' },
  { id: 'sc-chimbacalle', name: 'Subcentro Chimbacalle', type: 'Subcentro', code: '493-02' },
  { id: 'sc-laecuatorial', name: 'Subcentro La Ecuatorial', type: 'Subcentro', code: '493-03' },
] as const;

export const RECENT_REQUESTS: {
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
}[] = [];

export const WORKFLOW_TESTS: unknown[] = [];
export const PATIENTS: unknown[] = [];
