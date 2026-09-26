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

// Borde de estado: confirmado (teal), superpuesto (rojo), debe pago (ámbar), cancelado / ausente (tenue).
function borderColorFor(a, hasConflict) {
  if (hasConflict) return 'var(--danger)';
  if (a.attendance === 'no-free' || a.attendance === 'no') return 'var(--text-lt)';
  if (a.payment === 'unpaid') return 'var(--warning)';
  return 'var(--teal-dk)';
}

const METHOD_LABEL = { transfer: 'Transferencia', cash: 'Efectivo' };

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

  const attendanceLabel = local.attendance === 'no-free' ? 'Canceló' : local.attendance === 'no' ? 'No asistió' : null;
  const paymentText = local.payment === 'paid' && METHOD_LABEL[local.payment_method]
    ? `Pagó · ${METHOD_LABEL[local.payment_method]}`
    : PAYMENT_DISPLAY[local.payment] || '';

  return (
    <div
      className={`appt${hasConflict ? ' conflict' : ''}`}
      style={{ borderLeftColor: borderColorFor(local, hasConflict) }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="appt-name">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {local.time?.slice(0, 5)} · {patientName}
            </span>
            {hasConflict && (
              <span className="warn-chip"><AlertTriangle size={10} />{!compact && ' Superpuesto'}</span>
            )}
          </div>
          {!compact && (
            <div className="appt-sub">
              {local.modality === 'virtual' ? 'Virtual' : 'Presencial'} · {fmt$(local.price)} · {attendanceLabel ? `${attendanceLabel} · ` : ''}{paymentText}
              {hasConflict && conflictWith && !open && (
                <> · Se superpone con {conflictWith.patients ? `${conflictWith.patients.first_name} ${conflictWith.patients.last_name || ''}`.trim() : 'otro turno'} a las {conflictWith.time?.slice(0, 5)}</>
              )}
            </div>
          )}
        </div>
        {open ? <ChevronUp size={14} color="var(--text-lt)" /> : <ChevronDown size={14} color="var(--text-lt)" />}
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--border-soft)' }}>
          {hasConflict && conflictWith && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--danger)', margin: 0, fontWeight: 700 }}>
              <AlertTriangle size={12} /> Se superpone con el turno de {conflictWith.patients ? `${conflictWith.patients.first_name} ${conflictWith.patients.last_name || ''}`.trim() : 'otro paciente'} a las {conflictWith.time?.slice(0, 5)}.
            </p>
          )}
          <div className="chip-row">
            {ATTENDANCE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setAttendance(key)} aria-pressed={local.attendance === key}
                className={`chip chip-sm pressable${local.attendance === key ? ' on' : ''}`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {(local.attendance === 'yes' || local.attendance === 'no') && (
            <div className="chip-row">
              {PAYMENT_OPTIONS_BILLABLE.map(({ key, label }) => (
                <button key={key} onClick={() => setPayment(key)} aria-pressed={local.payment === key}
                  className={`chip chip-sm pressable${local.payment === key ? ' on pay' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {local.attendance === 'no-free' && (
            <div className="chip-row">
              {PAYMENT_OPTIONS_CANCELLED.map(({ key, label }) => (
                <button key={key} onClick={() => setPayment(key)} aria-pressed={local.payment === key}
                  className={`chip chip-sm pressable${local.payment === key ? ' on pay' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {local.payment === 'paid' && (
            <div className="chip-row">
              {METHOD_OPTIONS.map(({ key, label }) => (
                <button key={key} onClick={() => setMethod(key)} aria-pressed={local.payment_method === key}
                  className={`chip chip-sm pressable${local.payment_method === key ? ' on' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {!reschedOpen ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button onClick={() => setReschedOpen(true)} className="mini-btn pressable">
                <Calendar size={12} /> Reprogramar
              </button>
              <button onClick={handleDelete} className="mini-btn danger pressable">
                <Trash2 size={12} /> Eliminar turno
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'var(--muted)', padding: 8, borderRadius: 10 }}>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: 7, fontSize: 12 }} />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ padding: 7, fontSize: 12 }} />
              <button onClick={saveReschedule} className="btn btn-primary btn-sm pressable">Guardar</button>
              <button onClick={() => setReschedOpen(false)} className="btn btn-outline btn-sm pressable">Cancelar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
