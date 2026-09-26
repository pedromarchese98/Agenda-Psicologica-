'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, X, Unlock, Calendar, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { updateAttendance, updatePayment, rescheduleAppointment, deleteAppointment } from './actions';

const ATTENDANCE_OPTIONS = [
  { key: 'yes', label: 'Asistió', icon: Check },
  { key: 'no', label: 'No asistió', icon: X },
  { key: 'no-free', label: 'Canceló', icon: Unlock },
];
const PAYMENT_OPTIONS_BILLABLE = [
  { key: 'paid', label: 'Pagó' },
  { key: 'unpaid', label: 'No pagó' },
];
const PAYMENT_OPTIONS_CANCELLED = [
  { key: 'paid', label: 'Pagó' },
  { key: 'na', label: 'No corresponde' },
];
const METHOD_OPTIONS = [
  { key: 'transfer', label: 'Transferencia' },
  { key: 'cash', label: 'Efectivo' },
];
const PAYMENT_DISPLAY = { pending: 'Pago pendiente', paid: 'Pagó', unpaid: 'No pagó', na: 'No corresponde' };

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
    setLocal((prev) => ({ ...prev, attendance: key, payment: 'pending', payment_method: 'none' }));
    startTransition(() => { updateAttendance(local.id, key); });
  }

  function setPayment(key) {
    if (navigator.vibrate) navigator.vibrate(6);
    setLocal((prev) => ({ ...prev, payment: key, payment_method: key === 'paid' ? prev.payment_method : 'none' }));
    startTransition(() => { updatePayment(local.id, key, key === 'paid' ? (local.payment_method !== 'none' ? local.payment_method : 'transfer') : 'none'); });
  }

  function setMethod(key) {
    if (navigator.vibrate) navigator.vibrate(6);
    setLocal((prev) => ({ ...prev, payment_method: key }));
    startTransition(() => { updatePayment(local.id, 'paid', key); });
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
        background: hasConflict ? 'var(--rose-tint)' : undefined,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? 13 : 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
            {local.time?.slice(0, 5)} · {patientName}
            {hasConflict && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--rose)', fontWeight: 700 }}>
                <AlertTriangle size={11} /> Superpuesto
              </span>
            )}
          </div>
          {!compact && (
            <div style={{ fontSize: 12, color: 'var(--text-md)', marginTop: 2 }}>
              {local.modality === 'virtual' ? 'Virtual' : 'Presencial'} · {fmt$(local.price)} · {PAYMENT_DISPLAY[local.payment] || ''}
            </div>
          )}
        </div>
        {open ? <ChevronUp size={14} color="var(--text-lt)" /> : <ChevronDown size={14} color="var(--text-lt)" />}
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          {hasConflict && conflictWith && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--rose)', margin: 0, fontWeight: 700 }}>
              <AlertTriangle size={12} /> Se superpone con el turno de {conflictWith.patients ? `${conflictWith.patients.first_name} ${conflictWith.patients.last_name || ''}`.trim() : 'otro paciente'} a las {conflictWith.time?.slice(0, 5)}.
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ATTENDANCE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key} onClick={() => setAttendance(key)} className="btn pressable"
                style={{ fontSize: 12, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5, background: local.attendance === key ? 'var(--navy)' : 'var(--surface)', color: local.attendance === key ? '#fff' : 'var(--text)' }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {(local.attendance === 'yes' || local.attendance === 'no') && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_OPTIONS_BILLABLE.map(({ key, label }) => (
                <button
                  key={key} onClick={() => setPayment(key)} className="btn pressable"
                  style={{ fontSize: 12, padding: '7px 10px', background: local.payment === key ? 'var(--teal)' : 'var(--surface)', color: local.payment === key ? 'var(--navy)' : 'var(--text)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {local.attendance === 'no-free' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_OPTIONS_CANCELLED.map(({ key, label }) => (
                <button
                  key={key} onClick={() => setPayment(key)} className="btn pressable"
                  style={{ fontSize: 12, padding: '7px 10px', background: local.payment === key ? 'var(--teal)' : 'var(--surface)', color: local.payment === key ? 'var(--navy)' : 'var(--text)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {local.payment === 'paid' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {METHOD_OPTIONS.map(({ key, label }) => (
                <button
                  key={key} onClick={() => setMethod(key)} className="btn pressable"
                  style={{ fontSize: 12, padding: '7px 10px', background: local.payment_method === key ? 'var(--navy)' : 'var(--surface)', color: local.payment_method === key ? '#fff' : 'var(--text)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {!reschedOpen ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setReschedOpen(true)} className="btn btn-secondary pressable" style={{ fontSize: 12, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Calendar size={13} /> Reprogramar
              </button>
              <button onClick={handleDelete} className="btn btn-destructive pressable" style={{ fontSize: 12, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Trash2 size={13} /> Eliminar turno
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
