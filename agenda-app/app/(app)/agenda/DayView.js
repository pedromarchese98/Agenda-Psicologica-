'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import HourList from './HourList';
import NewAppointmentSheet from './NewAppointmentSheet';
import { rescheduleAppointment } from './actions';
import { useDragReschedule } from './useDragReschedule';
import { timeToMinutes, rangesOverlap } from './scheduling';

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function DayView({ dateStr, appointments, blocks, others, patients, priceHints }) {
  const [slot, setSlot] = useState(null); // { date, time } | null
  const [mounted, setMounted] = useState(false);
  const [localAppts, setLocalAppts] = useState(appointments);

  useEffect(() => setMounted(true), []);
  useEffect(() => setLocalAppts(appointments), [appointments]);

  function openModalAt(date, time) {
    setSlot({ date, time });
  }

  function findConflict(date, time, excludeId) {
    if (date !== dateStr || !time) return null;
    const startMin = timeToMinutes(time);
    return localAppts.find((a) => a.id !== excludeId && a.attendance !== 'no-free' && rangesOverlap(startMin, timeToMinutes(a.time))) || null;
  }

  function handleDrop(meta, target) {
    const [slotDate, slotTime] = target.split('|');
    if (slotDate !== dateStr) return;
    const conflict = findConflict(slotDate, slotTime, meta.id);
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
    }
    setLocalAppts((prev) => prev.map((a) => (a.id === meta.id ? { ...a, time: slotTime } : a)));
    rescheduleAppointment(meta.id, slotDate, slotTime);
  }

  const { dragging, hoverSlot, dragHandlers } = useDragReschedule(handleDrop);

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      <HourList
        dateStr={dateStr}
        appointments={localAppts}
        blocks={blocks}
        others={others}
        dragging={dragging}
        hoverSlot={hoverSlot}
        dragHandlers={dragHandlers}
        onFreeSlotClick={openModalAt}
      />

      {mounted && createPortal(
        <button className="fab-compact pressable" onClick={() => openModalAt(dateStr, pad(new Date().getHours()) + ':00')} aria-label="Nuevo turno">
          <Plus size={20} strokeWidth={2.5} />
        </button>,
        document.body
      )}

      {mounted && dragging && createPortal(
        <div
          style={{
            position: 'fixed', left: dragging.x - 60, top: dragging.y - 20, width: 120, pointerEvents: 'none', zIndex: 500,
            background: 'var(--navy)', color: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700,
            boxShadow: 'var(--shadow-lg)', textAlign: 'center', fontFamily: 'var(--font-mono, monospace)',
          }}
        >
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
