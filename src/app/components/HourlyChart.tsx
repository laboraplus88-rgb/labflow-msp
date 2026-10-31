'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const DATA = [
  { hour: '06h', hoy: 4, ayer: 6 },
  { hour: '07h', hoy: 21, ayer: 17 },
  { hour: '08h', hoy: 34, ayer: 29 },
  { hour: '09h', hoy: 27, ayer: 31 },
  { hour: '10h', hoy: 19, ayer: 24 },
  { hour: '11h', hoy: 15, ayer: 21 },
  { hour: '12h', hoy: 9, ayer: 12 },
  { hour: '13h', hoy: 7, ayer: 14 },
  { hour: '14h', hoy: 6, ayer: 18 },
];

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={`tip-${p.name}`} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name === 'hoy' ? 'Hoy' : 'Ayer'}: <span className="font-bold tabular text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function HourlyChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DATA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gradHoy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tip />} />
          <Area type="monotone" dataKey="ayer" stroke="var(--muted-foreground)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
          <Area type="monotone" dataKey="hoy" stroke="var(--primary)" fill="url(#gradHoy)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
