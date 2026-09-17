'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AppointmentRow from './AppointmentRow';
import EventRow from './EventRow';
import { createAppointment, rescheduleAppointment } from './actions';
import { useDragReschedule } from './useDragReschedule';
import { findConflicts, timeToMinutes, rangesOverlap } from './scheduling';

const HOUR_START = 7;
const HOUR_END = 20;

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function DayView({ dateStr, appointments, blocks, others, patients }) {
  const [modalTime, setModalTime] = useState(null);
  const [closing, setClosing] = useState(false);
  const [formType, setFormType] = useState('patient');
  const [eventIsPaid, setEventIsPaid] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localAppts, setLocalAppts] = useState(appointments);

  useEffect(() => setMounted(true), []);
  useEffect(() => setLocalAppts(appointments), [appointments]);

  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);
  const visibleHours = hours.filter((h) => !blocks.some((b) => b.time?.startsWith(pad(h) + ':')));

  function openModalAt(time) {
    setFormType('patient');
    setEventIsPaid(false);
    setModalTime(time);
  }
  function close() {
    setClosing(true);
    setTimeout(() => { setModalTime(null); setClosing(false); }, 220);
  }

  function handleDrop(meta, slot) {
    const [slotDate, slotTime] = slot.split('|');
    if (slotDate !== dateStr) return; // en Día solo hay una fecha
    const startMin = timeToMinutes(slotTime);
    const conflict = localAppts.find((a) => a.id !== meta.id && rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`⚠️ Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
    }
    setLocalAppts((prev) => prev.map((a) => (a.id === meta.id ? { ...a, time: slotTime } : a)));
    rescheduleAppointment(meta.id, slotDate, slotTime);
  }

  const { dragging, hoverSlot, dragHandlers } = useDragReschedule(handleDrop);

  function checkConflictBeforeSubmit(e) {
    const form = e.target;
    const type = form.type?.value;
    const time = form.time?.value;
    const date = form.date?.value;
    if (type !== 'patient' || date !== dateStr || !time) return;
    const startMin = timeToMinutes(time);
    const conflict = localAppts.find((a) => rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`⚠️ Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) {
        e.preventDefault();
      }
    }
  }

  const modal = modalTime !== null && (
    <div
      onClick={close}
      className="sheet-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
    >
      <form
        onSubmit={checkConflictBeforeSubmit}
        action={async (formData) => { await createAppointment(formData); close(); }}
        onClick={(e) => e.stopPropagation()}
        className={`card sheet-box${closing ? ' closing' : ''}`}
        style={{
          width: '100%', maxHeight: '88dvh', overflowY: 'auto',
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          padding: '10px 20px calc(20px + var(--safe-bottom))',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
        <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo</h3>

        <select name="type" value={formType} onChange={(e) => setFormType(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
          <option value="patient">👤 Turno con paciente</option>
          <option value="other">📌 Evento (reunión, colegio, etc.)</option>
          <option value="block">🚫 Bloquear horario</option>
        </select>

        {formType === 'patient' && (
          <>
            <input name="name" placeholder="Nombre del paciente (o elegí uno existente)" list="patients-datalist" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            <datalist id="patients-datalist">
              {(patients || []).map((p) => (
                <option key={p.id} value={`${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`} />
              ))}
            </datalist>
          </>
        )}

        {formType === 'other' && (
          <>
            <input name="title" placeholder="Ej: Reunión con padres, colegio…" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" name="isPaid" checked={eventIsPaid} onChange={(e) => setEventIsPaid(e.target.checked)} />
              Es un evento pago
            </label>
            {eventIsPaid && (
              <input name="price" type="number" placeholder="Precio" required
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <input name="date" type="date" defaultValue={dateStr} required
            style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
          <input name="time" type="time" defaultValue={modalTime} required
            style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
        </div>

        {formType === 'patient' && (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <select name="modality" defaultValue="virtual"
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <option value="virtual">💻 Virtual</option>
                <option value="presencial">🏠 Presencial</option>
              </select>
              <input name="price" type="number" placeholder="Precio" required
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', display: 'block', marginBottom: 4 }}>Frecuencia</label>
              <select name="repeat" defaultValue="once"
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <option value="once">Una sola vez</option>
                <option value="weekly">Semanal (1 año)</option>
                <option value="biweekly">Quincenal (1 año)</option>
              </select>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={close}>Cancelar</button>
          <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }}>Guardar</button>
        </div>
      </form>
    </div>
  );

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visibleHours.map((h) => {
          const hourStr = pad(h);
          const slot = `${dateStr}|${hourStr}:00`;
          const apptsInHour = localAppts.filter((a) => a.time?.startsWith(hourStr + ':'));
          const othersInHour = others.filter((o) => o.time?.startsWith(hourStr + ':'));
          const isFree = apptsInHour.length === 0 && othersInHour.length === 0;
          const isHovered = hoverSlot === slot && isFree;

          return (
            <div key={h} style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', padding: '8px 0', minHeight: 56 }}>
              <div style={{ width: 40, fontSize: 11, color: 'var(--text-lt)', flexShrink: 0, paddingTop: 2 }}>{hourStr}:00</div>
              <div
                data-slot={isFree ? slot : undefined}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 8,
                  outline: isHovered ? '2px dashed var(--teal-dk)' : 'none', outlineOffset: 2,
                  transition: 'outline .1s ease', minHeight: 34,
                }}
              >
                {apptsInHour.map((appt) => {
                  const conflicts = findConflicts(appt, localAppts);
                  return (
                    <div key={appt.id} {...dragHandlers({ id: appt.id, label: `${appt.time?.slice(0, 5)}` })}
                      style={{ opacity: dragging?.id === appt.id ? 0.35 : 1, touchAction: 'pan-y' }}>
                      <AppointmentRow appt={appt} compact hasConflict={conflicts.length > 0} conflictWith={conflicts[0]} />
                    </div>
                  );
                })}
                {othersInHour.map((o) => (
                  <EventRow key={o.id} event={o} />
                ))}
                {isFree && (
                  <button
                    onClick={() => openModalAt(`${hourStr}:00`)}
                    className="pressable"
                    style={{
                      textAlign: 'left', background: '#E6F8F3', border: '1px dashed #9FE0CE', borderRadius: 8,
                      padding: '9px 12px', fontSize: 12, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer',
                    }}
                  >
                    Libre — tocar para agendar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="fab-extended pressable" onClick={() => openModalAt(pad(new Date().getHours()) + ':00')}>
        <span className="fab-icon">+</span> Nuevo turno
      </button>

      {mounted && dragging && createPortal(
        <div
          style={{
            position: 'fixed', left: dragging.x - 60, top: dragging.y - 20, width: 120, pointerEvents: 'none', zIndex: 500,
            background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700,
            boxShadow: '0 8px 20px rgba(0,0,0,.3)', textAlign: 'center',
          }}
        >
          {dragging.label}
        </div>,
        document.body
      )}

      {mounted && modal && createPortal(modal, document.body)}
    </div>
  );
}
