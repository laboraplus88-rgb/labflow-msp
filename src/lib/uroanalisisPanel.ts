/** Plantilla profesional de Examen general de orina (uroanálisis) */

export type UroField = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  ref?: string;
  unit?: string;
};

export type UroSection = {
  id: string;
  title: string;
  fields: UroField[];
};

const QUAL = ['NEGATIVO', 'TRAZAS', '+', '++', '+++', 'POSITIVO'];
const QUAL_SED = ['NEGATIVO', 'ESCASA', '+', '++', '+++', 'ABUNDANTE'];

export const URO_SECTIONS: UroSection[] = [
  {
    id: 'fisico',
    title: 'EXAMEN FÍSICO',
    fields: [
      {
        key: 'color',
        label: 'COLOR',
        type: 'select',
        options: ['AMARILLO', 'AMARILLO CLARO', 'AMARILLO OSCURO', 'ÁMBAR', 'ROJIZO', 'PARDO', 'INCOLORO', 'OTRO'],
      },
      {
        key: 'aspecto',
        label: 'ASPECTO',
        type: 'select',
        options: ['CLARO', 'LIG. TURBIO', 'TURBIO', 'MUY TURBIO'],
      },
    ],
  },
  {
    id: 'quimico',
    title: 'EXAMEN QUÍMICO',
    fields: [
      { key: 'densidad', label: 'DENSIDAD', type: 'number', ref: '1.001 - 1.035', unit: '' },
      { key: 'ph', label: 'PH', type: 'number', ref: '5.00 - 9.00', unit: '' },
      { key: 'leucocitos_q', label: 'LEUCOCITOS', type: 'select', options: QUAL },
      { key: 'nitritos', label: 'NITRITOS', type: 'select', options: QUAL },
      { key: 'proteinas', label: 'PROTEÍNAS', type: 'select', options: QUAL },
      { key: 'glucosa', label: 'GLUCOSA', type: 'select', options: QUAL },
      { key: 'cetonas', label: 'CETONAS', type: 'select', options: QUAL },
      { key: 'urobilinogeno', label: 'UROBILINÓGENO', type: 'select', options: QUAL },
      { key: 'bilirrubina', label: 'BILIRRUBINA', type: 'select', options: QUAL },
      { key: 'sangre', label: 'SANGRE', type: 'select', options: QUAL },
    ],
  },
  {
    id: 'sedimento',
    title: 'SEDIMENTO',
    fields: [
      { key: 'celulas_epiteliales', label: 'CÉLULAS EPITELIALES', type: 'select', options: QUAL_SED },
      { key: 'leucocitos_s', label: 'LEUCOCITOS', type: 'text' }, // ej. 3-4
      { key: 'hematies', label: 'HEMATÍES', type: 'select', options: [...QUAL_SED, '0-2', '3-5', '6-10', '>10'] },
      { key: 'bacterias', label: 'BACTERIAS', type: 'select', options: QUAL_SED },
      { key: 'cristales', label: 'CRISTALES', type: 'select', options: [...QUAL_SED, 'OXALATO', 'URATOS', 'FOSFATOS'] },
      { key: 'filamentos_mucosos', label: 'FILAMENTOS MUCOSOS', type: 'select', options: QUAL_SED },
      { key: 'cilindros', label: 'CILINDROS', type: 'select', options: QUAL_SED },
      { key: 'hongos', label: 'HONGOS', type: 'select', options: QUAL },
      { key: 'levaduras', label: 'LEVADURAS', type: 'select', options: QUAL },
      { key: 'otros', label: 'OTROS', type: 'text' },
    ],
  },
];

export type UroValues = Record<string, string>;

export function emptyUroValues(): UroValues {
  const v: UroValues = {};
  URO_SECTIONS.forEach((s) => s.fields.forEach((f) => { v[f.key] = ''; }));
  return v;
}

/** Detecta si el examen es uroanálisis / EGO */
export function isUroanalisis(examName: string, category?: string): boolean {
  const n = (examName || '').toLowerCase();
  const c = (category || '').toLowerCase();
  return (
    c.includes('uroanal') ||
    n.includes('uroanal') ||
    n.includes('orina') ||
    n.includes('ego') ||
    n.includes('examen general de orina')
  );
}

/** Serializa a texto legible tipo informe */
export function formatUroResult(values: UroValues): string {
  const lines: string[] = ['UROANÁLISIS'];
  for (const section of URO_SECTIONS) {
    lines.push('');
    lines.push(section.title);
    for (const f of section.fields) {
      const val = (values[f.key] || '').trim() || '—';
      const ref = f.ref ? `  (${f.ref})` : '';
      lines.push(`${f.label.padEnd(22, '.')} ${val}${ref}`);
    }
  }
  return lines.join('\n');
}

/** Intenta parsear un resultado ya guardado */
export function parseUroResult(text: string | undefined | null): UroValues {
  const v = emptyUroValues();
  if (!text) return v;
  // Si parece JSON
  try {
    if (text.trim().startsWith('{')) {
      const obj = JSON.parse(text);
      Object.keys(v).forEach((k) => {
        if (obj[k] != null) v[k] = String(obj[k]);
      });
      return v;
    }
  } catch { /* ignore */ }

  // Parseo simple por líneas "LABEL ..... valor"
  const lines = text.split(/\n/);
  const byLabel: Record<string, string> = {};
  URO_SECTIONS.forEach((s) =>
    s.fields.forEach((f) => {
      byLabel[f.label.toUpperCase()] = f.key;
      byLabel[f.label.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()] = f.key;
    })
  );

  for (const line of lines) {
    const m = line.match(/^([A-ZÁÉÍÓÚÑÜ\s]+?)\s*[.\s]{2,}\s*(.+?)(?:\s*\(.*\))?$/i);
    if (!m) continue;
    const label = m[1].trim().toUpperCase();
    const key = byLabel[label];
    if (key) v[key] = m[2].trim();
  }
  return v;
}

/** JSON compacto para guardar junto al texto (opcional en el mismo campo) */
export function uroToStorage(values: UroValues): string {
  // Guardamos texto legible; el parseo funciona al reabrir
  return formatUroResult(values);
}
