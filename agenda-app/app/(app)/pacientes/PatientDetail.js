'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, CalendarClock, Lock, Plus } from 'lucide-react';
import { updatePatientStatus, addNote, changeFutureSchedule, deletePatient, applyPriceChange } from './actions';

const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DOW_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const STATUS = {
  active: { chip: 'Activo', label: 'Activo en tratamiento', badge: 'badge-teal' },
  paused: { chip: 'Pausado', label: 'Pausado (viaje/licencia)', badge: 'badge-amber' },
  suspended: { chip: 'Suspendido', label: 'Suspendido', badge: 'badge-amber' },
  abandoned: { chip: 'Abandonó', label: 'Abandonó', badge: 'badge-rose' },
  discharged: { chip: 'Alta', label: 'Alta', badge: 'badge-violet' },
  referred: { chip: 'Derivado', label: 'Derivado', badge: 'badge-blue' },
};

const FREQ_LABEL = { weekly: 'Semanal', biweekly: 'Quincenal' };

const fmt$ = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return toISO(new Date()); }
function parse(dateStr) { return new Date(dateStr + 'T00:00:00'); }
// "2026-09-24" → "Jue 24/09"
function shortDate(dateStr) {
  const d = parse(dateStr);
  return `${DOW_SHORT[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
// Primera fecha >= fromDate que cae en el día de la semana `dow` (0 = domingo).
function firstOnOrAfter(fromDate, dow) {
  const d = parse(fromDate);
  for (let i = 0; i < 7 && d.getDay() !== dow; i++) d.setDate(d.getDate() + 1);
  return toISO(d);
}

export default function PatientDetail({ patient, notes, upcoming, stats, priceVirtual, pricePresencial }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(patient.status);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingModality, setEditingModality] = useState(null); // 'virtual' | 'presencial' | null
  const [priceValue, setPriceValue] = useState(0);
  const [priceDate, setPriceDate] = useState(todayStr());
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Nuevo encuadre (día, horario y frecuencia desde una fecha) ──
  const first = upcoming[0];
  const currentFreq = useMemo(() => {
    if (upcoming.length < 2) return null;
    const gap = (parse(upcoming[1].date) - parse(upcoming[0].date)) / 86400000;
    return gap === 7 ? 'weekly' : gap === 14 ? 'biweekly' : null;
  }, [upcoming]);
  const [freqOpen, setFreqOpen] = useState(false);
  const [freqFrom, setFreqFrom] = useState(first?.date || todayStr());
  const [freqDow, setFreqDow] = useState(first ? parse(first.date).getDay() : 1);
  const [freqTime, setFreqTime] = useState(first?.time?.slice(0, 5) || '10:00');
  const [freqValue, setFreqValue] = useState(currentFreq || 'weekly');
  const [freqModality, setFreqModality] = useState(first?.modality || 'virtual');
  const [freqPrice, setFreqPrice] = useState(first?.price || priceVirtual || 0);

  const fullName = `${patient.first_name}${patient.last_name ? ' ' + patient.last_name : ''}`;
  const st = STATUS[status] || STATUS.active;

  const currentSchedule = first
    ? `${DOW[parse(first.date).getDay()]} · ${first.time?.slice(0, 5)}${currentFreq ? ` · ${FREQ_LABEL[currentFreq]}` : ''}`
    : null;

  const freqStart = firstOnOrAfter(freqFrom, freqDow);
  const preview = useMemo(() => {
    const step = freqValue === 'biweekly' ? 14 : 7;
    const olds = upcoming.filter((a) => a.date >= freqFrom).slice(0, 3);
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const d = parse(freqStart);
      d.setDate(d.getDate() + i * step);
      rows.push({ old: olds[i] ? `${shortDate(olds[i].date)} · ${olds[i].time?.slice(0, 5)}` : null, next: `${shortDate(toISO(d))} · ${freqTime}` });
    }
    return rows;
  }, [upcoming, freqFrom, freqStart, freqTime, freqValue]);

  // Meses en tratamiento desde la primera sesión registrada.
  let treatmentDuration = null;
  if (stats.firstDate) {
    const start = parse(stats.firstDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    treatmentDuration = { months: Math.max(months, 0), sinceLabel: `${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}` };
  }

  function changeStatus(key) {
    if (key === status) return;
    if (key !== 'active' && upcoming.length > 0 &&
      !confirm(`Al pasar a "${STATUS[key].chip}" se liberan los ${upcoming.length} turnos futuros de ${patient.first_name}. ¿Continuar?`)) return;
    setStatus(key);
    startTransition(() => updatePatientStatus(patient.id, key));
  }

  function savePrice() {
    startTransition(async () => {
      await applyPriceChange([patient.id], parseFloat(priceValue) || 0, priceDate, editingModality);
      setEditingModality(null);
      router.refresh();
    });
  }

  function saveSchedule() {
    startTransition(async () => {
      await changeFutureSchedule(
        patient.id, freqFrom, freqTime, freqValue,
        first ? first.modality : freqModality,
        first ? Number(first.price) || 0 : parseFloat(freqPrice) || 0,
        freqStart,
      );
      setFreqOpen(false);
      router.refresh();
    });
  }

  function handleDeletePatient() {
    startTransition(async () => {
      await deletePatient(patient.id);
      router.push('/pacientes');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--teal-tint)', color: 'var(--teal-dk)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0,
        }}>
          {((patient.first_name?.[0] || '?') + (patient.last_name?.[0] || '')).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{fullName}</h2>
          <span className={`badge ${st.badge}`} style={{ fontSize: 10.5 }}>{st.label}</span>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="fcard">
        <div className="flabel">Estadísticas históricas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Stat value={stats.total} label="Turnos pasados" />
          <Stat value={`${stats.attendanceRate}%`} label="Asistencia" color="var(--teal-dk)" />
          <Stat value={stats.cancelled} label="Cancelaciones" color="var(--danger)" />
          <Stat value={fmt$(stats.paid)} label="Recaudado" color="var(--success-text)" />
          <Stat value={fmt$(stats.debt)} label="Debe" color={stats.debt > 0 ? 'var(--warning)' : 'var(--text-lt)'} />
          {treatmentDuration && (
            <Stat
              value={`${treatmentDuration.months} ${treatmentDuration.months === 1 ? 'mes' : 'meses'}`}
              label={`En sesión · desde ${treatmentDuration.sinceLabel}`}
            />
          )}
        </div>
      </div>

      {/* Precio por modalidad */}
      <div className="fcard">
        <div className="flabel">Precio de sesión</div>
        {[
          { key: 'virtual', label: 'Virtual', price: priceVirtual },
          { key: 'presencial', label: 'Presencial', price: pricePresencial },
        ].map(({ key, label, price }, i) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i ? '1px solid var(--border-soft)' : 'none' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-md)', fontWeight: 600 }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ fontSize: 15, fontWeight: 800 }}>{price != null ? fmt$(price) : '—'}</span>
              <button
                onClick={() => { setPriceValue(price || 0); setPriceDate(todayStr()); setEditingModality(key); }}
                className="pressable"
                style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--teal-dk)', background: 'var(--teal-tint)', padding: '4px 9px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
              >
                Editar
              </button>
            </div>
          </div>
        ))}
        {editingModality && (
          <div style={{ marginTop: 10, background: 'var(--muted)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Nuevo precio {editingModality}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label>
                <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>Monto</span>
                <input type="number" inputMode="numeric" value={priceValue} onChange={(e) => setPriceValue(e.target.value)} className="mono"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 14, fontWeight: 700 }} autoFocus />
              </label>
              <label>
                <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>Vigente desde</span>
                <input type="date" value={priceDate} onChange={(e) => setPriceDate(e.target.value)} className="mono"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 600 }} />
              </label>
            </div>
            <div className="warn-note" style={{ marginTop: 10 }}>
              <AlertCircle size={14} />
              <span>El nuevo precio se aplica a los turnos <b>desde esta fecha en adelante</b>. Los turnos anteriores mantienen su precio.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setEditingModality(null)} className="btn btn-outline pressable" style={{ flex: 1, fontSize: 12, padding: 9 }}>Cancelar</button>
              <button onClick={savePrice} className="btn btn-accent pressable" style={{ flex: 1, fontSize: 12, padding: 9, boxShadow: 'none' }} disabled={isPending}>Guardar precio</button>
            </div>
          </div>
        )}
        <p className="field-note" style={{ marginTop: 8 }}>Los cambios de precio rigen desde la fecha que elijas en adelante.</p>
      </div>

      {/* Estado del tratamiento */}
      <div className="fcard">
        <div className="flabel">Estado del tratamiento</div>
        <div className="chip-row" style={{ gap: 7 }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <button
              key={key}
              disabled={isPending}
              onClick={() => changeStatus(key)}
              aria-pressed={status === key}
              className={`chip chip-flat pressable${status === key ? ' on' : ''}`}
            >
              {s.chip}
            </button>
          ))}
        </div>
        <p className="field-note" style={{ marginTop: 8 }}>Cualquier estado distinto de Activo libera los turnos futuros.</p>
      </div>

      {/* Próximos turnos */}
      <div className="fcard">
        <div className="flabel">Próximos turnos ({upcoming.length})</div>
        {upcoming.length === 0 ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin turnos futuros agendados.</p>
            {status === 'active' && (
              <div className="warn-note" style={{ marginTop: 8 }}>
                <AlertTriangle size={14} />
                <span>Está activo pero no tiene un horario fijo. Definilo abajo en «Día, horario y frecuencia».</span>
              </div>
            )}
          </>
        ) : (
          <div>
            {upcoming.slice(0, 6).map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}>
                <span className="mono">{shortDate(a.date)} · {a.time?.slice(0, 5)}</span>
                <span style={{ color: 'var(--text-lt)' }}>{fmt$(a.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Día, horario y frecuencia */}
      <div className="fcard">
        <div className="flabel">Día, horario y frecuencia</div>
        {!freqOpen ? (
          <button
            onClick={() => setFreqOpen(true)}
            className="btn btn-block pressable"
            style={{ background: 'var(--teal-tint)', color: 'var(--teal-dk)', border: '1px solid var(--teal-line)', fontSize: 12.5, padding: 11 }}
          >
            <CalendarClock size={15} /> {first ? 'Cambiar desde una fecha' : 'Fijar día y horario'}
          </button>
        ) : (
          <div style={{ background: 'var(--muted)', borderRadius: 'var(--radius-md)', padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Nuevo encuadre</div>
            {currentSchedule && (
              <div style={{ fontSize: 11.5, color: 'var(--text-md)', marginBottom: 10 }}>
                Actual: <b style={{ textTransform: 'capitalize' }}>{currentSchedule}</b>
              </div>
            )}

            <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>A partir del</span>
            <input type="date" value={freqFrom} onChange={(e) => setFreqFrom(e.target.value)} className="mono"
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 600 }} />

            <span className="field-label" style={{ fontSize: 10, margin: '10px 0 4px' }}>Día</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[1, 2, 3, 4, 5, 6].map((dow) => (
                <button
                  key={dow} type="button" onClick={() => setFreqDow(dow)} aria-pressed={freqDow === dow}
                  className="pressable"
                  style={{
                    flex: 1, fontSize: 11, fontWeight: 700, padding: '7px 0', borderRadius: 10, cursor: 'pointer',
                    background: freqDow === dow ? 'var(--btn)' : 'var(--card)', color: freqDow === dow ? 'var(--btn-fg)' : 'var(--text-md)',
                    border: `1px solid ${freqDow === dow ? 'var(--btn)' : 'var(--border)'}`,
                  }}
                >
                  {DOW_SHORT[dow]}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <label>
                <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>Horario</span>
                <input type="time" value={freqTime} onChange={(e) => setFreqTime(e.target.value)} className="mono"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 600 }} />
              </label>
              <label>
                <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>Frecuencia</span>
                <select value={freqValue} onChange={(e) => setFreqValue(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                </select>
              </label>
              {!first && (
                <>
                  <label>
                    <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>Modalidad</span>
                    <select value={freqModality} onChange={(e) => { setFreqModality(e.target.value); setFreqPrice((e.target.value === 'virtual' ? priceVirtual : pricePresencial) || freqPrice); }}
                      style={{ width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>
                      <option value="virtual">Virtual</option>
                      <option value="presencial">Presencial</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label" style={{ fontSize: 10, marginBottom: 4 }}>Precio</span>
                    <input type="number" inputMode="numeric" value={freqPrice} onChange={(e) => setFreqPrice(e.target.value)} className="mono"
                      style={{ width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 700 }} />
                  </label>
                </>
              )}
            </div>

            <div style={{ marginTop: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }}>
              {preview.map((r, i) => (
                <div key={i} className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 0', borderTop: i ? '1px solid var(--border-soft)' : 'none' }}>
                  {r.old && <span style={{ color: 'var(--text-lt)', textDecoration: 'line-through' }}>{r.old}</span>}
                  {r.old && <span style={{ color: 'var(--text-lt)' }}>→</span>}
                  <span style={{ color: 'var(--teal-dk)', fontWeight: 600, marginLeft: 'auto' }}>{r.next}</span>
                </div>
              ))}
            </div>

            <div className="warn-note" style={{ marginTop: 10 }}>
              <AlertCircle size={14} />
              <span>
                Se reprograman los turnos <b>desde el {freqFrom.slice(8, 10)}/{freqFrom.slice(5, 7)} en adelante</b>. Los turnos anteriores no cambian.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-outline pressable" style={{ flex: 1, fontSize: 12, padding: 9 }} onClick={() => setFreqOpen(false)}>Cancelar</button>
              <button className="btn btn-accent pressable" style={{ flex: 1, fontSize: 12, padding: 9, boxShadow: 'none' }} disabled={isPending} onClick={saveSchedule}>
                Confirmar cambio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notas clínicas */}
      <div className="fcard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="flabel" style={{ margin: 0 }}>Notas clínicas</div>
          {!noteOpen && (
            <button onClick={() => setNoteOpen(true)} className="pressable" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--navy)', background: 'var(--teal)', border: 'none', borderRadius: 999, padding: '5px 10px', cursor: 'pointer' }}>
              <Plus size={11} strokeWidth={3} /> Nueva nota
            </button>
          )}
        </div>

        {noteOpen && (
          <div style={{ background: 'var(--muted)', borderRadius: 'var(--radius-md)', padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-md)', marginBottom: 6 }}>
              Sesión del <b>{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</b>
            </div>
            <textarea
              value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus rows={4}
              placeholder="Escribí la nota de la sesión…" aria-label="Nota de la sesión"
              style={{ width: '100%', padding: '9px 10px', fontSize: 13, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-lt)', marginTop: 6 }}>
              <Lock size={12} /> Solo vos podés ver estas notas
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-outline pressable" style={{ flex: 1, fontSize: 12, padding: 9 }} onClick={() => { setNoteOpen(false); setNoteText(''); }}>Cancelar</button>
              <button
                className="btn btn-accent pressable" style={{ flex: 1, fontSize: 12, padding: 9, boxShadow: 'none' }} disabled={!noteText.trim() || isPending}
                onClick={() => startTransition(async () => { await addNote(patient.id, noteText); setNoteText(''); setNoteOpen(false); })}
              >
                Guardar nota
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notes.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin notas todavía.</p>}
          {notes.map((n) => (
            <div key={n.id} style={{ background: 'var(--muted)', borderRadius: 10, padding: '9px 12px' }}>
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-lt)', marginBottom: 2 }}>
                {new Date(n.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-md)', whiteSpace: 'pre-wrap' }}>{n.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Zona de riesgo */}
      <div className="fcard" style={{ borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)' }}>
        <div className="flabel" style={{ color: 'var(--danger)' }}>Zona de riesgo</div>
        {!deleteOpen ? (
          <button onClick={() => setDeleteOpen(true)} className="btn btn-destructive btn-block pressable" style={{ fontSize: 12.5, padding: 11 }}>
            Eliminar paciente permanentemente
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
              aria-label="Confirmar nombre"
              style={{ padding: '10px 12px', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}>
                Cancelar
              </button>
              <button
                className="btn pressable" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}
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

function Stat({ value, label, color }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--text-lt)', marginTop: 1, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}
