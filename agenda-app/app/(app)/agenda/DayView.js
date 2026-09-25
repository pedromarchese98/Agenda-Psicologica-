'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, User, Pin, Ban, Laptop, Home, HelpCircle, X } from 'lucide-react';
import HourList from './HourList';
import { createAppointment, rescheduleAppointment } from './actions';
import { useDragReschedule } from './useDragReschedule';
import { timeToMinutes, rangesOverlap } from './scheduling';

function pad(n) {
  return String(n).padStart(2, '0');
}

const GUIDE_SEEN_KEY = 'firstApptGuideSeen';

function HelpBubble({ show, num, title, text }) {
  if (!show) return null;
  return (
    <div style={{ position: 'relative', marginTop: -4 }}>
      <span
        style={{
          position: 'absolute', top: -6, left: 18, width: 10, height: 10,
          background: 'var(--teal-tint)', borderLeft: '1px solid var(--teal)', borderTop: '1px solid var(--teal)',
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          display: 'flex', gap: 8, background: 'var(--teal-tint)', border: '1px solid var(--teal)',
          borderRadius: 10, padding: '9px 11px', fontSize: 12, lineHeight: 1.5, color: 'var(--navy)',
        }}
      >
        <span style={{
          flex: 'none', width: 16, height: 16, borderRadius: '50%', background: 'var(--teal-dk)', color: '#fff',
          fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}>
          {num}
        </span>
        <span>
          <strong>{title}.</strong> {text}
        </span>
      </div>
    </div>
  );
}

export default function DayView({ dateStr, appointments, blocks, others, patients }) {
  const [modalTime, setModalTime] = useState(null);
  const [closing, setClosing] = useState(false);
  const [formType, setFormType] = useState('patient');
  const [eventIsPaid, setEventIsPaid] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localAppts, setLocalAppts] = useState(appointments);
  const [guideOn, setGuideOn] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setLocalAppts(appointments), [appointments]);

  function openModalAt(_date, time) {
    setFormType('patient');
    setEventIsPaid(false);
    setModalTime(time);
    try {
      if (!localStorage.getItem(GUIDE_SEEN_KEY)) {
        setGuideOn(true);
        localStorage.setItem(GUIDE_SEEN_KEY, '1');
      }
    } catch (e) {
      /* localStorage no disponible */
    }
  }
  function close() {
    setClosing(true);
    setTimeout(() => { setModalTime(null); setClosing(false); }, 220);
  }

  function handleDrop(meta, slot) {
    const [slotDate, slotTime] = slot.split('|');
    if (slotDate !== dateStr) return;
    const startMin = timeToMinutes(slotTime);
    const conflict = localAppts.find((a) => a.id !== meta.id && rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
    }
    setLocalAppts((prev) => prev.map((a) => (a.id === meta.id ? { ...a, time: slotTime } : a)));
    rescheduleAppointment(meta.id, slotDate, slotTime);
  }

  const { dragging, hoverSlot, dragHandlers } = useDragReschedule(handleDrop);

  function checkConflictBeforeSubmit(e) {
    const form = e.target;
    const type = form.type?.value;
    const time = form.time?.value;
    const date = form.date?.value;
    if (type !== 'patient' || date !== dateStr || !time) return;
    const startMin = timeToMinutes(time);
    const conflict = localAppts.find((a) => rangesOverlap(startMin, timeToMinutes(a.time)));
    if (conflict) {
      const name = conflict.patients ? `${conflict.patients.first_name} ${conflict.patients.last_name || ''}`.trim() : 'otro turno';
      if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) {
        e.preventDefault();
      }
    }
  }

  const modal = modalTime !== null && (
    <div
      onClick={close}
      className="sheet-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
    >
      <form
        onSubmit={checkConflictBeforeSubmit}
        action={async (formData) => { await createAppointment(formData); close(); }}
        onClick={(e) => e.stopPropagation()}
        className={`card sheet-box${closing ? ' closing' : ''}`}
        style={{
          width: '100%', maxHeight: '88dvh', overflowY: 'auto',
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          padding: '10px 20px calc(20px + var(--safe-bottom))',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo</h3>
          <button
            type="button"
            onClick={() => setGuideOn((v) => !v)}
            className="pressable"
            aria-label={guideOn ? 'Ocultar ayuda' : 'Mostrar ayuda'}
            style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: guideOn ? 'var(--teal)' : 'var(--muted)', color: guideOn ? 'var(--navy)' : 'var(--text-lt)',
            }}
          >
            {guideOn ? <X size={14} /> : <HelpCircle size={15} />}
          </button>
        </div>
        {guideOn && (
          <p style={{ fontSize: 11.5, color: 'var(--text-lt)', margin: '-6px 0 2px' }}>
            Guía rápida activada — tocá el ✕ de arriba para ocultarla.
          </p>
        )}

        <select name="type" value={formType} onChange={(e) => setFormType(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
          <option value="patient">Turno con paciente</option>
          <option value="other">Evento (reunión, colegio, etc.)</option>
          <option value="block">Bloquear horario</option>
        </select>
        <HelpBubble
          show={guideOn} num={1} title="Qué se está agendando"
          text="Paciente inicia una sesión clínica. Evento es una reunión, llamada o compromiso que no representa un nuevo paciente. Bloqueo cierra un horario sin ocuparlo."
        />

        {formType === 'patient' && (
          <>
            <input name="name" placeholder="Nombre del paciente (o elegí uno existente)" list="patients-datalist" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            <datalist id="patients-datalist">
              {(patients || []).map((p) => (
                <option key={p.id} value={`${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`} />
              ))}
            </datalist>
            <HelpBubble
              show={guideOn} num={2} title="Buscar o crear"
              text="Empezá a escribir el nombre: si el paciente ya existe aparece para elegirlo, y si no, se crea uno nuevo en el momento sin salir de esta pantalla."
            />
          </>
        )}

        {formType === 'other' && (
          <>
            <input name="title" placeholder="Ej: Reunión con padres, colegio…" required
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" name="isPaid" checked={eventIsPaid} onChange={(e) => setEventIsPaid(e.target.checked)} />
              Es un evento pago
            </label>
            {eventIsPaid && (
              <input name="price" type="number" placeholder="Precio" required
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <input name="date" type="date" defaultValue={dateStr} required
            style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
          <input name="time" type="time" defaultValue={modalTime} required
            style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
        </div>
        <HelpBubble
          show={guideOn} num={3} title="Se completa solo"
          text="Si abriste el formulario tocando un horario libre en la agenda, la fecha y hora ya vienen cargadas — igual podés cambiarlas acá."
        />

        {formType === 'patient' && (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <select name="modality" defaultValue="virtual"
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
              </select>
              <input name="price" type="number" placeholder="Precio" required
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
            <HelpBubble
              show={guideOn} num={4} title="Define el precio sugerido"
              text="Cada modalidad tiene su propio precio guardado en el perfil del paciente. Al elegirla, el campo de precio se autocompleta solo."
            />
            <HelpBubble
              show={guideOn} num={5} title="Editable en el momento"
              text="El monto viene precargado pero es solo una sugerencia — se puede editar para esta sesión puntual sin afectar el precio general del paciente."
            />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', display: 'block', marginBottom: 4 }}>Frecuencia</label>
              <select name="repeat" defaultValue="once"
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                <option value="once">Una sola vez</option>
                <option value="weekly">Semanal (1 año)</option>
                <option value="biweekly">Quincenal (1 año)</option>
              </select>
            </div>
            <HelpBubble
              show={guideOn} num={6} title="Crea la serie completa"
              text="Elegir Semanal o Quincenal genera automáticamente los próximos turnos con ese mismo día y horario — no hace falta cargarlos uno por uno."
            />
          </>
        )}

        <HelpBubble
          show={guideOn} num={7} title="Última red de seguridad"
          text="Antes de guardar, la app revisa que no haya dos turnos pisándose en el mismo horario y te lo advierte si pasa."
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={close}>Cancelar</button>
          <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }}>Guardar</button>
        </div>
      </form>
    </div>
  );

  return (
    <div style={{ padding: '4px 16px 90px' }}>
      <HourList
        dateStr={dateStr}
        appointments={localAppts}
        blocks={blocks}
        others={others}
        dragging={dragging}
        hoverSlot={hoverSlot}
        dragHandlers={dragHandlers}
        onFreeSlotClick={openModalAt}
      />

      {mounted && createPortal(
        <button className="fab-compact pressable" onClick={() => openModalAt(dateStr, pad(new Date().getHours()) + ':00')} aria-label="Nuevo turno">
          <Plus size={20} strokeWidth={2.5} />
        </button>,
        document.body
      )}

      {mounted && dragging && createPortal(
        <div
          style={{
            position: 'fixed', left: dragging.x - 60, top: dragging.y - 20, width: 120, pointerEvents: 'none', zIndex: 500,
            background: 'var(--navy)', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700,
            boxShadow: '0 8px 20px rgba(0,0,0,.3)', textAlign: 'center',
          }}
        >
          {dragging.label}
        </div>,
        document.body
      )}

      {mounted && modal && createPortal(modal, document.body)}
    </div>
  );
}
