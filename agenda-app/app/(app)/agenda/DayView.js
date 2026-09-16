'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AppointmentRow from './AppointmentRow';
import EventRow from './EventRow';
import { createAppointment } from './actions';

const HOUR_START = 7;
const HOUR_END = 20;

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function DayView({ dateStr, appointments, blocks, others, patients }) {
  const [modalTime, setModalTime] = useState(null); // null = cerrado
  const [closing, setClosing] = useState(false);
  const [formType, setFormType] = useState('patient');
  const [eventIsPaid, setEventIsPaid] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  function openModalAt(time) {
    setFormType('patient');
    setEventIsPaid(false);
    setModalTime(time);
  }

  function close() {
    setClosing(true);
    setTimeout(() => {
      setModalTime(null);
      setClosing(false);
    }, 220);
  }

  const modal = modalTime !== null && (
    <div
      onClick={close}
      className="sheet-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
    >
      <form
        action={async (formData) => {
          await createAppointment(formData);
          close();
        }}
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

        <select
          name="type"
          value={formType}
          onChange={(e) => setFormType(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
        >
          <option value="patient">👤 Turno con paciente</option>
          <option value="other">📌 Evento (reunión, colegio, etc.)</option>
          <option value="block">🚫 Bloquear horario</option>
        </select>

        {formType === 'patient' && (
          <>
            <input
              name="name"
              placeholder="Nombre del paciente (o elegí uno existente)"
              list="patients-datalist"
              required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
            />
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
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', display: 'block', marginBottom: 4 }}>
                Frecuencia
              </label>
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
          <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {hours
          .filter((h) => !blocks.some((b) => b.time?.startsWith(pad(h) + ':')))
          .map((h) => {
          const hourStr = pad(h);
          const apptsInHour = appointments.filter((a) => a.time?.startsWith(hourStr + ':'));
          const othersInHour = others.filter((o) => o.time?.startsWith(hourStr + ':'));
          const isFree = apptsInHour.length === 0 && othersInHour.length === 0;

          return (
            <div key={h} style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', padding: '8px 0', minHeight: 56 }}>
              <div style={{ width: 40, fontSize: 11, color: 'var(--text-lt)', flexShrink: 0, paddingTop: 2 }}>{hourStr}:00</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {apptsInHour.map((appt) => (
                  <AppointmentRow key={appt.id} appt={appt} compact />
                ))}
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

      <button className="fab pressable" onClick={() => openModalAt(pad(new Date().getHours()) + ':00')} aria-label="Nuevo turno">
        +
      </button>

      {mounted && modal && createPortal(modal, document.body)}
    </div>
  );
}
