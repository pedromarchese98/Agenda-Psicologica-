'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Flag } from 'lucide-react';
import { timeToMinutes, rangesOverlap } from './scheduling';

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const SIGNAL = {
  turnos: 'var(--teal-dk)',
  superpuesto: 'var(--danger)',
  debe: 'var(--warning)',
  evento: 'var(--text-lt)',
};

// Turnos "vivos" del día (un cancelado libera el horario y no cuenta para superposiciones).
function activeOf(list) {
  return (list || []).filter((a) => a.attendance !== 'no-free');
}
function conflictIds(list) {
  const act = activeOf(list);
  const ids = new Set();
  act.forEach((a, i) => act.forEach((b, j) => {
    if (i < j && rangesOverlap(timeToMinutes(a.time), timeToMinutes(b.time))) { ids.add(a.id); ids.add(b.id); }
  }));
  return ids;
}
function daySignals(list) {
  const act = activeOf(list);
  const out = [];
  if (act.length) out.push(SIGNAL.turnos);
  if (conflictIds(list).size) out.push(SIGNAL.superpuesto);
  if ((list || []).some((a) => a.payment === 'unpaid')) out.push(SIGNAL.debe);
  return out;
}

export default function MonthView({ weeks, appointmentsByDate = {}, othersByDate = {}, todayKey, holidaysByDate = {} }) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState(null); // dateKey | null

  const dayAppts = openDay ? appointmentsByDate[openDay] || [] : [];
  const dayOthers = openDay ? othersByDate[openDay] || [] : [];
  const conflicts = conflictIds(dayAppts);
  const rows = [
    ...dayAppts.map((a) => ({
      key: a.id || `${a.time}-p`,
      time: a.time?.slice(0, 5),
      name: `${a.patients?.first_name || 'Paciente'}${a.patients?.last_name ? ' ' + a.patients.last_name : ''}`,
      suffix: conflicts.has(a.id) ? ' — superpuesto' : a.attendance === 'no-free' ? ' — canceló' : a.payment === 'unpaid' ? ' — debe pago' : '',
      color: conflicts.has(a.id) ? SIGNAL.superpuesto : a.attendance === 'no-free' || a.attendance === 'no' ? SIGNAL.evento : a.payment === 'unpaid' ? SIGNAL.debe : SIGNAL.turnos,
    })),
    ...dayOthers.map((o) => ({ key: o.id || `${o.time}-o`, time: o.time?.slice(0, 5), name: o.title, suffix: '', color: SIGNAL.evento })),
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const openDate = openDay ? new Date(openDay + 'T00:00:00') : null;
  const holidayName = openDay ? holidaysByDate[openDay] : null;

  return (
    <div style={{ padding: '12px 14px 90px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, fontSize: 10, color: 'var(--text-lt)' }}>
        {[['Turnos', SIGNAL.turnos], ['Superpuesto', SIGNAL.superpuesto], ['Debe pago', SIGNAL.debe]].map(([l, c]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{l}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Flag size={10} color="var(--warning)" /> Feriado
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--text-lt)' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const hName = holidaysByDate[d.key];
          const signals = daySignals(appointmentsByDate[d.key]);
          const count = activeOf(appointmentsByDate[d.key]).length + (othersByDate[d.key] || []).length;
          const isToday = d.key === todayKey;
          const selected = d.key === openDay;
          return (
            <button
              key={d.key}
              onClick={() => setOpenDay(d.key)}
              className="pressable"
              title={hName || undefined}
              aria-label={`${d.day}${hName ? `, feriado: ${hName}` : ''}${count ? `, ${count} turnos` : ''}`}
              style={{
                aspectRatio: '.85', borderRadius: 10, position: 'relative', cursor: 'pointer', padding: 0,
                border: isToday ? '2px solid var(--teal)' : hName ? '1px solid transparent' : '1px solid var(--border-soft)',
                background: hName ? 'var(--warning-tint)' : d.weekend ? 'var(--surface)' : 'var(--card)',
                boxShadow: selected ? 'inset 0 0 0 2px var(--ink)' : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                color: 'var(--text)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--teal-dk)' : 'inherit' }}>{d.day}</span>
              {signals.length > 0 && (
                <span style={{ display: 'flex', gap: 2 }}>
                  {signals.map((c) => <span key={c} style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: c }} />)}
                </span>
              )}
              {hName && <Flag size={8} color="var(--warning)" style={{ position: 'absolute', top: 4, right: 4 }} />}
              {count > 1 && (
                <span style={{ position: 'absolute', bottom: 3, right: 4, fontSize: 8, fontWeight: 800, color: 'var(--text-lt)' }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {openDay && (
        <div onClick={() => setOpenDay(null)} className="sheet-backdrop">
          <div onClick={(e) => e.stopPropagation()} className="sheet sheet-box" style={{ maxHeight: '70dvh', gap: 10 }}>
            <div className="sheet-grab" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ fontSize: 14, textTransform: 'capitalize' }}>
                {DAY_NAMES[openDate.getDay()]} {openDate.getDate()} de {MONTH_NAMES[openDate.getMonth()]}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {holidayName && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warning-text)', background: 'var(--warning-tint)', padding: '2px 8px', borderRadius: 999 }}>
                    {holidayName}
                  </span>
                )}
                <button onClick={() => setOpenDay(null)} className="pressable" aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--text-lt)', cursor: 'pointer', display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: '4px 0' }}>Sin turnos agendados este día.</p>
            ) : (
              <div>
                {rows.map((r, i) => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)' }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', background: 'var(--teal-tint)', borderRadius: 6, padding: '3px 6px', flex: 'none' }}>
                      {r.time}
                    </span>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.name}<span style={{ color: 'var(--text-lt)', fontWeight: 500 }}>{r.suffix}</span>
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flex: 'none' }} />
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => router.push(`/agenda?view=day&date=${openDay}`)} className="btn btn-primary btn-block pressable" style={{ marginTop: 4 }}>
              Ver día completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
