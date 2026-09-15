'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
      <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 28 }}>
        Agenda Psicológica
      </h1>
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ width: '100%', maxWidth: 340, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
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
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
