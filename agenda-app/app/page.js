'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ActualizarClavePage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError('No pudimos actualizar la contraseña. Probá abrir el link del email de nuevo.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/agenda'), 1500);
  }

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: 24, background: 'var(--navy)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
      <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Nueva contraseña</h1>
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ width: '100%', maxWidth: 340, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {done ? (
          <p style={{ fontSize: 14, textAlign: 'center', margin: 0 }}>
            ✅ Contraseña actualizada. Entrando…
          </p>
        ) : (
          <>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-md)' }}>Nueva contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-md)' }}>Repetir contraseña</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
              />
            </div>
            {error && <p style={{ color: 'var(--rose)', fontSize: 13, margin: 0 }}>{error}</p>}
            <button className="btn btn-primary pressable" type="submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
