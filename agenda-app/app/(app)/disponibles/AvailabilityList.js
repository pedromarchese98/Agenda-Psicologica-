'use client';

import { useRouter } from 'next/navigation';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function AvailabilityList({ days }) {
  const router = useRouter();

  return (
    <div style={{ padding: '16px 16px 90px' }}>
      <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Disponibilidad</h2>
      <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: '0 0 16px' }}>
        Horarios libres de los próximos días hábiles. Tocá un horario para ir a agendarlo.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {days.map((day) => (
          <div key={day.key} className="card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, textTransform: 'capitalize' }}>
              {DAY_NAMES[day.weekday]} {day.day}/{day.month}
            </div>
            {day.freeSlots.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>Sin horarios libres este día.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {day.freeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => router.push(`/agenda?date=${day.key}`)}
                    className="pressable badge badge-teal"
                    style={{ border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px' }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
