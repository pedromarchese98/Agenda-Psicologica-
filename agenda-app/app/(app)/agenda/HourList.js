'use client';

import { Circle } from 'lucide-react';
import AppointmentRow from './AppointmentRow';
import EventRow from './EventRow';
import { findConflicts } from './scheduling';

const HOUR_START = 7;
const HOUR_END = 20;

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function HourList({
  dateStr, appointments, blocks, others,
  dragging, hoverSlot, dragHandlers, onFreeSlotClick,
  compact = false,
}) {
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);
  const visibleHours = hours.filter((h) => !blocks.some((b) => b.time?.startsWith(pad(h) + ':')));

  const rowPad = compact ? '4px 0' : '8px 0';
  const minHeight = compact ? 32 : 56;
  const labelW = compact ? 34 : 40;
  const labelSize = compact ? 10 : 11;
  const gap = compact ? 6 : 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {visibleHours.map((h) => {
        const hourStr = pad(h);
        const slot = `${dateStr}|${hourStr}:00`;
        const apptsInHour = appointments.filter((a) => a.time?.startsWith(hourStr + ':'));
        const othersInHour = others.filter((o) => o.time?.startsWith(hourStr + ':'));
        // Un turno cancelado (no-free) libera el horario para volver a agendar,
        // aunque su registro histórico se siga mostrando arriba.
        const isFree = apptsInHour.filter((a) => a.attendance !== 'no-free').length === 0 && othersInHour.length === 0;
        const isHovered = hoverSlot === slot && isFree;

        return (
          <div key={h} style={{ display: 'flex', gap, borderTop: '1px solid var(--border)', padding: rowPad, minHeight }}>
            <div style={{ width: labelW, fontSize: labelSize, color: 'var(--text-lt)', flexShrink: 0, paddingTop: 2, fontFamily: 'var(--font-mono, monospace)' }}>
              {hourStr}:00
            </div>
            <div
              data-slot={isFree ? slot : undefined}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 8,
                outline: isHovered ? '2px dashed var(--teal-dk)' : 'none', outlineOffset: 2,
                transition: 'outline .1s ease', minHeight: compact ? 24 : 34,
              }}
            >
              {apptsInHour.map((appt) => {
                const conflicts = findConflicts(appt, appointments);
                return (
                  <div
                    key={appt.id}
                    {...dragHandlers({ id: appt.id, fromDate: dateStr, label: appt.time?.slice(0, 5) })}
                    style={{ opacity: dragging?.id === appt.id ? 0.35 : 1, touchAction: 'pan-y' }}
                  >
                    <AppointmentRow appt={appt} compact={compact} hasConflict={conflicts.length > 0} conflictWith={conflicts[0]} />
                  </div>
                );
              })}
              {othersInHour.map((o) => (
                <EventRow key={o.id} event={o} compact={compact} />
              ))}
              {isFree && (
                <button
                  onClick={() => onFreeSlotClick(dateStr, `${hourStr}:00`)}
                  className="pressable"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    textAlign: 'left', background: 'var(--teal-tint)', border: '1px dashed #9FE0CE', borderRadius: 8,
                    padding: compact ? '5px 9px' : '9px 12px', fontSize: compact ? 11 : 12, fontWeight: 600,
                    color: 'var(--teal-dk)', cursor: 'pointer',
                  }}
                >
                  <Circle size={compact ? 7 : 8} fill="currentColor" strokeWidth={0} />
                  {compact ? 'Libre' : 'Libre — tocar para agendar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
