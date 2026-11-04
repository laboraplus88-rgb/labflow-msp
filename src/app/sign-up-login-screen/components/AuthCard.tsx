'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, UserPlus, Stethoscope, FlaskConical, Crown } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { signIn, signUp } from '@/lib/supabase/api';

const ACCOUNTS = [
  { role: 'Jefa de laboratorio', email: 'jefatura@labflow.msp.gob.ec', icon: Crown },
  { role: 'Bioquimico / Tecnologo', email: 'tecnologo@labflow.msp.gob.ec', icon: FlaskConical },
  { role: 'Medico solicitante', email: 'medico@labflow.msp.gob.ec', icon: Stethoscope },
];

export default function AuthCard() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillAccount = (e: string) => {
    setEmail(e);
    setPassword('');
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
          const msg = err.message || 'No se pudo iniciar sesion.';
          if (/invalid login credentials/i.test(msg)) {
            setError(
              'Credenciales invalidas. Cree el usuario en Supabase Auth (Authentication → Users) y luego ejecute seed_roles.sql. Las chips solo rellenan el formulario.'
            );
          } else {
            setError(msg);
          }
          setLoading(false);
          return;
        }
      } else {
        // Alta publica: solo medico. Jefa / tecnologo / toma los asigna admin global o jefa.
        const { error: err } = await signUp(
          email,
          password,
          fullName || email.split('@')[0],
          'medico'
        );
        if (err) {
          setError(err.message || 'No se pudo crear la cuenta.');
          setLoading(false);
          return;
        }
        setError('');
        setTab('login');
        setError(
          'Cuenta de medico creada. Si Supabase pide confirmar email, reviselo. Jefa y personal de lab los crea el admin.'
        );
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexion con Supabase. Revise variables de entorno en Vercel.');
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
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`rounded-md py-2 text-sm font-semibold transition-all ${
                tab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setError('');
              }}
              className={`rounded-md py-2 text-sm font-semibold transition-all ${
                tab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nombre completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder="Dr. Nombre Apellido"
                  />
                </div>
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  El registro publico solo crea <strong className="text-foreground">medico solicitante</strong>.
                  Jefa, tecnologo y toma de muestras los asigna el <strong className="text-foreground">admin global</strong> o la jefa del laboratorio (panel Admin).
                </p>
              </>
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            >
              {tab === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Procesando...' : tab === 'login' ? 'Iniciar sesion' : 'Crear cuenta de medico'}
            </button>
          </form>

          {tab === 'login' && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Cuentas demo (rellenan el formulario; deben existir en Supabase Auth)
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillAccount(a.email)}
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

        <p className="mt-4 text-center text-xs text-muted-foreground">LabFlow · Sistema de gestión de laboratorio clínico</p>
      </div>
    </section>
  );
}
