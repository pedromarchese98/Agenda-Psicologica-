'use client';

import { useRef, useState } from 'react';
import AppointmentRow from './AppointmentRow';
import { createAppointment } from './actions';

const HOUR_START = 7;
const HOUR_END = 20;
const HOUR_PX = 68;

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return (h - HOUR_START) * 60 + m;
}
function pad(n) {
  return String(n).padStart(2, '0');
}

export default function DayView({ dateStr, appointments }) {
  const gridRef = useRef(null);
  const [modalTime, setModalTime] = useState(null); // null = cerrado
  const [closing, setClosing] = useState(false);

  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);
  const totalHeight = hours.length * HOUR_PX;

  function timeFromClickY(y) {
    let minutesFromStart = Math.max(0, Math.round((y / HOUR_PX) * 60 / 30) * 30);
    const totalMinutes = HOUR_START * 60 + minutesFromStart;
    const h = Math.min(HOUR_END, Math.floor(totalMinutes / 60));
    const m = totalMinutes % 60;
    return `${pad(h)}:${pad(m)}`;
  }

  function handleGridClick(e) {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    setModalTime(timeFromClickY(e.clientY - rect.top));
  }

  function close() {
    setClosing(true);
    setTimeout(() => {
      setModalTime(null);
      setClosing(false);
    }, 220);
  }

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      <div
        ref={gridRef}
        onClick={handleGridClick}
        style={{ position: 'relative', height: totalHeight, cursor: 'pointer' }}
      >
        {hours.map((h, i) => (
          <div
            key={h}
            style={{
              position: 'absolute', top: i * HOUR_PX, left: 0, right: 0, height: HOUR_PX,
              borderTop: '1px solid var(--border)', display: 'flex', pointerEvents: 'none',
            }}
          >
            <span style={{ width: 46, fontSize: 11, color: 'var(--text-lt)', transform: 'translateY(-7px)', flexShrink: 0 }}>
              {pad(h)}:00
            </span>
          </div>
        ))}

        {appointments.map((appt) => {
          const startMin = Math.max(0, timeToMinutes(appt.time?.slice(0, 5)));
          const top = (startMin / 60) * HOUR_PX + 2;
          const height = Math.max(46, (48 / 60) * HOUR_PX);
          return (
            <div
              key={appt.id}
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'absolute', top, left: 52, right: 2, minHeight: height, zIndex: 5 }}
            >
              <AppointmentRow appt={appt} compact />
            </div>
          );
        })}
      </div>

      {appointments.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-lt)', fontSize: 12, marginTop: 14 }}>
          Tocá cualquier horario libre para agendar, o deslizá ↔ para cambiar de día.
        </p>
      )}

      <button className="fab pressable" onClick={() => setModalTime(pad(new Date().getHours()) + ':00')} aria-label="Nuevo turno">
        +
      </button>

      {modalTime !== null && (
        <div
          onClick={close}
          className="sheet-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
        >
          <form
            action={async (formData) => {
              await createAppointment(formData);
              close();
            }}
            onClick={(e) => e.stopPropagation()}
            className={`card sheet-box${closing ? ' closing' : ''}`}
            style={{
              width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              padding: '10px 20px calc(20px + var(--safe-bottom))',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
            <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo turno</h3>

            <input name="name" placeholder="Nombre del paciente" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <input name="date" type="date" defaultValue={dateStr} required
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
              <input name="time" type="time" defaultValue={modalTime} required
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>

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
      )}
    </div>
  );
}
