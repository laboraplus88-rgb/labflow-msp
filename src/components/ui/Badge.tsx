import React from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'lilac';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-foreground',
  danger: 'bg-destructive/15 text-destructive',
  info: 'bg-primary/10 text-primary',
  lilac: 'bg-lilac text-lilac-foreground',
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export default function Badge({ tone = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function priorityTone(p: string): Tone {
  if (p === 'Urgente') return 'danger';
  if (p === 'Rutina') return 'info';
  return 'neutral';
}

export function orderTone(o: string): Tone {
  if (o === 'Emergencia') return 'danger';
  if (o === 'Consulta externa') return 'lilac';
  return 'neutral';
}

export function stageTone(s: string): Tone {
  if (s === 'Solicitado') return 'neutral';
  if (s === 'Muestra recolectada' || s === 'Recibida en laboratorio') return 'info';
  if (s === 'En proceso') return 'warning';
  if (s === 'Resultado ingresado') return 'lilac';
  return 'success';
}
