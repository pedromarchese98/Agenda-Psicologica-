'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Calendar, CalendarClock, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME, LogoIcon } from '@/lib/brand';

const TABS = [
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/disponibles', label: 'Turnos libres', icon: CalendarClock },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/analisis', label: 'Análisis', icon: BarChart3 },
];

const HIDE_THRESHOLD = 8; // px de scroll mínimo antes de reaccionar (evita parpadeos)

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const menuRef = useRef(null);
  const mainRef = useRef(null);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data?.user?.email || '');
      setAvatarUrl(data?.user?.user_metadata?.avatar_url || '');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user) {
        setEmail(session.user.email || '');
        setAvatarUrl(session.user.user_metadata?.avatar_url || '');
      }
    });
    return () => sub?.subscription?.unsubscribe();
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

  // Oculta el nav inferior al scrollear hacia abajo y lo vuelve a mostrar al subir.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    lastScrollRef.current = el.scrollTop;

    function onScroll() {
      const current = el.scrollTop;
      const delta = current - lastScrollRef.current;
      if (current <= 4) {
        setNavHidden(false);
      } else if (delta > HIDE_THRESHOLD) {
        setNavHidden(true);
        lastScrollRef.current = current;
      } else if (delta < -HIDE_THRESHOLD) {
        setNavHidden(false);
        lastScrollRef.current = current;
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Al cambiar de pantalla, el nav siempre vuelve a mostrarse.
  useEffect(() => {
    setNavHidden(false);
  }, [pathname]);

  // El botón flotante (+) se renderiza en <body>: acompaña al nav con una clase global.
  useEffect(() => {
    document.body.classList.toggle('nav-hidden', navHidden);
    return () => document.body.classList.remove('nav-hidden');
  }, [navHidden]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initial = (email || '?').trim().charAt(0).toUpperCase();

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 12px', paddingTop: 'max(14px, var(--safe-top))',
          background: 'var(--navy)', position: 'relative', flex: 'none',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoIcon size={17} color="var(--teal)" strokeWidth={2} /> {APP_NAME}
        </span>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="pressable"
            style={{
              width: 30, height: 30, borderRadius: '50%', background: avatarUrl ? 'var(--muted)' : 'var(--teal)', color: 'var(--navy)',
              border: 'none', fontWeight: 800, fontSize: 12.5, cursor: 'pointer',
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
            }}
            aria-label="Cuenta"
          >
            {!avatarUrl && initial}
          </button>

          {menuOpen && (
            <div className="card" style={{ position: 'absolute', top: 38, right: 0, width: 230, padding: 10, zIndex: 60, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 14, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid var(--border-soft)', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
                <div style={{ fontSize: 11, color: 'var(--text-lt)' }}>Psicólogo/a</div>
              </div>
              <Link href="/perfil" onClick={() => setMenuOpen(false)} className="pressable"
                style={{ padding: '9px 8px', fontSize: 13, borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={15} /> Perfil y configuración
              </Link>
              <button
                onClick={handleLogout} className="pressable"
                style={{ padding: '9px 8px', fontSize: 13, borderRadius: 8, fontWeight: 600, textAlign: 'left', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 78 }}>
        {children}
      </main>

      <nav className={`app-bottom-nav${navHidden ? ' nav-hidden' : ''}`}>
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href} href={tab.href} className="pressable"
              aria-current={active ? 'page' : undefined}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: active ? 'var(--teal-dk)' : 'var(--text-lt)', fontSize: 10, fontWeight: 700 }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
              <span className="tab-dot" style={{ opacity: active ? 1 : 0 }} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
