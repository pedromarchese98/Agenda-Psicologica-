'use client';

import { useState } from 'react';

const REASONS = ['Supervisión', 'Personal', 'Trámite', 'Formación', 'Vacaciones', 'Otro'];

// Motivo (obligatorio), nota opcional y "repetir cada semana".
// Es el mismo bloque en todos los lugares donde se bloquea un horario: la Agenda y Turnos libres.
export default function BlockReasonFields({ defaultReason = 'Supervisión' }) {
  const [reason, setReason] = useState(defaultReason);
  const [recurring, setRecurring] = useState(false);

  return (
    <>
      <div>
        <span className="field-label">
          Motivo <span style={{ color: 'var(--danger)' }}>*</span>
        </span>
        <div className="chip-row">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`chip pressable${reason === r ? ' on' : ''}`}
              aria-pressed={reason === r}
            >
              {r}
            </button>
          ))}
        </div>
        <input type="hidden" name="reason" value={reason} />
      </div>

      <div>
        <label htmlFor="block-note" className="field-label">
          Nota <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
        </label>
        <textarea
          id="block-note"
          name="note"
          placeholder="Ej.: grupo de supervisión con Lic. Pérez"
          rows={2}
          style={{ width: '100%', padding: '9px 11px', fontSize: 13, resize: 'vertical' }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Repetir cada semana
        <span className="switch">
          <input type="checkbox" name="recurring" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          <span />
        </span>
      </label>
    </>
  );
}

// Selector "Cuándo": fecha + desde + hasta (bloques de una hora).
export function BlockWhenFields({ defaultDate = '', defaultTime = '' }) {
  const [start, setStart] = useState(defaultTime || '');
  const startHour = start ? parseInt(start.slice(0, 2), 10) : null;
  const [end, setEnd] = useState(startHour != null ? `${String(Math.min(startHour + 1, 21)).padStart(2, '0')}:00` : '');

  function onStart(v) {
    setStart(v);
    const h = parseInt(v.slice(0, 2), 10);
    if (!Number.isNaN(h) && (!end || parseInt(end.slice(0, 2), 10) <= h)) {
      setEnd(`${String(Math.min(h + 1, 23)).padStart(2, '0')}:00`);
    }
  }

  return (
    <div>
      <span className="field-label">Cuándo</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input name="date" type="date" defaultValue={defaultDate} required aria-label="Fecha"
          style={{ flex: 1, minWidth: 0, padding: '10px 11px', fontSize: 14 }} />
        <input name="time" type="time" step={3600} value={start} onChange={(e) => onStart(e.target.value)} required aria-label="Desde"
          className="mono" style={{ width: 92, padding: '10px 8px', fontSize: 14 }} />
        <input name="end_time" type="time" step={3600} value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Hasta"
          className="mono" style={{ width: 92, padding: '10px 8px', fontSize: 14 }} />
      </div>
    </div>
  );
}
