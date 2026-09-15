'use client';

import { useState, useTransition } from 'react';
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

export default function AppointmentRow({ appt }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const patientName = appt.patients
    ? `${appt.patients.first_name}${appt.patients.last_name ? ' ' + appt.patients.last_name : ''}`
    : 'Paciente';

  return (
    <div
      className="card"
      style={{
        borderLeft: `5px solid ${borderColorFor(appt)}`,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {appt.time?.slice(0, 5)} · {patientName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-md)', marginTop: 2 }}>
            {appt.modality === 'virtual' ? '💻 Virtual' : '🏠 Presencial'} · {fmt$(appt.price)} ·{' '}
            {ATTENDANCE_LABEL[appt.attendance]}
          </div>
        </div>
        <span style={{ color: 'var(--text-lt)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          {Object.entries(ATTENDANCE_LABEL).map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                startTransition(() => {
                  updateAttendance(appt.id, key);
                })
              }
              className="btn"
              style={{
                fontSize: 12,
                padding: '7px 10px',
                background: appt.attendance === key ? 'var(--navy)' : 'var(--surface)',
                color: appt.attendance === key ? '#fff' : 'var(--text)',
              }}
            >
              {label}
            </button>
          ))}
          {appt.attendance !== 'no-free' && (
            <>
              {Object.entries(PAYMENT_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() =>
                    startTransition(() => {
                      updatePayment(appt.id, key, key === 'paid' ? 'transfer' : 'none');
                    })
                  }
                  className="btn"
                  style={{
                    fontSize: 12,
                    padding: '7px 10px',
                    background: appt.payment === key ? 'var(--teal)' : 'var(--surface)',
                    color: appt.payment === key ? 'var(--navy)' : 'var(--text)',
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
