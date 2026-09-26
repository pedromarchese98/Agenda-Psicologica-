'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEvent } from './actions';

const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export default function AvailabilityView({ days }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hidden, setHidden] = useState([]);

  function unblock(id) {
    if (!confirm('¿Liberar este horario bloqueado?')) return;
    setHidden((prev) => [...prev, id]);
    startTransition(() => deleteEvent(id));
  }

  return (
    <div style={{ padding: '4px 16px 90px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>
        Próximos 7 días. Tocá un horario libre para agendar ahí, o un bloqueado para liberarlo.
      </p>
      {days.map((day) => (
        <div key={day.key} className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, textTransform: 'capitalize' }}>
            {DAY_NAMES[day.weekday]} {day.day}/{day.month}
          </div>
          {day.slots.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>Sin horarios disponibles.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {day.slots.map((s) => (
                <button
                  key={s.time}
                  onClick={() => (s.status === 'free' ? router.push(`/agenda?date=${day.key}`) : s.status === 'blocked' ? unblock(s.id) : null)}
                  disabled={hidden.includes(s.id)}
                  className="pressable"
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: 'none',
                    cursor: s.status === 'occupied' ? 'default' : 'pointer',
                    opacity: hidden.includes(s.id) ? 0.3 : 1,
                    background: s.status === 'free' ? '#E6F8F3' : s.status === 'blocked' ? '#ECEFF6' : '#F0F3F8',
                    color: s.status === 'free' ? 'var(--teal-dk)' : s.status === 'blocked' ? 'var(--text-lt)' : 'var(--text-lt)',
                  }}
                >
                  {s.time}{s.status === 'blocked' ? ' 🚫' : s.status === 'occupied' ? ' 👤' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
