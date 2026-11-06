'use client';
import { useEffect, useState } from 'react';
import { getDoctorNames } from '@/lib/supabase/reports';

export function useDoctorSuggestions(query: string, enabled: boolean) {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const t = setTimeout(async () => {
      const n = await getDoctorNames(query.trim());
      if (alive) setNames(n);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [query, enabled]);
  return names;
}
