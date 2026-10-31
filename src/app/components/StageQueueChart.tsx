'use client';
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';

const DATA = [
  { stage: 'Solicitado', n: 19 },
  { stage: 'Recolectada', n: 38 },
  { stage: 'Recibida', n: 52 },
  { stage: 'En proceso', n: 31 },
  { stage: 'Resultado', n: 27 },
  { stage: 'Validado', n: 16 },
];

function Tip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">En cola: <span className="font-bold tabular text-foreground">{payload[0].value}</span></p>
    </div>
  );
}

export default function StageQueueChart() {
  const max = Math.max(...DATA.map((d) => d.n));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DATA} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="n" radius={[6, 6, 0, 0]}>
            {DATA.map((d) => (
              <Cell key={`sq-${d.stage}`} fill={d.n === max ? 'var(--destructive)' : 'var(--primary)'} />
            ))}
            <LabelList dataKey="n" position="top" fill="var(--foreground)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
