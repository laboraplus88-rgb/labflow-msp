export type FlagKind = 'high' | 'low' | 'abnormal' | null;

function num(s: string): number | null {
  const m = s.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Interpreta el indicador guardado por el laboratorio; si no hay, lo calcula con el valor de referencia. */
export function evalFlag(result: string | null, range: string | null, flag: string | null): FlagKind {
  const f = (flag ?? '').trim().toLowerCase();
  if (f) {
    if (['n', 'normal', 'ok', '-', '—'].includes(f)) return null;
    if (/(alto|high|^h$|↑)/.test(f)) return 'high';
    if (/(bajo|low|^l$|↓)/.test(f)) return 'low';
    return 'abnormal';
  }
  if (!result || !range) return null;
  const v = num(result);
  if (v === null || !/^\s*-?\d/.test(result.replace(',', '.'))) return null;
  const r = range.replace(/,/g, '.').trim();
  const between = r.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (between) {
    const a = parseFloat(between[1]); const b = parseFloat(between[2]);
    if (v < a) return 'low';
    if (v > b) return 'high';
    return null;
  }
  const lt = r.match(/^<\s*=?\s*(-?\d+(?:\.\d+)?)/);
  if (lt) return v > parseFloat(lt[1]) ? 'high' : null;
  const gt = r.match(/^>\s*=?\s*(-?\d+(?:\.\d+)?)/);
  if (gt) return v < parseFloat(gt[1]) ? 'low' : null;
  return null;
}

export const FLAG_LABEL: Record<Exclude<FlagKind, null>, string> = {
  high: 'ALTO ▲',
  low: 'BAJO ▼',
  abnormal: 'ALTERADO',
};
