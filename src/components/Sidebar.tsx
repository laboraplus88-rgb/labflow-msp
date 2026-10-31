'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  FlaskConical,
  BarChart3,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Siren,
  X,
  UserSearch,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Tooltip from '@/components/ui/Tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV = [
  {
    group: 'Operación',
    items: [
      { href: '/exam-request-sample-collection', label: 'Solicitud y toma', icon: ClipboardList, badge: '3' },
      { href: '/test-processing-workflow', label: 'Procesamiento', icon: FlaskConical, badge: '8' },
      { href: '/patient-history', label: 'Historial paciente', icon: UserSearch, badge: '' },
    ],
  },
  {
    group: 'Gestión',
    items: [{ href: '/', label: 'Estadísticas', icon: BarChart3, badge: '' }],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 items-center border-b border-border ${isCollapsed ? 'justify-center' : 'gap-2 px-4'}`}>
        <AppLogo size={36} />
        {!isCollapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-foreground">LabFlow</span>
            <span className="text-[11px] font-medium text-muted-foreground">C.S. El Paraíso · UO 493</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4">
        {NAV.map((section) => (
          <div key={`group-${section.group}`}>
            {!isCollapsed && (
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.group}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={`group flex items-center rounded-lg py-2 text-sm font-semibold transition-all duration-150 ${
                      isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
                    } ${
                      active
                        ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!isCollapsed && item.badge && (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground tabular">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
                return (
                  <li key={`nav-${item.href}-${item.label}`}>
                    {isCollapsed ? (
                      <Tooltip label={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!isCollapsed && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-destructive">
              <Siren className="h-4 w-4" />
              <span className="text-xs font-bold">2 plazos vencidos</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">TP y TTP urgentes de Macías Zambrano superan 60 min.</p>
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-1'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            TM
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">Dra. Tatiana Mejía</p>
              <p className="truncate text-xs text-muted-foreground">Jefa de laboratorio</p>
            </div>
          )}
          {!isCollapsed && (
            <Tooltip label="Cerrar sesión">
              <Link
                href="/sign-up-login-screen"
                aria-label="Cerrar sesión"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </Tooltip>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
        >
          {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!isCollapsed && 'Contraer menú'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card transition-all duration-300 ease-in-out md:block ${
          collapsed ? 'md:w-16' : 'md:w-60'
        } max-lg:w-16`}
      >
        <div className="hidden lg:block h-full">{content(collapsed)}</div>
        <div className="block h-full lg:hidden">{content(true)}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fade-in absolute inset-0 bg-foreground/50" onClick={onMobileClose} />
          <div className="slide-in-right absolute inset-y-0 left-0 w-64 bg-card shadow-2xl">
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Cerrar menú"
              className="absolute right-2 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            {content(false)}
          </div>
        </div>
      )}
    </>
  );
}
