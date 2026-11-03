'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList, FlaskConical, BarChart3, LogOut, ChevronsLeft, ChevronsRight,
  X, UserSearch, Building2, Users,
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
    group: 'Operacion',
    items: [
      { href: '/exam-request-sample-collection', label: 'Solicitud y toma', icon: ClipboardList, badge: '' },
      { href: '/test-processing-workflow', label: 'Procesamiento', icon: FlaskConical, badge: '' },
      { href: '/patient-history', label: 'Historial paciente', icon: UserSearch, badge: '' },
    ],
  },
  {
    group: 'Gestion',
    items: [
      { href: '/', label: 'Estadisticas', icon: BarChart3, badge: '' },
      { href: '/admin-global', label: 'Admin global', icon: Building2, badge: '' },
      { href: '/admin-lab', label: 'Admin laboratorio', icon: Users, badge: '' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-foreground/40 md:hidden" onClick={onMobileClose} aria-label="Cerrar menu" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200 md:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-3 sm:h-16">
          <AppLogo size={isCollapsed ? 32 : 36} />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">LabFlow</p>
              <p className="truncate text-[10px] text-muted-foreground">MSP Ecuador</p>
            </div>
          )}
          <button type="button" onClick={onMobileClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV.map((g) => (
            <div key={g.group}>
              {!isCollapsed && (
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.group}</p>
              )}
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  const link = (
                    <Link href={item.href} onClick={onMobileClose}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </Link>
                  );
                  return <li key={item.href}>{isCollapsed ? <Tooltip label={item.label} side="right">{link}</Tooltip> : link}</li>;
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button type="button" onClick={onToggle}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-muted-foreground hover:bg-muted md:flex">
            {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!isCollapsed && <span className="text-xs font-medium">Colapsar</span>}
          </button>
          <Link href="/sign-up-login-screen"
            className="mt-1 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-destructive">
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Salir</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
