'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateAttendance, updatePayment } from './actions';

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

function borderColorFor(a) {
  if (a.attendance === 'no-free') return '#C2454F';
  if (a.attendance === 'no') return '#8A93A8';
  if (a.payment === 'paid') return '#2E9C6A';
  if (a.payment === 'unpaid') return '#D98A22';
  if (a.attendance === 'yes') return '#1E88A8';
  return '#3B6FD9';
}

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

export default function AppointmentRow({ appt, compact }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(appt);

  // Si el servidor trae datos más nuevos (revalidatePath), sincronizamos.
  useEffect(() => setLocal(appt), [appt]);

  const patientName = local.patients
    ? `${local.patients.first_name}${local.patients.last_name ? ' ' + local.patients.last_name : ''}`
    : 'Paciente';

  function setAttendance(key) {
    if (navigator.vibrate) navigator.vibrate(6);
    setLocal((prev) => ({
      ...prev,
      attendance: key,
      ...(key === 'no-free' ? { payment: 'na', payment_method: 'none' } : {}),
    }));
    startTransition(() => {
      updateAttendance(local.id, key);
    });
  }

  function setPayment(key) {
    if (navigator.vibrate) navigator.vibrate(6);
    setLocal((prev) => ({ ...prev, payment: key, payment_method: key === 'paid' ? 'transfer' : 'none' }));
    startTransition(() => {
      updatePayment(local.id, key, key === 'paid' ? 'transfer' : 'none');
    });
  }

  return (
    <div
      className="card pressable"
      style={{
        borderLeft: `5px solid ${borderColorFor(local)}`,
        padding: compact ? '8px 10px' : '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? 13 : 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {local.time?.slice(0, 5)} · {patientName}
          </div>
          {!compact && (
            <div style={{ fontSize: 12, color: 'var(--text-md)', marginTop: 2 }}>
              {local.modality === 'virtual' ? '💻 Virtual' : '🏠 Presencial'} · {fmt$(local.price)} ·{' '}
              {ATTENDANCE_LABEL[local.attendance]}
            </div>
          )}
        </div>
        <span style={{ color: 'var(--text-lt)', fontSize: 12, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          {Object.entries(ATTENDANCE_LABEL).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAttendance(key)}
              className="btn pressable"
              style={{
                fontSize: 12,
                padding: '7px 10px',
                background: local.attendance === key ? 'var(--navy)' : 'var(--surface)',
                color: local.attendance === key ? '#fff' : 'var(--text)',
              }}
            >
              {label}
            </button>
          ))}
          {local.attendance !== 'no-free' && (
            <>
              {Object.entries(PAYMENT_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPayment(key)}
                  className="btn pressable"
                  style={{
                    fontSize: 12,
                    padding: '7px 10px',
                    background: local.payment === key ? 'var(--teal)' : 'var(--surface)',
                    color: local.payment === key ? 'var(--navy)' : 'var(--text)',
                  }}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
