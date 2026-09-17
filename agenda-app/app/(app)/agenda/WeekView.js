'use client';

import { useEffect, useState, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createAppointment, rescheduleAppointment } from './actions';
import { useDragReschedule } from './useDragReschedule';
import { timeToMinutes, rangesOverlap, findConflicts } from './scheduling';

const HOUR_START = 7, HOUR_END = 20;
const ROW_PX = 30; // filas más chicas que en Día
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

function pad(n) { return String(n).padStart(2, '0'); }

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

function colorFor(a) {
  if (a.attendance === 'no-free') return '#C2454F';
  if (a.attendance === 'no') return '#8A93A8';
  if (a.payment === 'paid') return '#2E9C6A';
  if (a.payment === 'unpaid') return '#D98A22';
  if (a.attendance === 'yes') return '#1E88A8';
  return '#3B6FD9';
}

export default function WeekView({ days, appointmentsByDate, blockedByDate, patients }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [local, setLocal] = useState(appointmentsByDate);
  const [modal, setModal] = useState(null); // { date, time } | null
  const [closing, setClosing] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setLocal(appointmentsByDate), [appointmentsByDate]);

  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  function isBlocked(dateKey, hourStr) {
    return (blockedByDate[dateKey] || []).some((b) => b.time?.startsWith(hourStr + ':'));
  }

  function handleDrop(meta, slot) {
    const [slotDate, slotTime] = slot.split('|');
    const dayList = local[slotDate] || [];
    const startMin = timeToMinutes(slotTime);
    const conflict = dayList.find((a) => a.id !== meta.id && rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`⚠️ Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
    }
    setLocal((prev) => {
      const next = { ...prev };
      const fromDate = meta.fromDate;
      next[fromDate] = (next[fromDate] || []).filter((a) => a.id !== meta.id);
      const moved = dayList.find((a) => a.id === meta.id) || (prev[fromDate] || []).find((a) => a.id === meta.id);
      next[slotDate] = [...(next[slotDate] || []), { ...moved, date: slotDate, time: slotTime }];
      return next;
    });
    rescheduleAppointment(meta.id, slotDate, slotTime);
  }

  const { dragging, hoverSlot, dragHandlers } = useDragReschedule(handleDrop);

  function openModalAt(date, time) { setModal({ date, time }); }
  function close() {
    setClosing(true);
    setTimeout(() => { setModal(null); setClosing(false); }, 220);
  }

  function checkConflictBeforeSubmit(e) {
    const form = e.target;
    const type = form.type?.value;
    const time = form.time?.value;
    const date = form.date?.value;
    if (type !== 'patient' || !time) return;
    const dayList = local[date] || [];
    const startMin = timeToMinutes(time);
    const conflict = dayList.find((a) => rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`⚠️ Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) e.preventDefault();
    }
  }

  return (
    <div style={{ padding: '4px 10px 90px' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `34px repeat(5, minmax(84px, 1fr))`, minWidth: 470 }}>
          <div />
          {days.map((d, i) => (
            <div key={d.key} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-lt)', paddingBottom: 4 }}>
              {DAY_LABELS[i]} {d.day}
            </div>
          ))}

          {hours.map((h) => {
            const hourStr = pad(h);
            return (
              <Fragment key={h}>
                <div style={{ fontSize: 9, color: 'var(--text-lt)', paddingTop: 2, borderTop: '1px solid var(--border)' }}>
                  {hourStr}
                </div>
                {days.map((d) => {
                  const dayAppts = local[d.key] || [];
                  const apptHere = dayAppts.find((a) => a.time?.startsWith(hourStr + ':'));
                  const blocked = isBlocked(d.key, hourStr);
                  const slot = `${d.key}|${hourStr}:00`;
                  const isHovered = hoverSlot === slot;

                  if (blocked) {
                    return <div key={slot} style={{ borderTop: '1px solid var(--border)', minHeight: ROW_PX }} />;
                  }

                  if (apptHere) {
                    const conflicts = findConflicts(apptHere, dayAppts);
                    const name = apptHere.patients ? apptHere.patients.first_name : '';
                    return (
                      <div
                        key={slot}
                        {...dragHandlers({ id: apptHere.id, fromDate: d.key, label: name })}
                        style={{
                          borderTop: '1px solid var(--border)', minHeight: ROW_PX, padding: 2,
                          opacity: dragging?.id === apptHere.id ? 0.35 : 1, touchAction: 'pan-y',
                        }}
                      >
                        <div
                          style={{
                            background: conflicts.length ? '#FFF6F6' : '#EEF3FF', borderLeft: `3px solid ${conflicts.length ? '#C62828' : colorFor(apptHere)}`,
                            borderRadius: 4, fontSize: 9.5, fontWeight: 700, padding: '2px 4px', height: '100%',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer',
                          }}
                          onClick={() => router.push(`/agenda?date=${d.key}`)}
                        >
                          {conflicts.length > 0 && '⚠️ '}{name}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot}
                      data-slot={slot}
                      onClick={() => openModalAt(d.key, `${hourStr}:00`)}
                      className="pressable"
                      style={{
                        borderTop: '1px solid var(--border)', minHeight: ROW_PX, cursor: 'pointer',
                        background: isHovered ? '#E6F8F3' : 'transparent',
                        outline: isHovered ? '2px dashed var(--teal-dk)' : 'none', outlineOffset: -1,
                      }}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-lt)', textAlign: 'center', marginTop: 10 }}>
        Mantené presionado un turno para arrastrarlo a otro horario libre. Tocá un horario libre para agendar, o un turno para ver el día completo.
      </p>

      {mounted && dragging && createPortal(
        <div style={{
          position: 'fixed', left: dragging.x - 50, top: dragging.y - 20, width: 100, pointerEvents: 'none', zIndex: 500,
          background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0,0,0,.3)', textAlign: 'center',
        }}>
          {dragging.label}
        </div>,
        document.body
      )}

      {mounted && modal && createPortal(
        <div onClick={close} className="sheet-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <form
            onSubmit={checkConflictBeforeSubmit}
            action={async (formData) => { await createAppointment(formData); close(); }}
            onClick={(e) => e.stopPropagation()}
            className={`card sheet-box${closing ? ' closing' : ''}`}
            style={{ width: '100%', maxHeight: '88dvh', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
            <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo turno</h3>
            <input type="hidden" name="type" value="patient" />
            <input name="name" placeholder="Nombre del paciente" list="patients-datalist-week" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            <datalist id="patients-datalist-week">
              {(patients || []).map((p) => <option key={p.id} value={`${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`} />)}
            </datalist>
            <div style={{ display: 'flex', gap: 10 }}>
              <input name="date" type="date" defaultValue={modal.date} required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
              <input name="time" type="time" defaultValue={modal.time} required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select name="modality" defaultValue="virtual" style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <option value="virtual">💻 Virtual</option>
                <option value="presencial">🏠 Presencial</option>
              </select>
              <input name="price" type="number" placeholder="Precio" required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', display: 'block', marginBottom: 4 }}>Frecuencia</label>
              <select name="repeat" defaultValue="once" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <option value="once">Una sola vez</option>
                <option value="weekly">Semanal (1 año)</option>
                <option value="biweekly">Quincenal (1 año)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={close}>Cancelar</button>
              <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }}>Guardar</button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
