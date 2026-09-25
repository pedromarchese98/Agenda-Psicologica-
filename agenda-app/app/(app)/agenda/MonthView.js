'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Laptop, Home } from 'lucide-react';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ATT_LABEL = { yes: 'Asistió', no: 'No asistió', 'no-free': 'Canceló', pending: 'Pendiente' };
const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

function daySignal(list) {
  if (!list || list.length === 0) return null;
  if (list.some((a) => a.attendance === 'no' || a.attendance === 'no-free')) return 'var(--rose)';
  if (list.some((a) => a.payment === 'unpaid')) return 'var(--amber)';
  return 'var(--teal-dk)';
}

export default function MonthView({ weeks, countsByDate, appointmentsByDate = {}, todayKey, holidaysByDate = {} }) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState(null); // { key, day } | null

  const dayList = openDay ? appointmentsByDate[openDay.key] || [] : [];
  const holidayName = openDay ? holidaysByDate[openDay.key] : null;

  return (
    <div style={{ padding: '4px 10px 90px', position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DAY_LABELS.map((l) => (
          <div key={l} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase' }}>
            {l}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {week.map((d, di) => {
              if (!d) return <div key={di} />;
              const hName = holidaysByDate[d.key];
              const signal = daySignal(appointmentsByDate[d.key]);
              return (
                <button
                  key={di}
                  onClick={() => setOpenDay({ key: d.key, day: d.day })}
                  className="card pressable"
                  title={hName || undefined}
                  style={{
                    aspectRatio: '1',
                    border: d.key === todayKey ? '2px solid var(--teal)' : hName ? '1.5px solid var(--amber)' : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, cursor: 'pointer', position: 'relative',
                    background: hName ? 'var(--amber-tint)' : 'var(--card)',
                    opacity: d.weekend && !countsByDate[d.key] ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: d.key === todayKey ? 'var(--teal-dk)' : 'var(--text)' }}>
                    {d.day}
                  </span>
                  {hName && (
                    <span style={{ position: 'absolute', top: 3, right: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)' }} />
                  )}
                  {countsByDate[d.key] > 0 && (
                    <span style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--teal-dk)', background: 'var(--teal-tint)', borderRadius: 8, padding: '1px 5px' }}>
                      {countsByDate[d.key]}
                    </span>
                  )}
                  {signal && (
                    <span style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: signal }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {openDay && (
        <div
          onClick={() => setOpenDay(null)}
          className="sheet-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card sheet-box"
            style={{
              width: '100%', maxHeight: '70vh', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              padding: '10px 18px calc(18px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '2px auto 4px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Día {openDay.day}</div>
                {holidayName && (
                  <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, marginTop: 2 }}>🎉 {holidayName}</div>
                )}
              </div>
              <button onClick={() => setOpenDay(null)} className="pressable" style={{ background: 'none', border: 'none', color: 'var(--text-lt)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {dayList.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: '4px 0 8px' }}>Sin turnos agendados este día.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayList.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 700, color: 'var(--text-md)', width: 42, flex: 'none' }}>
                      {a.time?.slice(0, 5)}
                    </span>
                    {a.modality === 'virtual' ? <Laptop size={13} color="var(--text-lt)" /> : <Home size={13} color="var(--text-lt)" />}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.patients?.first_name} {a.patients?.last_name || ''}
                    </span>
                    <span className={`badge ${a.attendance === 'no' || a.attendance === 'no-free' ? 'badge-rose' : a.attendance === 'yes' ? 'badge-teal' : 'badge-neutral'}`}>
                      {ATT_LABEL[a.attendance] || 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push(`/agenda?date=${openDay.key}`)}
              className="btn btn-primary pressable"
              style={{ width: '100%', marginTop: 4 }}
            >
              Ver día completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
