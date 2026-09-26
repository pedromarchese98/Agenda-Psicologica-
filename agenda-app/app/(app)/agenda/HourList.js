'use client';

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
          <div key={h} className={`hour-row${compact ? ' compact' : ''}`}>
            <div className="hour-label">{compact ? hourStr : `${hourStr}:00`}</div>
            <div
              data-slot={isFree ? slot : undefined}
              style={{
                flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 10,
                outline: isHovered ? '2px dashed var(--teal-dk)' : 'none', outlineOffset: 2,
                transition: 'outline .1s ease',
              }}
            >
              {apptsInHour.map((appt) => {
                const conflicts = findConflicts(appt, appointments.filter((a) => a.attendance !== 'no-free'));
                return (
                  <div
                    key={appt.id}
                    {...dragHandlers({ id: appt.id, fromDate: dateStr, label: appt.time?.slice(0, 5) })}
                    style={{ opacity: dragging?.id === appt.id ? 0.35 : 1, touchAction: 'pan-y' }}
                  >
                    <AppointmentRow
                      appt={appt} compact={compact}
                      hasConflict={appt.attendance !== 'no-free' && conflicts.length > 0} conflictWith={conflicts[0]}
                    />
                  </div>
                );
              })}
              {othersInHour.map((o) => (
                <EventRow key={o.id} event={o} compact={compact} />
              ))}
              {isFree && (
                <button onClick={() => onFreeSlotClick(dateStr, `${hourStr}:00`)} className="free-slot pressable">
                  <span className="dot" />
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
