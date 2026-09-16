'use client';

import { useRouter } from 'next/navigation';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

function colorFor(a) {
  if (a.attendance === 'no-free') return '#C2454F';
  if (a.attendance === 'no') return '#8A93A8';
  if (a.payment === 'paid') return '#2E9C6A';
  if (a.payment === 'unpaid') return '#D98A22';
  if (a.attendance === 'yes') return '#1E88A8';
  return '#3B6FD9';
}

export default function WeekView({ days, appointmentsByDate }) {
  const router = useRouter();

  return (
    <div style={{ padding: '4px 12px 90px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {days.map((d, i) => {
        const list = (appointmentsByDate[d.key] || []).sort((a, b) => a.time.localeCompare(b.time));
        return (
          <div key={d.key} className="card pressable" style={{ padding: 12 }} onClick={() => router.push(`/agenda?date=${d.key}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: list.length ? 8 : 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{DAY_LABELS[i]} {d.day}</span>
              <span style={{ fontSize: 11, color: 'var(--text-lt)' }}>{list.length} turno{list.length !== 1 ? 's' : ''}</span>
            </div>
            {list.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {list.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorFor(a), flexShrink: 0 }} />
                    <span style={{ fontWeight: 700 }}>{a.time?.slice(0, 5)}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {a.patients ? `${a.patients.first_name} ${a.patients.last_name || ''}`.trim() : 'Paciente'}
                    </span>
                    <span style={{ color: 'var(--text-lt)' }}>{fmt$(a.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
