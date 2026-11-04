'use client';
import { useEffect, useState } from 'react';
import { getMyLaboratory, type MyLab } from '@/lib/supabase/api';

// Cache compartido: el laboratorio del usuario se pide una sola vez por sesión de navegador.
let cache: MyLab | null | undefined;
let inflight: Promise<MyLab | null> | null = null;
const listeners = new Set<() => void>();

export function invalidateMyLaboratory() {
  cache = undefined;
  listeners.forEach((l) => l());
}

/** undefined = cargando · null = el usuario no pertenece a un laboratorio (p. ej. Admin Global) */
export function useMyLaboratory(): MyLab | null | undefined {
  const [lab, setLab] = useState<MyLab | null | undefined>(cache);

  useEffect(() => {
    let alive = true;
    const run = () => {
      const req = inflight ?? (inflight = getMyLaboratory().finally(() => { inflight = null; }));
      req
        .then((l) => { cache = l; if (alive) setLab(l); })
        .catch(() => { if (alive) setLab(null); });
    };
    if (cache === undefined) run();
    listeners.add(run);
    return () => { alive = false; listeners.delete(run); };
  }, []);

  return lab;
}
