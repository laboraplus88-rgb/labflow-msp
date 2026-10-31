'use client';
import React from 'react';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: 'right' | 'top';
}

export default function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const pos =
    side === 'right'
      ? 'left-full top-1/2 ml-2 -translate-y-1/2'
      : 'bottom-full left-1/2 mb-1.5 -translate-x-1/2';
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 ${pos}`}
      >
        {label}
      </span>
    </span>
  );
}
