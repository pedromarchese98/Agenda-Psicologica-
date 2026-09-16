'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateEventPayment, rescheduleAppointment, deleteEventConfirmed } from './actions';

const PAYMENT_LABEL = { pending: 'Pendiente', paid: '✓ Pagó', na: '— No corresponde' };

export default function EventRow({ event }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(event);
  const [newDate, setNewDate] = useState(event.date);
  const [newTime, setNewTime] = useState(event.time?.slice(0, 5));
  const [reschedOpen, setReschedOpen] = useState(false);

  useEffect(() => setLocal(event), [event]);

  function setPayment(key) {
    setLocal((p) => ({ ...p, payment: key }));
    startTransition(() => updateEventPayment(local.id, key, local.price || 0));
  }

  function saveReschedule() {
    setLocal((p) => ({ ...p, date: newDate, time: newTime }));
    startTransition(() => rescheduleAppointment(local.id, newDate, newTime));
    setReschedOpen(false);
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${local.title}"?`)) return;
    startTransition(() => deleteEventConfirmed(local.id));
  }

  return (
    <div
      className="card pressable"
      style={{
        border: '1px solid #D9CBF5', background: '#F1ECFB', borderRadius: 10,
        padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6A3FA0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📌 {local.time?.slice(0, 5)} · {local.title}
          {Number(local.price) > 0 && <span style={{ marginLeft: 6, color: '#8A5FC0' }}>· {PAYMENT_LABEL[local.payment] || ''}</span>}
        </div>
        <span style={{ color: '#8A5FC0', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6, borderTop: '1px solid #D9CBF5' }}>
          {Number(local.price) > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(PAYMENT_LABEL).map(([key, label]) => (
                <button
                  key={key} onClick={() => setPayment(key)} className="btn pressable"
                  style={{ fontSize: 11, padding: '6px 9px', background: local.payment === key ? '#6A3FA0' : '#fff', color: local.payment === key ? '#fff' : 'var(--text)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {!reschedOpen ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setReschedOpen(true)} className="btn btn-secondary pressable" style={{ fontSize: 11, flex: 1 }}>
                📆 Reprogramar
              </button>
              <button onClick={handleDelete} className="btn pressable" style={{ fontSize: 11, background: '#FFEBEE', color: 'var(--rose)', flex: 1 }}>
                🗑 Eliminar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }} />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }} />
              <button onClick={saveReschedule} className="btn btn-primary pressable" style={{ fontSize: 11, padding: '6px 9px' }}>Guardar</button>
              <button onClick={() => setReschedOpen(false)} className="btn btn-secondary pressable" style={{ fontSize: 11, padding: '6px 9px' }}>Cancelar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
