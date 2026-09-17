'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import HourList from './HourList';
import { createAppointment, rescheduleAppointment } from './actions';
import { useDragReschedule } from './useDragReschedule';
import { timeToMinutes, rangesOverlap } from './scheduling';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pad(n) { return String(n).padStart(2, '0'); }

export default function WeekView({ days, appointmentsByDate, blockedByDate, othersByDate, patients }) {
  const [mounted, setMounted] = useState(false);
  const [local, setLocal] = useState(appointmentsByDate);
  const [modal, setModal] = useState(null); // { date, time } | null
  const [closing, setClosing] = useState(false);
  const [formType, setFormType] = useState('patient');

  useEffect(() => setMounted(true), []);
  useEffect(() => setLocal(appointmentsByDate), [appointmentsByDate]);

  function openModalAt(date, time) {
    setFormType('patient');
    setModal({ date, time });
  }
  function close() {
    setClosing(true);
    setTimeout(() => { setModal(null); setClosing(false); }, 220);
  }

  function handleDrop(meta, slot) {
    const [slotDate, slotTime] = slot.split('|');
    const dayList = local[slotDate] || [];
    const startMin = timeToMinutes(slotTime);
    const conflict = dayList.find((a) => a.id !== meta.id && rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
    }
    setLocal((prev) => {
      const next = { ...prev };
      const fromDate = meta.fromDate;
      const moved = (prev[fromDate] || []).find((a) => a.id === meta.id);
      if (!moved) return prev;
      next[fromDate] = (next[fromDate] || []).filter((a) => a.id !== meta.id);
      next[slotDate] = [...(next[slotDate] || []), { ...moved, date: slotDate, time: slotTime }];
      return next;
    });
    rescheduleAppointment(meta.id, slotDate, slotTime);
  }

  const { dragging, hoverSlot, dragHandlers } = useDragReschedule(handleDrop);

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
      if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) e.preventDefault();
    }
  }

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      {days.map((d) => {
        const dt = new Date(d.key + 'T00:00:00');
        return (
          <div key={d.key} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'capitalize',
              padding: '6px 0', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2,
            }}>
              {DAY_NAMES[dt.getDay()]} {dt.getDate()} de {MONTH_SHORT[dt.getMonth()]}
            </div>
            <HourList
              dateStr={d.key}
              appointments={local[d.key] || []}
              blocks={blockedByDate[d.key] || []}
              others={othersByDate[d.key] || []}
              dragging={dragging}
              hoverSlot={hoverSlot}
              dragHandlers={dragHandlers}
              onFreeSlotClick={openModalAt}
              compact
            />
          </div>
        );
      })}

      {mounted && createPortal(
        <button className="fab-extended pressable" onClick={() => openModalAt(days[0]?.key, pad(new Date().getHours()) + ':00')}>
          <Plus size={20} strokeWidth={2.5} /> Nuevo turno
        </button>,
        document.body
      )}

      {mounted && dragging && createPortal(
        <div style={{
          position: 'fixed', left: dragging.x - 60, top: dragging.y - 20, width: 120, pointerEvents: 'none', zIndex: 500,
          background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700,
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
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
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
