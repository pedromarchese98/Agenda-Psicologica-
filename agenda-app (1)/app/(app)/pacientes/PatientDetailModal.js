'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

export default function PatientDetailModal({ backHref, children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function close() {
    router.push(backHref);
  }

  const content = (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', padding: '14px 16px', paddingTop: 'max(14px, var(--safe-top))',
          background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}
      >
        <button onClick={close} className="pressable" style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer', padding: 0 }}>
          ‹ Pacientes
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
