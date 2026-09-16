'use client';

import { useState, useTransition } from 'react';
import { updatePatientStatus, addNote, deleteFutureAppointments, changeFutureSchedule } from './actions';

const STATUS = {
  active: { label: 'Activo en tratamiento', color: 'var(--teal-dk)', bg: '#E6F8F3' },
  paused: { label: 'Pausado (viaje/licencia)', color: 'var(--amber)', bg: '#FDF3E3' },
  suspended: { label: 'Suspendido', color: 'var(--amber)', bg: '#FDF3E3' },
  abandoned: { label: 'Abandonó', color: 'var(--rose)', bg: '#FCEBED' },
  discharged: { label: 'Alta', color: 'var(--violet)', bg: '#F1ECFB' },
  referred: { label: 'Derivado', color: '#3B6FD9', bg: '#E9F0FD' },
};

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

export default function PatientDetail({ patient, notes, upcoming, history }) {
  const [isPending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState('');
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState(null);
  const [freqOpen, setFreqOpen] = useState(false);
  const [freqDate, setFreqDate] = useState(upcoming[0]?.date || todayStr());
  const [freqTime, setFreqTime] = useState(upcoming[0]?.time?.slice(0, 5) || '10:00');
  const [freqValue, setFreqValue] = useState('weekly');
  const [freqModality, setFreqModality] = useState(upcoming[0]?.modality || 'virtual');
  const [freqPrice, setFreqPrice] = useState(upcoming[0]?.price || 0);

  const fullName = `${patient.first_name}${patient.last_name ? ' ' + patient.last_name : ''}`;
  const st = STATUS[patient.status] || STATUS.active;

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19 }}>{fullName}</h2>
        <span
          style={{
            display: 'inline-block', marginTop: 6, padding: '3px 11px', borderRadius: 20,
            fontSize: 12, fontWeight: 700, color: st.color, background: st.bg,
          }}
        >
          {st.label}
        </span>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Estado del tratamiento
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <button
              key={key}
              className="btn"
              disabled={isPending}
              onClick={() => startTransition(() => updatePatientStatus(patient.id, key))}
              style={{
                fontSize: 12, padding: '7px 11px',
                background: patient.status === key ? s.color : 'var(--surface)',
                color: patient.status === key ? '#fff' : 'var(--text)',
              }}
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
          <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin turnos futuros agendados.</p>
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
          <button
            onClick={() => setClosing(true)}
            className="btn btn-secondary pressable"
            style={{ marginTop: 12, width: '100%', fontSize: 13, color: 'var(--rose)' }}
          >
            🗓 Cerrar tratamiento (borrar turnos futuros)
          </button>
        )}
        {closing && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <p style={{ fontSize: 13, marginTop: 0 }}>¿Por qué se cierra el tratamiento?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['abandoned', 'suspended', 'discharged', 'referred'].map((key) => (
                <button
                  key={key}
                  className="btn"
                  onClick={() => setReason(key)}
                  style={{
                    fontSize: 12, padding: '7px 11px',
                    background: reason === key ? 'var(--navy)' : 'var(--surface)',
                    color: reason === key ? '#fff' : 'var(--text)',
                  }}
                >
                  {STATUS[key].label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setClosing(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: 'var(--rose)', color: '#fff' }}
                disabled={!reason}
                onClick={() =>
                  startTransition(async () => {
                    await deleteFutureAppointments(patient.id, todayStr());
                    if (reason) await updatePatientStatus(patient.id, reason);
                    setClosing(false);
                    setReason(null);
                  })
                }
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Frecuencia del tratamiento
        </div>
        {!freqOpen ? (
          <button onClick={() => setFreqOpen(true)} className="btn btn-secondary pressable" style={{ width: '100%', fontSize: 13 }}>
            🔁 Cambiar a semanal / quincenal desde una fecha
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-md)', margin: 0 }}>
              Se borran los turnos futuros de este paciente desde la fecha elegida y se generan de nuevo con la nueva frecuencia. El historial pasado no se toca.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Desde</label>
                <input type="date" value={freqDate} onChange={(e) => setFreqDate(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Hora</label>
                <input type="time" value={freqTime} onChange={(e) => setFreqTime(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Modalidad</label>
                <select value={freqModality} onChange={(e) => setFreqModality(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                  <option value="virtual">💻 Virtual</option>
                  <option value="presencial">🏠 Presencial</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Precio</label>
                <input type="number" value={freqPrice} onChange={(e) => setFreqPrice(e.target.value)}
                  style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-md)' }}>Nueva frecuencia</label>
              <select value={freqValue} onChange={(e) => setFreqValue(e.target.value)}
                style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => setFreqOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary pressable"
                style={{ flex: 1 }}
                onClick={() =>
                  startTransition(async () => {
                    await changeFutureSchedule(patient.id, freqDate, freqTime, freqValue, freqModality, parseFloat(freqPrice) || 0);
                    setFreqOpen(false);
                  })
                }
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
              <div style={{ fontSize: 11, color: 'var(--text-lt)', marginBottom: 4 }}>
                {new Date(n.created_at).toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{n.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Nueva nota…"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', minHeight: 44, resize: 'vertical' }}
          />
          <button
            className="btn btn-primary"
            onClick={() =>
              startTransition(async () => {
                await addNote(patient.id, noteText);
                setNoteText('');
              })
            }
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
