'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, UserPlus, Stethoscope, FlaskConical, Crown } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

const DEMO_ACCOUNTS = [
  { role: 'Jefa de laboratorio', email: 'jefatura@labflow.msp.gob.ec', password: 'Lab2026!Jefa', icon: Crown },
  { role: 'Bioquimico / Tecnologo', email: 'tecnologo@labflow.msp.gob.ec', password: 'Lab2026!Tecn', icon: FlaskConical },
  { role: 'Medico solicitante', email: 'medico@labflow.msp.gob.ec', password: 'Lab2026!Medi', icon: Stethoscope },
];

export default function AuthCard() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState('Medico / Tecnologo / Jefa de laboratorio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Ingrese correo y contrasena.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    router.push('/');
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nombre</label>
                  <input type="text" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" placeholder="Nombre" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Apellido</label>
                  <input type="text" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" placeholder="Apellido" />
                </div>
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

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rol en el laboratorio</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option>Medico / Tecnologo / Jefa de laboratorio</option>
                <option>Jefa de laboratorio</option>
                <option>Bioquimico / Tecnologo</option>
                <option>Toma de muestras</option>
                <option>Medico solicitante</option>
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            >
              {tab === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Ingresando...' : tab === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
            </button>
          </form>

          {tab === 'login' && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Cuenta de demostracion</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillDemo(a.email, a.password)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="h-3 w-3 text-primary" />
                      <span className="max-w-[130px] truncate">{a.email}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Usa estas cuentas para explorar LabFlow sin riesgos.</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          C.S. El Paraiso · UO 493 · MSP Ecuador
        </p>
      </div>
    </section>
  );
}
