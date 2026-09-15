'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TABS = [
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/pacientes', label: 'Pacientes', icon: '👥' },
  { href: '/analisis', label: 'Análisis', icon: '📊' },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px calc(10px + var(--safe-top, 0px))',
          paddingTop: 'max(14px, var(--safe-top))',
          background: 'var(--navy)',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          🧠 Agenda Psicológica
        </span>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.55)', fontSize: 13, cursor: 'pointer' }}
        >
          Salir
        </button>
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
              <span style={{ fontSize: 21 }}>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
