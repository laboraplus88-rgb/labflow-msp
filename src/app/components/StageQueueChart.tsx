'use client';
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';

// Producción: cola en cero
const DATA = [
  { stage: 'Solicitado', n: 0 },
  { stage: 'Recolectada', n: 0 },
  { stage: 'Recibida', n: 0 },
  { stage: 'En proceso', n: 0 },
  { stage: 'Resultado', n: 0 },
  { stage: 'Validado', n: 0 },
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
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DATA} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 5]} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="n" radius={[6, 6, 0, 0]} fill="var(--primary)">
            {DATA.map((d) => (
              <Cell key={`sq-${d.stage}`} fill="var(--primary)" />
            ))}
            <LabelList dataKey="n" position="top" fill="var(--foreground)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
