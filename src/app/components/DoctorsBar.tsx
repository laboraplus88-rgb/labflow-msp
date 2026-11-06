'use client';
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Producción: sin médicos demo
const DATA: { doctor: string; rutina: number; urgente: number; control: number }[] = [];

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={`dtip-${p.name}`} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}</span>: <span className="font-bold tabular text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DoctorsBar() {
  if (DATA.length === 0) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sin solicitudes este mes</p>
        <p className="text-xs">Los médicos aparecerán cuando haya órdenes registradas</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DATA} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="doctor" width={130} tick={{ fill: 'var(--foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--muted)' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="rutina" stackId="a" fill="var(--primary)" name="rutina" />
          <Bar dataKey="control" stackId="a" fill="var(--accent)" name="control" />
          <Bar dataKey="urgente" stackId="a" fill="var(--destructive)" name="urgente" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
