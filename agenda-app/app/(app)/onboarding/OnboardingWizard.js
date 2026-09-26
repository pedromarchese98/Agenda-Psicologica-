'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Lock, ArrowRight } from 'lucide-react';
import { completeOnboarding, skipOnboarding } from './actions';

const DAYS = [
  { key: 0, label: 'Lunes', short: 'L' }, { key: 1, label: 'Martes', short: 'M' }, { key: 2, label: 'Miércoles', short: 'M' },
  { key: 3, label: 'Jueves', short: 'J' }, { key: 4, label: 'Viernes', short: 'V' }, { key: 5, label: 'Sábado', short: 'S' }, { key: 6, label: 'Domingo', short: 'D' },
];

// Recorrido: cómo se carga el primer turno (mismos pasos que la Guía del primer turno).
const TOUR_STEPS = [
  {
    title: 'Tocá un horario libre',
    text: 'En la agenda, cada hueco libre dice «Libre — tocar para agendar». También podés usar el botón + de abajo a la derecha.',
    mock: { time: '11:00', label: 'Libre — tocar para agendar' },
  },
  {
    title: 'Elegí el tipo de turno',
    text: 'Un paciente nuevo, uno existente, o un evento como una reunión con un colegio — cada uno se carga distinto.',
    mock: { time: '11:00', label: 'Nuevo paciente' },
  },
  {
    title: 'Modalidad y precio',
    text: 'Elegís virtual o presencial y el precio se completa solo con el último de ese paciente. Lo podés editar para esa sesión.',
    mock: { time: '11:00', label: 'Virtual · $18.000' },
  },
  {
    title: 'Frecuencia',
    text: 'Semanal o quincenal genera la serie completa por un año. Si una semana cambia, movés esa sesión sin tocar el resto.',
    mock: { time: '11:00', label: 'Semanal · 52 turnos' },
  },
  {
    title: 'Lista para usar',
    text: 'Los horarios fuera de tu jornada ya quedaron bloqueados. Podés cambiar días y horario cuando quieras desde tu perfil.',
    mock: { time: '09:00', label: 'Tu agenda está lista' },
  },
];

function ProgressDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 22 }} aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 22, height: 4, borderRadius: 2, background: i <= step ? 'var(--teal)' : 'var(--muted)' }} />
      ))}
    </div>
  );
}

function StepIcon({ icon: Icon }) {
  return (
    <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
      <Icon size={22} color="var(--teal)" />
    </div>
  );
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState('days'); // 'days' | 'hours' | 'saving' | 'tour'
  const [tourIndex, setTourIndex] = useState(0);
  const [days, setDays] = useState([0, 1, 2, 3, 4]);
  const [hourStart, setHourStart] = useState(9);
  const [hourEnd, setHourEnd] = useState(18);

  function toggleDay(key) {
    setDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key].sort()));
  }

  async function handleConfirmHours() {
    setStep('saving');
    await completeOnboarding(days, hourStart, hourEnd);
    setStep('tour');
  }

  function finishTour() {
    router.refresh();
  }

  async function handleSkip() {
    await skipOnboarding();
    router.refresh();
  }

  const HOURS = Array.from({ length: 15 }, (_, i) => 6 + i); // 6 a 20
  const hh = (h) => `${String(h).padStart(2, '0')}:00`;

  const h2 = { fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', margin: '0 0 6px' };
  const sub = { fontSize: 13, color: 'var(--text-md)', margin: '0 0 22px', lineHeight: 1.5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--card)', zIndex: 1000, display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 'max(48px, calc(var(--safe-top) + 32px)) 24px calc(28px + var(--safe-bottom))' }}>
        <div style={{ maxWidth: 380, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {step === 'days' && (
            <>
              <ProgressDots step={1} />
              <StepIcon icon={Calendar} />
              <h2 style={h2}>¿Qué días atendés?</h2>
              <p style={sub}>Tocá los días en los que vas a dar turnos. Podés cambiarlo después desde tu perfil.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
                {DAYS.map((d) => {
                  const on = days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(d.key)}
                      className="pressable"
                      aria-label={d.label}
                      aria-pressed={on}
                      title={d.label}
                      style={{
                        aspectRatio: '1', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${on ? 'var(--navy)' : 'var(--border)'}`,
                        background: on ? 'var(--navy)' : 'var(--card)',
                        color: on ? 'var(--teal)' : 'var(--text-md)', fontWeight: 700, fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-lt)', textAlign: 'center', margin: '4px 0 0' }}>
                {days.length} día{days.length !== 1 ? 's' : ''} seleccionado{days.length !== 1 ? 's' : ''}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                <button onClick={() => setStep('hours')} disabled={days.length === 0} className="btn btn-primary btn-block pressable" style={{ padding: 12 }}>
                  Continuar
                </button>
                <button onClick={handleSkip} className="pressable" style={{ display: 'block', width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--text-lt)', fontSize: 11.5, cursor: 'pointer' }}>
                  Configurar esto más tarde
                </button>
              </div>
            </>
          )}

          {step === 'hours' && (
            <>
              <ProgressDots step={2} />
              <StepIcon icon={Clock} />
              <h2 style={h2}>¿En qué horario?</h2>
              <p style={sub}>Definí el rango horario de tu jornada. El resto va a quedar bloqueado automáticamente.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <label style={{ flex: 1 }}>
                  <span className="field-label" style={{ fontSize: 11 }}>Desde</span>
                  <select value={hourStart} onChange={(e) => { const v = Number(e.target.value); setHourStart(v); if (hourEnd <= v) setHourEnd(v + 1); }}
                    className="mono" style={{ width: '100%', padding: '11px 12px', background: 'var(--muted)', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>
                    {HOURS.slice(0, -1).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                  </select>
                </label>
                <ArrowRight size={16} color="var(--text-lt)" style={{ marginTop: 20, flex: 'none' }} />
                <label style={{ flex: 1 }}>
                  <span className="field-label" style={{ fontSize: 11 }}>Hasta</span>
                  <select value={hourEnd} onChange={(e) => setHourEnd(Number(e.target.value))}
                    className="mono" style={{ width: '100%', padding: '11px 12px', background: 'var(--muted)', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>
                    {HOURS.filter((h) => h > hourStart).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ marginTop: 'auto', background: 'var(--teal-tint)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={17} color="var(--teal-dk)" style={{ flex: 'none' }} />
                <span style={{ fontSize: 12.5, color: 'var(--teal-dk)', fontWeight: 600, lineHeight: 1.4 }}>
                  Vamos a bloquear todo lo anterior a las {hh(hourStart)} y posterior a las {hh(hourEnd)}, en tus días laborables, sin fecha de fin.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 16 }}>
                <button onClick={() => setStep('days')} className="btn btn-secondary pressable" style={{ padding: '12px 16px' }}>Atrás</button>
                <button onClick={handleConfirmHours} className="btn btn-primary pressable" style={{ flex: 1, padding: 12 }}>Continuar</button>
              </div>
            </>
          )}

          {step === 'saving' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
              <div
                aria-hidden
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  border: '3px solid var(--border)', borderTopColor: 'var(--teal)',
                  animation: 'onboardSpin 0.8s linear infinite',
                }}
              />
              <style>{'@keyframes onboardSpin { to { transform: rotate(360deg); } }'}</style>
              <div style={{ fontSize: 14.5, fontWeight: 700 }} role="status">Armando tu agenda</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-md)', maxWidth: 240 }}>
                Estamos bloqueando los horarios fuera de tu jornada de forma permanente. Podés cambiarlos cuando quieras desde tu perfil.
              </div>
            </div>
          )}

          {step === 'tour' && (
            <>
              <ProgressDots step={3} />
              {(() => {
                const s = TOUR_STEPS[tourIndex];
                return (
                  <div style={{ background: 'var(--muted)', borderRadius: 16, padding: 18, marginBottom: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, color: 'var(--teal-dk)', background: 'var(--teal-tint)', padding: '3px 9px', borderRadius: 999, marginBottom: 12 }}>
                      Paso {tourIndex + 1} de {TOUR_STEPS.length}
                    </span>
                    <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: '0 0 8px' }}>{s.title}</h3>
                    <p style={{ fontSize: 12.5, color: 'var(--text-md)', lineHeight: 1.55, margin: 0, flex: 1 }}>{s.text}</p>
                    <div style={{ marginTop: 14, background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', background: 'var(--teal-tint)', borderRadius: 6, padding: '3px 6px' }}>{s.mock.time}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600 }}>{s.mock.label}</span>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: 10 }}>
                {tourIndex > 0 && (
                  <button onClick={() => setTourIndex((v) => v - 1)} className="btn btn-secondary pressable" style={{ padding: '12px 16px' }}>Atrás</button>
                )}
                <button
                  onClick={() => (tourIndex < TOUR_STEPS.length - 1 ? setTourIndex((v) => v + 1) : finishTour())}
                  className="btn btn-primary pressable"
                  style={{ flex: 1, padding: 12 }}
                >
                  {tourIndex < TOUR_STEPS.length - 1 ? 'Siguiente' : 'Empezar a usar la agenda'}
                </button>
              </div>
              {tourIndex < TOUR_STEPS.length - 1 && (
                <button onClick={finishTour} className="pressable" style={{ display: 'block', width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--text-lt)', fontSize: 11.5, cursor: 'pointer' }}>
                  Saltear el recorrido
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
