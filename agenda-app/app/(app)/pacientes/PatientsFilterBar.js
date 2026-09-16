'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const OPTIONS = [
  { value: 'active', label: '🟢 Activos' },
  { value: 'all', label: 'Todos' },
  { value: 'paused', label: '🟡 Pausados' },
  { value: 'suspended', label: '🟠 Suspendidos' },
  { value: 'abandoned', label: '🔴 Abandonaron' },
  { value: 'discharged', label: '🟣 De alta' },
  { value: 'referred', label: '🔵 Derivados' },
];

export default function PatientsFilterBar({ status, q }) {
  const router = useRouter();
  const [text, setText] = useState(q || '');

  function updateParams(next) {
    const params = new URLSearchParams();
    params.set('status', next.status ?? status);
    if ((next.q ?? text).trim()) params.set('q', next.q ?? text);
    router.push(`/pacientes?${params.toString()}`);
  }

  return (
    <div style={{ padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && updateParams({ q: text })}
        onBlur={() => updateParams({ q: text })}
        placeholder="Buscar…"
        style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
      />
      <select
        value={status}
        onChange={(e) => updateParams({ status: e.target.value })}
        style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
