'use client';
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const WEEK = [
  { label: 'Lun 26', total: 148 },
  { label: 'Mar 27', total: 133 },
  { label: 'Mié 28', total: 96 },
  { label: 'Jue 29', total: 128 },
  { label: 'Vie 30', total: 142 },
  { label: 'Sáb 31', total: 40 },
];

const MONTH = [
  { label: 'Sem 1', total: 702 },
  { label: 'Sem 2', total: 731 },
  { label: 'Sem 3', total: 644 },
  { label: 'Sem 4', total: 698 },
  { label: 'Sem 5*', total: 139 },
];

function Tip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Muestras: <span className="font-bold tabular text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
}

export default function PeriodChart({ mode }: { mode: 'week' | 'month' }) {
  const data = mode === 'week' ? WEEK : MONTH;
  const min = Math.min(...data.map((d) => d.total));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={`cell-${mode}-${d.label}`} fill={d.total === min ? 'var(--warning)' : 'var(--primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
