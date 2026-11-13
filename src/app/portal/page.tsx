import React from 'react';
import PortalWorkspace from './components/PortalWorkspace';

export default function PortalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-bold text-foreground">LabFlow · Portal del paciente</p>
            <p className="text-xs text-muted-foreground">
              Consulte resultados validados con su cédula y el código de la orden
            </p>
          </div>
          <a
            href="/sign-up-login-screen"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Acceso personal
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PortalWorkspace />
      </main>
    </div>
  );
}
