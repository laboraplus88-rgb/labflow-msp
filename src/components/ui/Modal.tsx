'use client';
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function Modal({ open, title, onClose, children, footer, width = 'max-w-lg' }: ModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset position when modal opens
  useEffect(() => {
    if (open) setPosition({ x: 0, y: 0 });
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from the header
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!open) return null;

  return (
    <div
      className="fade-in fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`modal-in w-full ${width} rounded-xl bg-card text-card-foreground shadow-2xl`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        {/* Header arrastrable */}
        <div
          data-drag-handle
          className="flex cursor-move select-none items-center justify-between border-b border-border px-5 py-4"
        >
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
