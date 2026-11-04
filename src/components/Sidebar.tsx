'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList, FlaskConical, BarChart3, LogOut, ChevronsLeft, ChevronsRight,
  X, UserSearch, Building2, Users, LayoutDashboard,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Tooltip from '@/components/ui/Tooltip';
import { getMyRole, signOut } from '@/lib/supabase/api';
import { useMyLaboratory } from '@/lib/useMyLaboratory';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// Qué roles ven cada opción. Sin rol definido = visible para todos los roles de laboratorio.
const ITEM_ROLES: Record<string, string[]> = {
  '/admin-global': ['superadmin'],
  '/admin-lab': ['jefa'],
};

// Menú propio del médico solicitante: sin procesamiento ni estadísticas del laboratorio.
const DOCTOR_NAV = [
  {
    group: 'Médico',
    items: [
      { href: '/doctor', label: 'Mi panel', icon: LayoutDashboard },
      { href: '/exam-request-sample-collection', label: 'Nueva solicitud', icon: ClipboardList },
      { href: '/patient-history', label: 'Mis pacientes', icon: UserSearch },
    ],
  },
];

const NAV = [
  {
    group: 'Operacion',
    items: [
      { href: '/exam-request-sample-collection', label: 'Solicitud y toma', icon: ClipboardList },
      { href: '/test-processing-workflow', label: 'Procesamiento', icon: FlaskConical },
      { href: '/patient-history', label: 'Historial paciente', icon: UserSearch },
    ],
  },
  {
    group: 'Gestion',
    items: [
      { href: '/', label: 'Estadisticas', icon: BarChart3 },
      { href: '/admin-global', label: 'Admin global', icon: Building2 },
      { href: '/admin-lab', label: 'Admin laboratorio', icon: Users },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = collapsed && !mobileOpen;
  const [role, setRole] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const lab = useMyLaboratory();
  const isLabUser = role !== 'superadmin' && !!lab;
  const brandName = isLabUser ? lab!.name : 'LabFlow';
  const brandSub = isLabUser
    ? [lab!.code, lab!.city].filter(Boolean).join(' · ')
    : role === 'superadmin' ? 'Administración global' : 'Laboratorio clínico';
  const initials = brandName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

  useEffect(() => {
    let alive = true;
    getMyRole()
      .then((r) => { if (alive) setRole(r); })
      .catch(() => { if (alive) setRole(null); });
    return () => { alive = false; };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // Navegación completa: limpia el estado del cliente y fuerza al middleware a releer la sesión.
      window.location.assign('/sign-up-login-screen');
    }
  };

  // El superadmin solo gestiona laboratorios: no ve módulos clínicos.
  const visibleNav = (role === 'medico' ? DOCTOR_NAV : NAV).map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (role === 'superadmin') return item.href === '/admin-global';
      const allowed = ITEM_ROLES[item.href];
      return !allowed || (role !== null && allowed.includes(role));
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={onMobileClose}
          aria-label="Cerrar menu"
        />
      )}
      <aside
        className={`z-50 flex h-screen shrink-0 flex-col border-r border-border bg-card transition-all duration-200
          fixed inset-y-0 left-0 md:sticky md:top-0 md:self-start
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-3 sm:h-16">
          {isLabUser ? (
            <div
              aria-hidden="true"
              className={`flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground ${isCollapsed ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'}`}
            >
              {initials}
            </div>
          ) : (
            <AppLogo size={isCollapsed ? 32 : 36} />
          )}
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground" title={brandName}>{brandName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{brandSub}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {visibleNav.map((g) => (
            <div key={g.group}>
              {!isCollapsed && (
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </p>
              )}
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {isCollapsed ? (
                        <Tooltip label={item.label} side="right">{link}</Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onToggle}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-muted-foreground hover:bg-muted md:flex"
          >
            {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!isCollapsed && <span className="text-xs font-medium">Colapsar</span>}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>{signingOut ? 'Saliendo...' : 'Salir'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
