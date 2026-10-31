'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AppLayout({ title, subtitle, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? 'md:pl-16' : 'md:pl-60'
        }`}
      >
        <Topbar title={title} subtitle={subtitle} onMenu={() => setMobileOpen(true)} />
        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
