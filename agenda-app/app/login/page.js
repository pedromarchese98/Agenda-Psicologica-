'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'signup'
  const [forgotSent, setForgotSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setMode('signup');
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email o contraseña incorrectos.');
      return;
    }
    router.push('/agenda');
    router.refresh();
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-clave`,
    });
    setLoading(false);
    if (error) {
      setError('No pudimos enviar el email. Verificá la dirección.');
      return;
    }
    setForgotSent(true);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message.includes('already') ? 'Ya existe una cuenta con ese email.' : 'No pudimos crear la cuenta.');
      return;
    }
    if (data.session) {
      router.push('/agenda');
      router.refresh();
      return;
    }
    setSignupSent(true);
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        background: 'var(--navy)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62,207,178,.16), transparent 70%)', pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: 52, height: 52, borderRadius: 16, background: 'rgba(62,207,178,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
        }}
      >
        <Brain size={26} color="var(--teal)" strokeWidth={2} />
      </div>
      <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginBottom: 28, letterSpacing: '-0.01em' }}>
        Agenda Psicológica
      </h1>

      {mode === 'login' ? (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ width: '100%', maxWidth: 340, borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-md)' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-md)' }}>Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>
          {error && <p style={{ color: 'var(--rose)', fontSize: 13, margin: 0 }}>{error}</p>}
          <button className="btn btn-primary pressable" type="submit" disabled={loading} style={{ marginTop: 6, padding: '12px 16px', borderRadius: 999 }}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('forgot'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-lt)', fontSize: 11.5, cursor: 'pointer', marginTop: 2 }}
          >
            ¿Olvidaste tu contraseña?
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--teal-dk)', fontSize: 11.5, cursor: 'pointer', fontWeight: 700 }}
          >
            ¿No estás registrado? Creá tu cuenta
          </button>
        </form>
      ) : mode === 'signup' ? (
        <form
          onSubmit={handleSignup}
          className="card"
          style={{ width: '100%', maxWidth: 340, borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {signupSent ? (
            <p style={{ fontSize: 13, textAlign: 'center', margin: 0 }}>
              ✅ Te enviamos un email a <strong>{email}</strong> para confirmar tu cuenta. Una vez confirmada, ya podés iniciar sesión.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--text-md)', margin: 0, lineHeight: 1.5 }}>
                Creá tu propia cuenta — vas a tener tu propia agenda, pacientes y precios, completamente separados de los demás.
              </p>
              <input
                type="email" required placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
              />
              <input
                type="password" required placeholder="Contraseña" value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
              />
              <input
                type="password" required placeholder="Repetir contraseña" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
              />
              {error && <p style={{ color: 'var(--rose)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button className="btn btn-primary pressable" type="submit" disabled={loading} style={{ padding: '12px 16px', borderRadius: 999 }}>
                {loading ? 'Creando…' : 'Crear cuenta'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => { setMode('login'); setSignupSent(false); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-lt)', fontSize: 11.5, cursor: 'pointer' }}
          >
            ‹ Volver a iniciar sesión
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleForgot}
          className="card"
          style={{ width: '100%', maxWidth: 340, borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {forgotSent ? (
            <p style={{ fontSize: 13, textAlign: 'center', margin: 0 }}>
              Te enviamos un email a <strong>{email}</strong> con un link para elegir una contraseña nueva.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--text-md)', margin: 0, lineHeight: 1.5 }}>
                Ingresá tu email y te mandamos un link para restablecer tu contraseña.
              </p>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
              />
              {error && <p style={{ color: 'var(--rose)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button className="btn btn-primary pressable" type="submit" disabled={loading} style={{ padding: '12px 16px', borderRadius: 999 }}>
                {loading ? 'Enviando…' : 'Enviar link'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => { setMode('login'); setForgotSent(false); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-lt)', fontSize: 11.5, cursor: 'pointer' }}
          >
            ‹ Volver a iniciar sesión
          </button>
        </form>
      )}
    </div>
  );
}

