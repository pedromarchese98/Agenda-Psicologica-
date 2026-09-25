'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateSettings } from './actions';
import ThemeToggle from './ThemeToggle';
import ScheduleForm from './ScheduleForm';

export default function PerfilForm({ email, settings }) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [virtual, setVirtual] = useState(settings?.price_virtual || 0);
  const [presencial, setPresencial] = useState(settings?.price_presencial || 0);
  const [priceMsg, setPriceMsg] = useState('');

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    if (newPassword.length < 6) {
      setPwError('Mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden.');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwError('No se pudo actualizar. Intentá de nuevo.');
      return;
    }
    setPwMsg('✅ Contraseña actualizada.');
    setNewPassword('');
    setConfirmPassword('');
  }

  function handleSavePrices() {
    startTransition(async () => {
      await updateSettings(parseFloat(virtual) || 0, parseFloat(presencial) || 0);
      setPriceMsg('✅ Precios guardados.');
      setTimeout(() => setPriceMsg(''), 2500);
    });
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Cuenta
        </div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{email}</div>
        <div style={{ fontSize: 12, color: 'var(--text-lt)', marginTop: 2 }}>Psicólogo/a</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Cambiar contraseña
        </div>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: 11, borderRadius: 10, border: '1px solid var(--border)' }}
          />
          <input
            type="password"
            placeholder="Repetir contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ padding: 11, borderRadius: 10, border: '1px solid var(--border)' }}
          />
          {pwError && <p style={{ color: 'var(--rose)', fontSize: 12, margin: 0 }}>{pwError}</p>}
          {pwMsg && <p style={{ color: 'var(--sage)', fontSize: 12, margin: 0 }}>{pwMsg}</p>}
          <button className="btn btn-primary pressable" type="submit" disabled={pwLoading}>
            {pwLoading ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Precios de sesión (por defecto)
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>💻 Virtual</label>
            <input
              type="number"
              value={virtual}
              onChange={(e) => setVirtual(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>🏠 Presencial</label>
            <input
              type="number"
              value={presencial}
              onChange={(e) => setPresencial(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          </div>
        </div>
        {priceMsg && <p style={{ color: 'var(--sage)', fontSize: 12, margin: '0 0 8px' }}>{priceMsg}</p>}
        <button className="btn btn-primary pressable" style={{ width: '100%' }} onClick={handleSavePrices} disabled={isPending}>
          Guardar precios
        </button>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Apariencia
        </div>
        <ThemeToggle />
        <p style={{ fontSize: 11.5, color: 'var(--text-lt)', margin: '8px 0 0' }}>
          "Automático" sigue el modo claro/oscuro de tu celular o navegador.
        </p>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 4 }}>
          Días y horario de atención
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-lt)', margin: '0 0 12px' }}>
          Esto define qué horarios aparecen bloqueados en tu agenda. Los turnos que ya tenés agendados no se ven afectados.
        </p>
        <ScheduleForm settings={settings} />
      </div>
    </div>
  );
}
