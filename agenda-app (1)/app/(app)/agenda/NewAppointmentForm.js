'use client';

import { useRef, useState } from 'react';
import { createAppointment } from './actions';

export default function NewAppointmentForm({ defaultDate }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef(null);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setDragY(0);
    }, 220);
  }

  function onHandleTouchStart(e) {
    dragStart.current = e.touches[0].clientY;
  }
  function onHandleTouchMove(e) {
    if (dragStart.current == null) return;
    const delta = e.touches[0].clientY - dragStart.current;
    if (delta > 0) setDragY(delta);
  }
  function onHandleTouchEnd() {
    if (dragY > 90) {
      close();
    } else {
      setDragY(0);
    }
    dragStart.current = null;
  }

  return (
    <>
      <button className="fab pressable" onClick={() => setOpen(true)} aria-label="Nuevo turno">
        +
      </button>

      {open && (
        <div
          onClick={close}
          className="sheet-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 50,
            display: 'flex', alignItems: 'flex-end',
          }}
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
              transform: dragY ? `translateY(${dragY}px)` : undefined,
              transition: dragStart.current ? 'none' : undefined,
            }}
          >
            <div
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
              style={{ padding: '10px 0 4px', margin: '0 -20px', cursor: 'grab' }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo turno</h3>

            <input name="name" placeholder="Nombre del paciente" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <input name="date" type="date" defaultValue={defaultDate} required
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
              <input name="time" type="time" required
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
    </>
  );
}
