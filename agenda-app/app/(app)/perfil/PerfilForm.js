'use client';

import { useState, useRef, useTransition } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateSettings } from './actions';
import ThemeToggle from './ThemeToggle';
import ScheduleForm from './ScheduleForm';

export default function PerfilForm({ email, avatarUrl: initialAvatarUrl, settings }) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  const [pwSent, setPwSent] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [virtual, setVirtual] = useState(settings?.price_virtual || 0);
  const [presencial, setPresencial] = useState(settings?.price_presencial || 0);
  const [priceMsg, setPriceMsg] = useState('');

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setPhotoLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      setPhotoLoading(false);
      setPhotoError('No pudimos subir la foto. Probá de nuevo.');
      return;
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updErr } = await supabase.auth.updateUser({ data: { avatar_url: pub.publicUrl } });
    setPhotoLoading(false);
    if (updErr) {
      setPhotoError('No pudimos guardar la foto. Probá de nuevo.');
      return;
    }
    setAvatarUrl(pub.publicUrl);
  }

  async function handleRemovePhoto() {
    setPhotoLoading(true);
    await supabase.auth.updateUser({ data: { avatar_url: null } });
    setPhotoLoading(false);
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    setPwLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-clave`,
    });
    setPwLoading(false);
    if (error) {
      setPwError('No pudimos enviar el correo. Intentá de nuevo.');
      return;
    }
    setPwSent(true);
  }

  async function handleResend() {
    setResendMsg('');
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-clave`,
    });
    setResendMsg('Correo reenviado ✓');
    setTimeout(() => setResendMsg(''), 2500);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pressable"
            aria-label="Cambiar foto de perfil"
            style={{ position: 'relative', flex: 'none', width: 60, height: 60, padding: 0, border: 'none', background: 'none', borderRadius: '50%', cursor: 'pointer' }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: avatarUrl ? 'var(--muted)' : 'var(--teal)', color: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 21,
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
              {!avatarUrl && (email?.[0] || '?').toUpperCase()}
            </div>
            <span style={{
              position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%',
              background: 'var(--navy)', color: 'var(--teal)', border: '2px solid var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera size={12} />
            </span>
          </button>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, wordBreak: 'break-all' }}>{email}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-lt)', marginTop: 2 }}>Psicólogo/a</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="pressable" disabled={photoLoading}
                style={{ border: 'none', background: 'none', padding: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer' }}>
                {photoLoading ? 'Subiendo…' : avatarUrl ? 'Cambiar foto' : 'Agregar foto'}
              </button>
              {avatarUrl && (
                <button type="button" onClick={handleRemovePhoto} className="pressable" disabled={photoLoading}
                  style={{ border: 'none', background: 'none', padding: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--text-lt)', cursor: 'pointer' }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        {photoError && <p style={{ color: 'var(--rose)', fontSize: 11.5, margin: '8px 0 0' }}>{photoError}</p>}
        <p style={{ fontSize: 10.5, color: 'var(--text-lt)', margin: '10px 0 0' }}>JPG o PNG. Se muestra en el avatar de la barra superior.</p>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Cambiar contraseña
        </div>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Nueva contraseña" required minLength={6}
            style={{ padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
          <input type="password" placeholder="Repetir contraseña" required minLength={6}
            style={{ padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
          {pwError && <p style={{ color: 'var(--rose)', fontSize: 12, margin: 0 }}>{pwError}</p>}
          <button className="btn btn-primary pressable" type="submit" disabled={pwLoading || pwSent}>
            {pwLoading ? 'Enviando…' : pwSent ? 'Correo de confirmación enviado' : 'Actualizar contraseña'}
          </button>
          {!pwSent ? (
            <p style={{ fontSize: 10.5, color: 'var(--text-lt)', margin: 0 }}>
              Te vamos a enviar un correo para confirmar el cambio. La contraseña nueva se activa recién cuando lo confirmes.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--teal-tint)', border: '1px solid #9FE0CE', borderRadius: 12, padding: '11px 12px', color: 'var(--navy)' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800 }}>Revisá tu correo</div>
                <div style={{ fontSize: 11, color: 'var(--text-md)', marginTop: 2, lineHeight: 1.45 }}>
                  Enviamos un enlace a <strong>{email}</strong>. Hasta que lo confirmes, seguís entrando con tu contraseña actual. El enlace vence en 24 h.
                </div>
                <button type="button" onClick={handleResend} className="pressable" style={{ border: 'none', background: 'none', padding: 0, marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer' }}>
                  {resendMsg || 'Reenviar correo'}
                </button>
              </div>
            </div>
          )}
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
