'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateAttendance, updatePayment, rescheduleAppointment, deleteAppointment } from './actions';

const ATTENDANCE_LABEL = {
  pending: '⏳ Pendiente',
  yes: '✅ Asistió',
  no: '❌ No asistió',
  'no-free': '🔓 Canceló (libera horario)',
};
const PAYMENT_LABEL = {
  pending: 'Pago pendiente',
  paid: '✓ Pagó',
  unpaid: '⚠ Debe',
  na: '— No corresponde',
};

function borderColorFor(a, hasConflict) {
  if (hasConflict) return '#C62828';
  if (a.attendance === 'no-free') return '#C2454F';
  if (a.attendance === 'no') return '#8A93A8';
  if (a.payment === 'paid') return '#2E9C6A';
  if (a.payment === 'unpaid') return '#D98A22';
  if (a.attendance === 'yes') return '#1E88A8';
  return '#3B6FD9';
}

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

export default function AppointmentRow({ appt, compact, hasConflict, conflictWith }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(appt);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [newDate, setNewDate] = useState(appt.date);
  const [newTime, setNewTime] = useState(appt.time?.slice(0, 5));

  useEffect(() => setLocal(appt), [appt]);

  const patientName = local.patients
    ? `${local.patients.first_name}${local.patients.last_name ? ' ' + local.patients.last_name : ''}`
    : 'Paciente';

  function setAttendance(key) {
    if (navigator.vibrate) navigator.vibrate(6);
    setLocal((prev) => ({
      ...prev, attendance: key,
      ...(key === 'no-free' ? { payment: 'na', payment_method: 'none' } : {}),
    }));
    startTransition(() => { updateAttendance(local.id, key); });
  }

  function setPayment(key) {
    if (navigator.vibrate) navigator.vibrate(6);
    setLocal((prev) => ({ ...prev, payment: key, payment_method: key === 'paid' ? 'transfer' : 'none' }));
    startTransition(() => { updatePayment(local.id, key, key === 'paid' ? 'transfer' : 'none'); });
  }

  function saveReschedule() {
    setLocal((prev) => ({ ...prev, date: newDate, time: newTime }));
    startTransition(() => { rescheduleAppointment(local.id, newDate, newTime); });
    setReschedOpen(false);
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar el turno de ${patientName} del ${local.date}?`)) return;
    startTransition(() => { deleteAppointment(local.id); });
  }

  return (
    <div
      className="card pressable"
      style={{
        borderLeft: `5px solid ${borderColorFor(local, hasConflict)}`,
        padding: compact ? '8px 10px' : '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
        background: hasConflict ? '#FFF6F6' : undefined,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? 13 : 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {local.time?.slice(0, 5)} · {patientName}
            {hasConflict && <span style={{ marginLeft: 6, fontSize: 11, color: '#C62828', fontWeight: 800 }}>⚠️ Superpuesto</span>}
          </div>
          {!compact && (
            <div style={{ fontSize: 12, color: 'var(--text-md)', marginTop: 2 }}>
              {local.modality === 'virtual' ? '💻 Virtual' : '🏠 Presencial'} · {fmt$(local.price)} · {ATTENDANCE_LABEL[local.attendance]}
            </div>
          )}
        </div>
        <span style={{ color: 'var(--text-lt)', fontSize: 12, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          {hasConflict && conflictWith && (
            <p style={{ fontSize: 11, color: '#C62828', margin: 0, fontWeight: 700 }}>
              ⚠️ Se superpone con el turno de {conflictWith.patients ? `${conflictWith.patients.first_name} ${conflictWith.patients.last_name || ''}`.trim() : 'otro paciente'} a las {conflictWith.time?.slice(0, 5)}.
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(ATTENDANCE_LABEL).map(([key, label]) => (
              <button
                key={key} onClick={() => setAttendance(key)} className="btn pressable"
                style={{ fontSize: 12, padding: '7px 10px', background: local.attendance === key ? 'var(--navy)' : 'var(--surface)', color: local.attendance === key ? '#fff' : 'var(--text)' }}
              >
                {label}
              </button>
            ))}
            {local.attendance !== 'no-free' &&
              Object.entries(PAYMENT_LABEL).map(([key, label]) => (
                <button
                  key={key} onClick={() => setPayment(key)} className="btn pressable"
                  style={{ fontSize: 12, padding: '7px 10px', background: local.payment === key ? 'var(--teal)' : 'var(--surface)', color: local.payment === key ? 'var(--navy)' : 'var(--text)' }}
                >
                  {label}
                </button>
              ))}
          </div>

          {!reschedOpen ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setReschedOpen(true)} className="btn btn-secondary pressable" style={{ fontSize: 12, flex: 1 }}>
                📆 Reprogramar
              </button>
              <button onClick={handleDelete} className="btn pressable" style={{ fontSize: 12, flex: 1, background: '#FFEBEE', color: 'var(--rose)' }}>
                🗑 Eliminar turno
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'var(--surface)', padding: 8, borderRadius: 8 }}>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                style={{ padding: 7, borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }} />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                style={{ padding: 7, borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }} />
              <button onClick={saveReschedule} className="btn btn-primary pressable" style={{ fontSize: 12, padding: '7px 10px' }}>
                Guardar
              </button>
              <button onClick={() => setReschedOpen(false)} className="btn btn-secondary pressable" style={{ fontSize: 12, padding: '7px 10px' }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
