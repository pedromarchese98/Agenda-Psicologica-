'use client';

import { useRouter } from 'next/navigation';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

export default function MonthView({ weeks, countsByDate, todayKey, holidaysByDate = {} }) {
  const router = useRouter();

  return (
    <div style={{ padding: '4px 12px 90px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map((l) => (
          <div key={l} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase' }}>
            {l}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {week.map((d, di) => {
              if (!d) return <div key={di} />;
              const holidayName = holidaysByDate[d.key];
              return (
                <button
                  key={di}
                  onClick={() => router.push(`/agenda?date=${d.key}`)}
                  className="card pressable"
                  title={holidayName || undefined}
                  style={{
                    aspectRatio: '1',
                    border: d.key === todayKey ? '2px solid var(--teal)' : holidayName ? '1.5px solid var(--amber)' : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 3, cursor: 'pointer', background: holidayName ? '#FCF1E3' : 'var(--card)', position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.key === todayKey ? 'var(--teal-dk)' : 'var(--text)' }}>
                    {d.day}
                  </span>
                  {holidayName && (
                    <span style={{ position: 'absolute', top: 3, right: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)' }} />
                  )}
                  {countsByDate[d.key] > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--teal-dk)', background: '#E6F8F3', borderRadius: 8, padding: '1px 6px' }}>
                      {countsByDate[d.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
