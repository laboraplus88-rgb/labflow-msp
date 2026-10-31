'use client';
import React, { useEffect, useState } from 'react';
import { Menu, Search, Bell, Clock3 } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle: string;
  onMenu: () => void;
}

export default function Topbar({ title, subtitle, onMenu }: TopbarProps) {
  const [now, setNow] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      setNow(`${hh}:${mm}`);
    };
    fmt();
    const t = setInterval(fmt, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Abrir menú"
          className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg md:text-xl">{title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Buscar"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          <label className="relative hidden lg:block">
            <span className="sr-only">Buscar paciente, cédula o muestra</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Paciente, cédula o N.º de muestra…"
              className="w-56 rounded-lg border border-input bg-background py-2 pl-9 pr-12 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 xl:w-72"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              ⌘K
            </kbd>
          </label>

          <div className="hidden items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground sm:flex">
            <Clock3 className="h-3.5 w-3.5 text-primary" />
            <span className="tabular">{now || '--:--'}</span>
            <span className="hidden text-muted-foreground md:inline">· Turno matutino</span>
          </div>

          <button
            type="button"
            aria-label="Alertas de plazos"
            className="relative rounded-lg p-2 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground tabular">
              5
            </span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border px-3 py-2 lg:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              autoFocus
              placeholder="Paciente, cédula o N.º de muestra…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
        </div>
      )}
    </header>
  );
}
