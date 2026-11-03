'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, UserPlus, Stethoscope, FlaskConical, Crown } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { signIn, signUp } from '@/lib/supabase/api';

const ACCOUNTS = [
  { role: 'Jefa de laboratorio', email: 'jefatura@labflow.msp.gob.ec', password: 'Lab2026!Jefa', icon: Crown },
  { role: 'Bioquimico / Tecnologo', email: 'tecnologo@labflow.msp.gob.ec', password: 'Lab2026!Tecn', icon: FlaskConical },
  { role: 'Medico solicitante', email: 'medico@labflow.msp.gob.ec', password: 'Lab2026!Medi', icon: Stethoscope },
];

export default function AuthCard() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState('medico');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillAccount = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Ingrese correo y contrasena.');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err.message || 'No se pudo iniciar sesion.');
          setLoading(false);
          return;
        }
      } else {
        const { error: err } = await signUp(
          email,
          password,
          fullName || email.split('@')[0],
          role
        );
        if (err) {
          setError(err.message || 'No se pudo crear la cuenta.');
          setLoading(false);
          return;
        }
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexion con Supabase. Revisa .env.local');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
      <div className="w-full max-w-md fade-in">
        <div className="mb-6 flex items-center gap-2 lg:hidden">
          <AppLogo size={40} />
          <span className="text-xl font-bold text-foreground">LabFlow</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`rounded-md py-2 text-sm font-semibold transition-all ${
                tab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`rounded-md py-2 text-sm font-semibold transition-all ${
                tab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Dra. Tatiana Mejia"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Correo electronico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Contrasena</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Ingresa tu contrasena"
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPass ? 'Ocultar' : 'Mostrar'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {tab === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rol en el laboratorio</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="medico">Medico solicitante</option>
                  <option value="tecnologo">Bioquimico / Tecnologo</option>
                  <option value="toma">Toma de muestras</option>
                  <option value="jefa">Jefa de laboratorio</option>
                </select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            >
              {tab === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Procesando...' : tab === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
            </button>
          </form>

          {tab === 'login' && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Cuentas (tras seed en Supabase)</p>
              <div className="flex flex-wrap gap-2">
                {ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillAccount(a.email, a.password)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="h-3 w-3 text-primary" />
                      <span className="max-w-[140px] truncate">{a.email}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">LabFlow · C.S. El Paraiso · UO 493 · MSP Ecuador</p>
      </div>
    </section>
  );
}
