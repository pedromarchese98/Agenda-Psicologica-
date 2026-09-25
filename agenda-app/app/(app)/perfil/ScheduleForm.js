'use client';

import { useState, useTransition } from 'react';
import { updateSchedule } from './actions';

const DAYS = [
  { key: 0, label: 'L' }, { key: 1, label: 'M' }, { key: 2, label: 'X' },
  { key: 3, label: 'J' }, { key: 4, label: 'V' }, { key: 5, label: 'S' }, { key: 6, label: 'D' },
];

export default function ScheduleForm({ settings }) {
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState(settings?.working_days || [0, 1, 2, 3, 4]);
  const [hourStart, setHourStart] = useState(settings?.hour_start ?? 9);
  const [hourEnd, setHourEnd] = useState(settings?.hour_end ?? 19);
  const [msg, setMsg] = useState('');

  function toggleDay(key) {
    setDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key].sort()));
  }

  function handleSave() {
    if (days.length === 0 || hourStart >= hourEnd) return;
    startTransition(async () => {
      await updateSchedule(days, hourStart, hourEnd);
      setMsg('✅ Guardado. Actualizamos los horarios bloqueados de acuerdo a esto.');
      setTimeout(() => setMsg(''), 3500);
    });
  }

  const HOURS = Array.from({ length: 15 }, (_, i) => 6 + i); // 6 a 20

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DAYS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleDay(key)}
            className="pressable"
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', fontWeight: 700, fontSize: 12.5,
              cursor: 'pointer',
              background: days.includes(key) ? 'var(--navy)' : 'var(--muted)',
              color: days.includes(key) ? '#fff' : 'var(--text-md)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Desde</label>
          <select
            value={hourStart}
            onChange={(e) => setHourStart(Number(e.target.value))}
            style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Hasta</label>
          <select
            value={hourEnd}
            onChange={(e) => setHourEnd(Number(e.target.value))}
            style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
      </div>

      {hourStart >= hourEnd && (
        <p style={{ color: 'var(--rose)', fontSize: 12, margin: 0 }}>El horario de inicio debe ser antes que el de cierre.</p>
      )}
      {days.length === 0 && (
        <p style={{ color: 'var(--rose)', fontSize: 12, margin: 0 }}>Elegí al menos un día.</p>
      )}
      {msg && <p style={{ color: 'var(--sage)', fontSize: 12, margin: 0 }}>{msg}</p>}

      <button
        className="btn btn-primary pressable"
        style={{ width: '100%' }}
        onClick={handleSave}
        disabled={isPending || days.length === 0 || hourStart >= hourEnd}
      >
        {isPending ? 'Guardando…' : 'Guardar días y horario'}
      </button>
    </div>
  );
}
