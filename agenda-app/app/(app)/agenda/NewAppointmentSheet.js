'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, AlertTriangle, Plus } from 'lucide-react';
import BlockReasonFields, { BlockWhenFields } from './BlockReasonFields';
import { createAppointment } from './actions';

const GUIDE_SEEN_KEY = 'firstApptGuideSeen';

const TYPE_OPTS = [['patient', 'Paciente'], ['other', 'Evento'], ['block', 'Bloqueo']];
const MODALITY_OPTS = [['virtual', 'Virtual'], ['presencial', 'Presencial']];
const REPEAT_OPTS = [['once', 'Una vez'], ['weekly', 'Semanal'], ['biweekly', 'Quincenal']];
const STATUS_WORD = {
  active: 'activo/a', paused: 'en pausa', suspended: 'suspendido/a',
  abandoned: 'abandonó', discharged: 'de alta', referred: 'derivado/a',
};

function normalize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function fullName(p) {
  return `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`;
}
function initials(p) {
  return ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label} style={{ width: '100%' }}>
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`segmented-item pressable${value === v ? ' active' : ''}`}
          style={{ flex: 1, padding: '8px 6px' }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// Cuadro de ayuda de la "Guía del primer turno": aparece la primera vez que se agenda.
function HelpBubble({ show, num, title, text }) {
  if (!show) return null;
  return (
    <div style={{ display: 'flex', gap: 8, background: 'var(--teal-tint)', border: '1px solid var(--teal-line)', borderRadius: 10, padding: '9px 11px', fontSize: 12, lineHeight: 1.5, color: 'var(--text)', marginTop: -6 }}>
      <span style={{
        flex: 'none', width: 18, height: 18, borderRadius: '50%', background: 'var(--navy)', color: 'var(--teal)',
        fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
      }}>
        {num}
      </span>
      <span><strong>{title}.</strong> {text}</span>
    </div>
  );
}

/**
 * Hoja inferior para agendar: turno con paciente, evento o bloqueo.
 * - `slot`: { date, time } o null (cerrada)
 * - `patients`: [{ id, first_name, last_name, status }]
 * - `priceHints`: { byPatient: { [id]: { virtual, presencial } }, fallback: { virtual, presencial } }
 * - `findConflict(date, time)`: devuelve el turno con el que se superpone, o null.
 */
export default function NewAppointmentSheet({ slot, onClose, patients = [], priceHints = {}, findConflict }) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [guideOn, setGuideOn] = useState(false);

  const [type, setType] = useState('patient');
  const [query, setQuery] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [modality, setModality] = useState('virtual');
  const [price, setPrice] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [repeat, setRepeat] = useState('once');
  const [eventPaid, setEventPaid] = useState(false);

  useEffect(() => setMounted(true), []);

  // Cada vez que se abre, arranca limpia (y con la guía si es la primera vez).
  useEffect(() => {
    if (!slot) return;
    setType('patient'); setQuery(''); setPatientId(null); setShowSuggest(false);
    setModality('virtual'); setPrice(''); setPriceTouched(false); setRepeat('once'); setEventPaid(false);
    try {
      if (!localStorage.getItem(GUIDE_SEEN_KEY)) {
        setGuideOn(true);
        localStorage.setItem(GUIDE_SEEN_KEY, '1');
      } else {
        setGuideOn(false);
      }
    } catch (e) { /* localStorage no disponible */ }
  }, [slot]);

  const suggestedPrice = useMemo(() => {
    const own = patientId ? priceHints.byPatient?.[patientId]?.[modality] : null;
    const v = own ?? priceHints.fallback?.[modality] ?? null;
    return v != null && Number(v) > 0 ? String(Math.round(Number(v))) : '';
  }, [patientId, modality, priceHints]);

  // El precio se autocompleta con el sugerido hasta que la persona lo edite a mano.
  useEffect(() => {
    if (!priceTouched) setPrice(suggestedPrice);
  }, [suggestedPrice, priceTouched]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return patients.filter((p) => normalize(fullName(p)).includes(q)).slice(0, 4);
  }, [query, patients]);
  const exactMatch = patients.find((p) => normalize(fullName(p)) === normalize(query));

  function pickPatient(p) {
    setQuery(fullName(p));
    setPatientId(p.id);
    setShowSuggest(false);
  }

  function close() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 220);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (type === 'patient') {
      const pid = patientId || exactMatch?.id;
      if (pid) fd.set('patient_id', pid);
      const conflict = findConflict?.(fd.get('date'), fd.get('time'));
      if (conflict) {
        const name = conflict.patients ? fullName(conflict.patients) : 'otro turno';
        if (!confirm(`Se superpone con el turno de ${name} a las ${conflict.time?.slice(0, 5)}. ¿Agendar igual?`)) return;
      }
    }
    startTransition(async () => {
      await createAppointment(fd);
      close();
    });
  }

  if (!mounted || !slot) return null;

  const submitLabel = type === 'patient' ? 'Agendar turno' : type === 'other' ? 'Guardar evento' : 'Bloquear';

  return createPortal(
    <div onClick={close} className="sheet-backdrop">
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`sheet sheet-box${closing ? ' closing' : ''}`}
        aria-label="Nuevo turno"
      >
        <div className="sheet-grab" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>{type === 'block' ? 'Bloquear horario' : `Nuevo turno · ${slot.time}`}</h3>
          <button
            type="button"
            onClick={() => setGuideOn((v) => !v)}
            className="pressable"
            aria-label={guideOn ? 'Ocultar ayuda' : 'Mostrar ayuda'}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: guideOn ? 'var(--teal)' : 'var(--muted)', color: guideOn ? 'var(--navy)' : 'var(--text-lt)',
            }}
          >
            {guideOn ? <X size={14} /> : <HelpCircle size={15} />}
          </button>
        </div>

        <input type="hidden" name="type" value={type} />

        {/* 1 · Tipo de turno */}
        <div>
          <span className="field-label">Tipo de turno</span>
          <Segmented options={TYPE_OPTS} value={type} onChange={setType} label="Tipo de turno" />
        </div>
        <HelpBubble show={guideOn} num={1} title="Qué se está agendando"
          text="Paciente inicia una sesión clínica. Evento es una reunión, llamada o compromiso que no representa un nuevo paciente. Bloqueo cierra un horario sin ocuparlo." />

        {type === 'block' ? (
          <>
            <BlockWhenFields defaultDate={slot.date} defaultTime={slot.time} />
            <BlockReasonFields />
          </>
        ) : (
          <>
            {/* 2 · Paciente (buscar o crear) / título del evento */}
            {type === 'patient' ? (
              <div style={{ position: 'relative' }}>
                <label htmlFor="appt-name" className="field-label">Paciente</label>
                <input
                  id="appt-name"
                  name="name"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPatientId(null); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder="Buscar o escribir un nombre nuevo"
                  autoComplete="off"
                  required
                  style={{ width: '100%', padding: '11px 13px', background: 'var(--muted)', fontSize: 15 }}
                />
                {showSuggest && query.trim() && !patientId && (suggestions.length > 0 || !exactMatch) && (
                  <div className="card" style={{ marginTop: 6, overflow: 'hidden', borderRadius: 10 }}>
                    {suggestions.map((p) => (
                      <button
                        key={p.id} type="button" onClick={() => pickPatient(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', fontSize: 13, background: 'none', border: 'none', borderBottom: '1px solid var(--border-soft)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--navy)', color: 'var(--teal)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          {initials(p)}
                        </span>
                        {fullName(p)}
                        {STATUS_WORD[p.status] && <span style={{ color: 'var(--text-lt)' }}>— {STATUS_WORD[p.status]}</span>}
                      </button>
                    ))}
                    {!exactMatch && (
                      <button
                        type="button" onClick={() => setShowSuggest(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 10px', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', color: 'var(--teal-dk)', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <Plus size={14} /> Crear paciente nuevo “{query.trim()}”
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="event-title" className="field-label">Evento</label>
                <input id="event-title" name="title" placeholder="Ej: Reunión con padres, colegio…" required
                  style={{ width: '100%', padding: '11px 13px', background: 'var(--muted)', fontSize: 15 }} />
              </div>
            )}
            {type === 'patient' && (
              <HelpBubble show={guideOn} num={2} title="Buscar o crear"
                text="Empezá a escribir el nombre: si el paciente ya existe aparece para elegirlo, y si no, se crea uno nuevo en el momento sin salir de esta pantalla." />
            )}

            {/* 3 · Fecha y hora */}
            <div>
              <span className="field-label">Fecha y hora</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input name="date" type="date" defaultValue={slot.date} required aria-label="Fecha" className="mono"
                  style={{ flex: 1, minWidth: 0, padding: '11px 10px', background: 'var(--muted)', fontSize: 14, fontWeight: 600 }} />
                <input name="time" type="time" defaultValue={slot.time} required aria-label="Hora" className="mono"
                  style={{ width: 110, padding: '11px 10px', background: 'var(--muted)', fontSize: 14, fontWeight: 600 }} />
              </div>
            </div>
            <HelpBubble show={guideOn} num={3} title="Se completa solo"
              text="Si abriste el formulario tocando un horario libre en la agenda, la fecha y hora ya vienen cargadas — igual podés cambiarlas acá." />

            {type === 'patient' && (
              <>
                {/* 4 · Modalidad */}
                <div>
                  <span className="field-label">Modalidad</span>
                  <Segmented options={MODALITY_OPTS} value={modality} onChange={setModality} label="Modalidad" />
                  <input type="hidden" name="modality" value={modality} />
                </div>
                <HelpBubble show={guideOn} num={4} title="Define el precio sugerido"
                  text="Cada modalidad tiene su propio precio guardado en el perfil del paciente. Al elegirla, el campo de precio se autocompleta solo." />

                {/* 5 · Precio */}
                <div>
                  <label htmlFor="appt-price" className="field-label">Precio de la sesión</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 6px 4px 13px' }}>
                    <span style={{ color: 'var(--text-lt)', fontSize: 14 }}>$</span>
                    <input
                      id="appt-price" name="price" type="number" inputMode="numeric" min="0" required
                      value={price} onChange={(e) => { setPrice(e.target.value); setPriceTouched(true); }}
                      placeholder="0" className="mono bare-input"
                      style={{ flex: 1, minWidth: 0, padding: '7px 0', fontSize: 15, fontWeight: 700 }}
                    />
                    {price !== '' && price === suggestedPrice && (
                      <span className="badge badge-teal" style={{ fontSize: 10, fontWeight: 700 }}>Sugerido</span>
                    )}
                  </div>
                </div>
                <HelpBubble show={guideOn} num={5} title="Editable en el momento"
                  text="El monto viene precargado pero es solo una sugerencia — se puede editar para esta sesión puntual sin afectar el precio general del paciente." />

                {/* 6 · Frecuencia */}
                <div>
                  <span className="field-label">Frecuencia</span>
                  <Segmented options={REPEAT_OPTS} value={repeat} onChange={setRepeat} label="Frecuencia" />
                  <input type="hidden" name="repeat" value={repeat} />
                </div>
                <HelpBubble show={guideOn} num={6} title="Crea la serie completa"
                  text="Elegir Semanal o Quincenal genera automáticamente los próximos turnos con ese mismo día y horario — no hace falta cargarlos uno por uno. La serie queda fijada por 1 año: 52 turnos si es semanal, 26 si es quincenal." />
              </>
            )}

            {type === 'other' && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Es un evento pago
                  <span className="switch">
                    <input type="checkbox" name="isPaid" checked={eventPaid} onChange={(e) => setEventPaid(e.target.checked)} />
                    <span />
                  </span>
                </label>
                {eventPaid && (
                  <input name="price" type="number" inputMode="numeric" min="0" placeholder="Precio" required className="mono"
                    style={{ width: '100%', padding: '11px 13px', background: 'var(--muted)', fontSize: 15 }} />
                )}
              </>
            )}
          </>
        )}

        {/* 7 · Confirmar */}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button type="button" className="btn btn-secondary pressable" style={{ flex: 'none' }} onClick={close}>Cancelar</button>
          <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }} disabled={isPending}>
            {isPending ? 'Guardando…' : submitLabel}
          </button>
        </div>
        {type === 'patient' && (
          <p style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 11.5, color: 'var(--text-lt)', margin: '-4px 0 0' }}>
            <AlertTriangle size={14} style={{ flex: 'none', marginTop: 1 }} />
            Si el horario se superpone con otro turno, se avisa antes de guardar.
          </p>
        )}
        <HelpBubble show={guideOn && type === 'patient'} num={7} title="Última red de seguridad"
          text="Antes de guardar, la app revisa que no haya dos turnos pisándose en el mismo horario y te lo advierte si pasa." />
      </form>
    </div>,
    document.body
  );
}
