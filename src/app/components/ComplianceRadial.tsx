'use client';
import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const DATA = [
  { name: 'Control', value: 99, fill: 'var(--accent)' },
  { name: 'Rutina', value: 95, fill: 'var(--primary)' },
  { name: 'Urgente', value: 86, fill: 'var(--destructive)' },
];

export default function ComplianceRadial() {
  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="35%" outerRadius="100%" data={DATA} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" background={{ fill: 'var(--muted)' }} cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular text-foreground">93.8%</span>
        <span className="text-[11px] text-muted-foreground">global</span>
      </div>
    </div>
  );
}
