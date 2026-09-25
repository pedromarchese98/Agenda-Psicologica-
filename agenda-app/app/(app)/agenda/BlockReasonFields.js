'use client';

import { useState } from 'react';

const REASONS = ['Supervisión', 'Personal', 'Trámite', 'Formación', 'Vacaciones', 'Otro'];

export default function BlockReasonFields({ defaultReason = 'Supervisión' }) {
  const [reason, setReason] = useState(defaultReason);
  const [recurring, setRecurring] = useState(false);

  return (
    <>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '.03em', display: 'block', marginBottom: 6 }}>
          Motivo <span style={{ color: 'var(--rose)' }}>*</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="pressable"
              style={{
                fontSize: 11.5, fontWeight: 700, padding: '7px 12px', borderRadius: 999,
                border: `1px solid ${reason === r ? 'var(--navy)' : 'var(--border)'}`,
                background: reason === r ? 'var(--navy)' : 'var(--card)', color: reason === r ? '#fff' : 'var(--text-md)',
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <input type="hidden" name="reason" value={reason} />
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '.03em', display: 'block', marginBottom: 6 }}>
          Nota <span style={{ fontWeight: 500, textTransform: 'none', color: 'var(--text-lt)' }}>(opcional)</span>
        </label>
        <textarea
          name="note"
          placeholder="Ej.: grupo de supervisión con Lic. Pérez"
          rows={2}
          style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 12.5, resize: 'vertical' }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
        Repetir cada semana
        <input type="checkbox" name="recurring" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} style={{ width: 18, height: 18 }} />
      </label>
    </>
  );
}
