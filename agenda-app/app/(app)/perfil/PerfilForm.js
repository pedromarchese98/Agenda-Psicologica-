'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mail, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from './ThemeToggle';
import ScheduleForm from './ScheduleForm';

export default function PerfilForm({ email, avatarUrl: initialAvatarUrl, settings }) {
  const supabase = createClient();
  const router = useRouter();

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  const [pwSent, setPwSent] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

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
    if (pw1 !== pw2) {
      setPwError('Las contraseñas no coinciden.');
      return;
    }
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initial = (email?.[0] || '?').toUpperCase();

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cuenta */}
      <div className="fcard">
        <div className="flabel">Cuenta</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              {!avatarUrl && initial}
            </div>
            <span style={{
              position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%',
              background: 'var(--btn)', color: 'var(--btn-fg)', border: '2px solid var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera size={12} />
            </span>
          </button>
          <div style={{ minWidth: 0 }}>
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
        {photoError && <p style={{ color: 'var(--danger)', fontSize: 11.5, margin: '8px 0 0' }}>{photoError}</p>}
        <p className="field-note" style={{ marginTop: 10 }}>JPG o PNG. Se muestra en el avatar de la barra superior.</p>
      </div>

      {/* Cambiar contraseña */}
      <div className="fcard">
        <div className="flabel">Cambiar contraseña</div>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Nueva contraseña" aria-label="Nueva contraseña" required minLength={6}
            value={pw1} onChange={(e) => setPw1(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
          <input type="password" placeholder="Repetir contraseña" aria-label="Repetir contraseña" required minLength={6}
            value={pw2} onChange={(e) => setPw2(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }} />
          {pwError && <p style={{ color: 'var(--danger)', fontSize: 12, margin: 0 }}>{pwError}</p>}
          <button className="btn btn-primary btn-block pressable" type="submit" disabled={pwLoading || pwSent} style={{ padding: 12 }}>
            {pwLoading ? 'Enviando…' : pwSent ? 'Correo de confirmación enviado' : 'Actualizar contraseña'}
          </button>
          {!pwSent ? (
            <p className="field-note">
              Te vamos a enviar un correo para confirmar el cambio. La contraseña nueva se activa recién cuando lo confirmes.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--teal-tint)', border: '1px solid var(--teal-line)', borderRadius: 12, padding: '11px 12px' }}>
              <Mail size={18} color="var(--teal-dk)" style={{ flex: 'none', marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800 }}>Revisá tu correo</div>
                <div style={{ fontSize: 11, color: 'var(--text-md)', marginTop: 2, lineHeight: 1.45 }}>
                  Enviamos un enlace a <strong style={{ color: 'var(--text)' }}>{email}</strong>. Hasta que lo confirmes, seguís entrando con tu contraseña actual. El enlace vence en 24 h.
                </div>
                <button type="button" onClick={handleResend} className="pressable" style={{ border: 'none', background: 'none', padding: 0, marginTop: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer' }}>
                  {resendMsg || 'Reenviar correo'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Días y horario de atención */}
      <div className="fcard">
        <div className="flabel">Días y horario de atención</div>
        <p className="field-note" style={{ marginBottom: 10 }}>
          Define qué horarios aparecen bloqueados en tu agenda. Podés ajustarlo cada vez que cambie tu semana; los turnos ya agendados no se tocan.
        </p>
        <ScheduleForm settings={settings} />
      </div>

      {/* Apariencia */}
      <div className="fcard">
        <div className="flabel">Apariencia</div>
        <ThemeToggle />
        <p className="field-note" style={{ marginTop: 8 }}>
          Se aplica a toda la plataforma (Agenda, Turnos libres, Pacientes y Análisis). «Sistema» sigue la configuración de tu teléfono.
        </p>
      </div>

      {/* Cerrar sesión */}
      <div className="fcard" style={{ borderColor: 'color-mix(in srgb, var(--danger) 25%, transparent)' }}>
        <button onClick={handleLogout} className="btn btn-destructive btn-block pressable" style={{ padding: 12 }}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
