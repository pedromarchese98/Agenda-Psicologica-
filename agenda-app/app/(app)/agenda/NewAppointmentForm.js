'use client';

import { useState } from 'react';
import { createAppointment } from './actions';

export default function NewAppointmentForm({ defaultDate }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setOpen(true)}>
        + Nuevo turno
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 50,
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <form
            action={async (formData) => {
              await createAppointment(formData);
              setOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              padding: '20px 20px calc(20px + var(--safe-bottom))',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 4px' }} />
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
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
