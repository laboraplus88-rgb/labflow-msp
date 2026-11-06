'use client';
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// Producción: sin datos demo. Se llenará cuando haya solicitudes reales.
const DATA: { name: string; value: number; fill: string }[] = [];

function Tip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">
        Solicitudes: <span className="font-bold tabular text-foreground">{payload[0].value.toLocaleString('es-EC')}</span>
      </p>
    </div>
  );
}

export default function OrderMixPie() {
  const total = DATA.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-56 w-full">
      {total === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <span className="text-2xl font-bold tabular text-foreground">0</span>
          <span className="text-[11px]">solicitudes</span>
          <span className="mt-1 text-xs">Sin datos aún</span>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<Tip />} />
              <Pie data={DATA} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} stroke="var(--card)" strokeWidth={2}>
                {DATA.map((d) => (
                  <Cell key={`pie-${d.name}`} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular text-foreground">{total.toLocaleString('es-EC')}</span>
            <span className="text-[11px] text-muted-foreground">solicitudes</span>
          </div>
        </>
      )}
    </div>
  );
}
