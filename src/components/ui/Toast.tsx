'use client';
import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  tone?: 'success' | 'warning';
  onClose: () => void;
}

export default function Toast({ message, tone = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isOk = tone === 'success';
  return (
    <div
      role="status"
      className="slide-in-right fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground shadow-xl"
    >
      {isOk ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button type="button" onClick={onClose} aria-label="Cerrar notificación" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
