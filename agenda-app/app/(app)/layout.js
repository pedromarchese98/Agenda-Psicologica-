'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TABS = [
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/disponibles', label: 'Disponible', icon: '🟢' },
  { href: '/pacientes', label: 'Pacientes', icon: '👥' },
  { href: '/analisis', label: 'Análisis', icon: '📊' },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ''));
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initial = (email || '?').trim().charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px 10px',
          paddingTop: 'max(14px, var(--safe-top))',
          background: 'var(--navy)',
          position: 'relative',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          🧠 Agenda Psicológica
        </span>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="pressable"
            style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--teal)', color: 'var(--navy)',
              border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}
            aria-label="Cuenta"
          >
            {initial}
          </button>

          {menuOpen && (
            <div
              className="card"
              style={{
                position: 'absolute', top: 38, right: 0, width: 220, padding: 10, zIndex: 60,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-lt)' }}>Psicólogo/a</div>
              </div>
              <Link
                href="/perfil"
                onClick={() => setMenuOpen(false)}
                style={{ padding: '9px 8px', fontSize: 13, borderRadius: 8, fontWeight: 600 }}
                className="pressable"
              >
                ⚙️ Perfil y configuración
              </Link>
              <button
                onClick={handleLogout}
                className="pressable"
                style={{
                  padding: '9px 8px', fontSize: 13, borderRadius: 8, fontWeight: 600, textAlign: 'left',
                  background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer',
                }}
              >
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 78 }}>{children}</main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          background: 'rgba(255,255,255,.94)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'max(10px, var(--safe-bottom))',
          paddingTop: 8,
        }}
      >
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="pressable"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                color: active ? 'var(--teal-dk)' : 'var(--text-lt)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 21, transform: active ? 'scale(1.08)' : 'scale(1)', transition: 'transform .15s ease' }}>
                {tab.icon}
              </span>
              {tab.label}
              <span className="tab-dot" style={{ opacity: active ? 1 : 0 }} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
