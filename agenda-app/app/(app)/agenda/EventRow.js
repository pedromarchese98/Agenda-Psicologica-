'use client';

import { useEffect, useState, useTransition } from 'react';
import { Calendar, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { updateEventPayment, rescheduleAppointment, deleteEventConfirmed } from './actions';

const PAYMENT_LABEL = { pending: 'Pendiente', paid: 'Pagó', na: 'No corresponde' };

// Evento (reunión, colegio, supervisión…): bloque gris con borde de estado tenue.
export default function EventRow({ event, compact }) {
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

  const isPaid = Number(local.price) > 0;

  return (
    <div className="event-row">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {!compact && `${local.time?.slice(0, 5)} · `}{local.title}
          {isPaid && <span style={{ color: 'var(--text-lt)' }}> · {PAYMENT_LABEL[local.payment] || ''}</span>}
        </span>
        {open ? <ChevronUp size={13} color="var(--text-lt)" /> : <ChevronDown size={13} color="var(--text-lt)" />}
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--border)' }}>
          {isPaid && (
            <div className="chip-row">
              {Object.entries(PAYMENT_LABEL).map(([key, label]) => (
                <button key={key} onClick={() => setPayment(key)} className={`chip chip-sm pressable${local.payment === key ? ' on' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {!reschedOpen ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setReschedOpen(true)} className="mini-btn pressable" style={{ background: 'var(--card)' }}>
                <Calendar size={12} /> Reprogramar
              </button>
              <button onClick={handleDelete} className="mini-btn danger pressable">
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: 7, fontSize: 12 }} />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ padding: 7, fontSize: 12 }} />
              <button onClick={saveReschedule} className="btn btn-primary btn-sm pressable">Guardar</button>
              <button onClick={() => setReschedOpen(false)} className="btn btn-secondary btn-sm pressable">Cancelar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
