import React from 'react';
import BrandPanel from './components/BrandPanel';
import AuthCard from './components/AuthCard';

export default function SignUpLoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr] 2xl:grid-cols-[1.2fr_1fr]">
      <BrandPanel />
      <AuthCard />
    </div>
  );
}
