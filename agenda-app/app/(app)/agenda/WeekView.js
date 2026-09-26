'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import HourList from './HourList';
import NewAppointmentSheet from './NewAppointmentSheet';
import { rescheduleAppointment } from './actions';
import { useDragReschedule } from './useDragReschedule';
import { timeToMinutes, rangesOverlap } from './scheduling';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function WeekView({ days, appointmentsByDate, blockedByDate, othersByDate, patients, priceHints }) {
  const [mounted, setMounted] = useState(false);
  const [local, setLocal] = useState(appointmentsByDate);
  const [slot, setSlot] = useState(null); // { date, time } | null

  useEffect(() => setMounted(true), []);
  useEffect(() => setLocal(appointmentsByDate), [appointmentsByDate]);

  function openModalAt(date, time) {
    setSlot({ date, time });
  }

  function findConflict(date, time, excludeId) {
    if (!date || !time) return null;
    const startMin = timeToMinutes(time);
    return (local[date] || []).find((a) => a.id !== excludeId && a.attendance !== 'no-free' && rangesOverlap(startMin, timeToMinutes(a.time))) || null;
  }

  function handleDrop(meta, target) {
    const [slotDate, slotTime] = target.split('|');
    const conflict = findConflict(slotDate, slotTime, meta.id);
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
    }
    setLocal((prev) => {
      const next = { ...prev };
      const fromDate = meta.fromDate;
      const moved = (prev[fromDate] || []).find((a) => a.id === meta.id);
      if (!moved) return prev;
      next[fromDate] = (next[fromDate] || []).filter((a) => a.id !== meta.id);
      next[slotDate] = [...(next[slotDate] || []), { ...moved, date: slotDate, time: slotTime }];
      return next;
    });
    rescheduleAppointment(meta.id, slotDate, slotTime);
  }

  const { dragging, hoverSlot, dragHandlers } = useDragReschedule(handleDrop);

  const todayKey = toDateStr(new Date());

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      {days.map((d) => {
        const dt = new Date(d.key + 'T00:00:00');
        const isToday = d.key === todayKey;
        return (
          <div key={d.key} style={{ marginBottom: 6 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 800, color: isToday ? 'var(--teal-dk)' : 'var(--ink)',
              padding: '8px 0 6px', position: 'sticky', top: 0, background: 'var(--card)', zIndex: 3,
            }}>
              <span style={{ textTransform: 'capitalize' }}>{DAY_NAMES[dt.getDay()]}</span> {dt.getDate()} de {MONTH_SHORT[dt.getMonth()]}
              {isToday && ' — hoy'}
            </div>
            <HourList
              dateStr={d.key}
              appointments={local[d.key] || []}
              blocks={blockedByDate[d.key] || []}
              others={othersByDate[d.key] || []}
              dragging={dragging}
              hoverSlot={hoverSlot}
              dragHandlers={dragHandlers}
              onFreeSlotClick={openModalAt}
              compact
            />
          </div>
        );
      })}

      {mounted && createPortal(
        <button className="fab-compact pressable" onClick={() => openModalAt(days[0]?.key, pad(new Date().getHours()) + ':00')} aria-label="Nuevo turno">
          <Plus size={20} strokeWidth={2.5} />
        </button>,
        document.body
      )}

      {mounted && dragging && createPortal(
        <div style={{
          position: 'fixed', left: dragging.x - 60, top: dragging.y - 20, width: 120, pointerEvents: 'none', zIndex: 500,
          background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0,0,0,.3)', textAlign: 'center',
        }}>
          {dragging.label}
        </div>,
        document.body
      )}

      <NewAppointmentSheet
        slot={slot}
        onClose={() => setSlot(null)}
        patients={patients}
        priceHints={priceHints}
        findConflict={(d, t) => findConflict(d, t)}
      />
    </div>
  );
}
