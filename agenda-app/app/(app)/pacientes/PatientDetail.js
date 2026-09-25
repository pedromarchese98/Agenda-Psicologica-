'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatientStatus, addNote, deleteFutureAppointments, changeFutureSchedule, deletePatient, applyPriceChange } from './actions';
import { registerPayment } from '../analisis/actions';

const STATUS = {
  active: { label: 'Activo en tratamiento', badge: 'badge-teal', color: 'var(--teal-dk)' },
  paused: { label: 'Pausado (viaje/licencia)', badge: 'badge-amber', color: 'var(--amber)' },
  suspended: { label: 'Suspendido', badge: 'badge-amber', color: 'var(--amber)' },
  abandoned: { label: 'Abandonó', badge: 'badge-rose', color: 'var(--rose)' },
  discharged: { label: 'Alta', badge: 'badge-violet', color: 'var(--violet)' },
  referred: { label: 'Derivado', badge: 'badge-blue', color: '#3B6FD9' },
};

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

export default function PatientDetail({ patient, notes, upcoming, stats, priceVirtual, pricePresencial, pendingPayments = [] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [payPending, startPayTransition] = useTransition();
  const [localPending, setLocalPending] = useState(pendingPayments);
  const [openPayId, setOpenPayId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('transfer');
  const [noteText, setNoteText] = useState('');
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState(null);
  const [editingModality, setEditingModality] = useState(null); // 'virtual' | 'presencial' | null
  const [priceValue, setPriceValue] = useState(0);
  const [freqOpen, setFreqOpen] = useState(false);
  const [freqDate, setFreqDate] = useState(upcoming[0]?.date || todayStr());
  const [freqTime, setFreqTime] = useState(upcoming[0]?.time?.slice(0, 5) || '10:00');
  const [freqValue, setFreqValue] = useState('weekly');
  const [freqModality, setFreqModality] = useState(upcoming[0]?.modality || 'virtual');
  const [freqPrice, setFreqPrice] = useState(upcoming[0]?.price || 0);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fullName = `${patient.first_name}${patient.last_name ? ' ' + patient.last_name : ''}`;
  const st = STATUS[patient.status] || STATUS.active;

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function handleDeletePatient() {
    startTransition(async () => {
      await deletePatient(patient.id);
      router.push('/pacientes');
    });
  }

  function todayStr2() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function savePrice() {
    startTransition(async () => {
      await applyPriceChange([patient.id], parseFloat(priceValue) || 0, todayStr2(), editingModality);
      setEditingModality(null);
      router.refresh();
    });
  }

  function remaining(d) {
    return (Number(d.price) || 0) - (Number(d.amount_paid) || 0);
  }

  function handleRegisterPayment(debt) {
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    setLocalPending((prev) => {
      const updated = prev.map((d) => (d.id === debt.id ? { ...d, amount_paid: (Number(d.amount_paid) || 0) + amount } : d));
      return updated.filter((d) => remaining(d) > 0.01);
    });
    startPayTransition(() => registerPayment(debt.id, amount, payMethod));
    setOpenPayId(null);
    setPayAmount('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: 'var(--teal-tint)', color: 'var(--teal-dk)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0,
        }}>
          {(patient.first_name?.[0] || '?') + (patient.last_name?.[0] || '')}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 19 }}>{fullName}</h2>
          <span className={`badge ${st.badge}`} style={{ marginTop: 4 }}>{st.label}</span>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Estadísticas históricas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div><div style={{ fontSize: 18, fontWeight: 800 }}>{stats.total}</div><div style={{ fontSize: 10, color: 'var(--text-lt)' }}>Turnos pasados</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sage)' }}>{stats.attendanceRate}%</div><div style={{ fontSize: 10, color: 'var(--text-lt)' }}>Asistencia</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--rose)' }}>{stats.cancelled}</div><div style={{ fontSize: 10, color: 'var(--text-lt)' }}>Cancelaciones</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sage)' }}>{fmt$(stats.paid)}</div><div style={{ fontSize: 10, color: 'var(--text-lt)' }}>Recaudado</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: stats.debt > 0 ? 'var(--amber)' : 'var(--text-lt)' }}>{fmt$(stats.debt)}</div><div style={{ fontSize: 10, color: 'var(--text-lt)' }}>Debe</div></div>
        </div>
      </div>

      {localPending.length > 0 && (
        <div className="card" style={{ padding: 14, border: '1px solid var(--amber-tint)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 10 }}>
            Pagos pendientes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {localPending.map((d) => {
              const rem = remaining(d);
              const isOpenPay = openPayId === d.id;
              return (
                <div key={d.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '9px 11px' }}>
                  <div
                    onClick={() => { setOpenPayId(isOpenPay ? null : d.id); setPayAmount(rem.toString()); }}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, cursor: 'pointer' }}
                  >
                    <span style={{ color: 'var(--text-md)' }}>{d.date} · {d.time?.slice(0, 5)}</span>
                    <strong style={{ color: 'var(--amber)' }}>{fmt$(rem)}</strong>
                  </div>
                  {isOpenPay && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      <input
                        type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                        style={{ flex: 1, minWidth: 90, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}
                      />
                      <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                        style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                        <option value="transfer">Transferencia</option>
                        <option value="cash">Efectivo</option>
                      </select>
                      <button className="btn btn-primary pressable" style={{ fontSize: 12, padding: '8px 11px' }} onClick={() => handleRegisterPayment(d)} disabled={payPending}>
                        Registrar pago
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Precio de sesión
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'virtual', label: 'Virtual', price: priceVirtual },
            { key: 'presencial', label: 'Presencial', price: pricePresencial },
          ].map(({ key, label, price }) => (
            <div key={key}>
              {editingModality !== key ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-md)', fontWeight: 600 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 17, fontWeight: 800 }}>{price != null ? fmt$(price) : '—'}</span>
                    <button onClick={() => { setPriceValue(price || 0); setEditingModality(key); }} className="btn btn-secondary pressable" style={{ fontSize: 11, padding: '5px 9px' }}>
                      Editar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-md)', width: 70 }}>{label}</span>
                  <input type="number" value={priceValue} onChange={(e) => setPriceValue(e.target.value)}
                    style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)' }} autoFocus />
                  <button onClick={savePrice} className="btn btn-primary pressable" style={{ fontSize: 12 }} disabled={isPending}>Guardar</button>
                  <button onClick={() => setEditingModality(null)} className="btn btn-secondary pressable" style={{ fontSize: 12 }}>Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '10px 0 0' }}>
          Se aplica a los turnos futuros de esa modalidad, desde hoy. Para cambiarlo desde otra fecha o a varios pacientes a la vez, usá el botón "Precios" en la lista de Pacientes.
        </p>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Estado del tratamiento
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <button
              key={key} className="btn pressable" disabled={isPending}
              onClick={() => startTransition(() => updatePatientStatus(patient.id, key))}
              style={{ fontSize: 12, padding: '7px 11px', background: patient.status === key ? s.color : 'var(--surface)', color: patient.status === key ? '#fff' : 'var(--text)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Próximos turnos ({upcoming.length})
        </div>
        {upcoming.length === 0 ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin turnos futuros agendados.</p>
            {patient.status === 'active' && (
              <p style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600, margin: '8px 0 0' }}>
                ⚠️ Este paciente está activo pero no tiene ningún horario fijo asignado. Fijá uno abajo en "Frecuencia del tratamiento".
              </p>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.slice(0, 6).map((a) => (
              <div key={a.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.date} · {a.time?.slice(0, 5)}</span>
                <span style={{ color: 'var(--text-lt)' }}>{fmt$(a.price)}</span>
              </div>
            ))}
          </div>
        )}
        {upcoming.length > 0 && !closing && (
          <button onClick={() => setClosing(true)} className="btn btn-secondary pressable" style={{ marginTop: 12, width: '100%', fontSize: 13, color: 'var(--rose)' }}>
            🗓 Cerrar tratamiento (borrar turnos futuros)
          </button>
        )}
        {closing && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <p style={{ fontSize: 13, marginTop: 0 }}>¿Por qué se cierra el tratamiento?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['abandoned', 'suspended', 'discharged', 'referred'].map((key) => (
                <button key={key} className="btn pressable" onClick={() => setReason(key)}
                  style={{ fontSize: 12, padding: '7px 11px', background: reason === key ? 'var(--navy)' : 'var(--surface)', color: reason === key ? '#fff' : 'var(--text)' }}>
                  {STATUS[key].label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => setClosing(false)}>Cancelar</button>
              <button
                className="btn pressable" style={{ flex: 1, background: 'var(--rose)', color: '#fff' }} disabled={!reason}
                onClick={() => startTransition(async () => {
                  await deleteFutureAppointments(patient.id, todayStr());
                  if (reason) await updatePatientStatus(patient.id, reason);
                  setClosing(false); setReason(null);
                })}
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Día, horario y frecuencia
        </div>
        {!freqOpen ? (
          <button onClick={() => setFreqOpen(true)} className="btn btn-secondary pressable" style={{ width: '100%', fontSize: 13 }}>
            🔁 Cambiar día/horario/frecuencia desde una fecha
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-md)', margin: 0 }}>
              Ej: "de acá en más, los miércoles a las 10:00, semanal" — elegí el primer miércoles en el campo "Desde".
              Se borran los turnos futuros de este paciente y se generan de nuevo con estos datos. El historial pasado no se toca.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Desde</label>
                <input type="date" value={freqDate} onChange={(e) => setFreqDate(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Hora</label>
                <input type="time" value={freqTime} onChange={(e) => setFreqTime(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Modalidad</label>
                <select value={freqModality} onChange={(e) => setFreqModality(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                  <option value="virtual">💻 Virtual</option>
                  <option value="presencial">🏠 Presencial</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Precio</label>
                <input type="number" value={freqPrice} onChange={(e) => setFreqPrice(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Nueva frecuencia</label>
              <select value={freqValue} onChange={(e) => setFreqValue(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => setFreqOpen(false)}>Cancelar</button>
              <button className="btn btn-primary pressable" style={{ flex: 1 }}
                onClick={() => startTransition(async () => {
                  await changeFutureSchedule(patient.id, freqDate, freqTime, freqValue, freqModality, parseFloat(freqPrice) || 0);
                  setFreqOpen(false);
                })}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Notas clínicas
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {notes.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin notas todavía.</p>}
          {notes.map((n) => (
            <div key={n.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-lt)', marginBottom: 4 }}>{new Date(n.created_at).toLocaleString('es-AR')}</div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{n.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Nueva nota…"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', minHeight: 44, resize: 'vertical' }} />
          <button className="btn btn-primary pressable" onClick={() => startTransition(async () => { await addNote(patient.id, noteText); setNoteText(''); })}>
            Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14, border: '1px solid var(--rose-tint)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', textTransform: 'uppercase', marginBottom: 10 }}>
          Zona de riesgo
        </div>
        {!deleteOpen ? (
          <button onClick={() => setDeleteOpen(true)} className="btn pressable" style={{ width: '100%', fontSize: 13, background: 'var(--rose-tint)', color: 'var(--rose)' }}>
            🗑 Eliminar paciente permanentemente
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-md)', margin: 0 }}>
              Esto borra a <strong>{fullName}</strong> y todos sus turnos y notas, sin posibilidad de deshacerlo. Útil si se cargó por error.
              Escribí <strong>{patient.first_name}</strong> para confirmar.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={patient.first_name}
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}>
                Cancelar
              </button>
              <button
                className="btn pressable" style={{ flex: 1, background: 'var(--rose)', color: '#fff' }}
                disabled={deleteConfirmText.trim().toLowerCase() !== patient.first_name.trim().toLowerCase() || isPending}
                onClick={handleDeletePatient}
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
