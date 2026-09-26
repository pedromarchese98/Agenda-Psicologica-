'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Calendar, User, Clock3, Repeat, DollarSign } from 'lucide-react';
import { completeOnboarding, skipOnboarding } from './actions';

const DAYS = [
  { key: 0, label: 'Lunes', short: 'L' }, { key: 1, label: 'Martes', short: 'M' }, { key: 2, label: 'Miércoles', short: 'X' },
  { key: 3, label: 'Jueves', short: 'J' }, { key: 4, label: 'Viernes', short: 'V' }, { key: 5, label: 'Sábado', short: 'S' }, { key: 6, label: 'Domingo', short: 'D' },
];

const TOUR_STEPS = [
  {
    icon: User,
    title: 'Elegí qué estás por agendar',
    text: 'Al tocar un horario libre o el botón +, primero elegís el tipo: un turno con un paciente (existente o nuevo), un evento como una reunión con un colegio, o simplemente bloquear ese horario.',
  },
  {
    icon: Clock3,
    title: 'Fecha, hora y modalidad',
    text: 'Completás el nombre del paciente (podés buscar uno ya cargado), la fecha y hora exactas, y si la sesión es virtual o presencial.',
  },
  {
    icon: DollarSign,
    title: 'El precio de esa sesión',
    text: 'Se guarda por turno, así que si cambia con el tiempo, los turnos pasados quedan con el precio que tenían en su momento.',
  },
  {
    icon: Repeat,
    title: 'Frecuencia',
    text: 'Si el paciente viene siempre al mismo horario, elegís "Semanal" o "Quincenal" y se agenda automáticamente para todo el año. Después, desde la ficha del paciente, podés cambiar el día, horario o frecuencia cuando quieras.',
  },
  {
    icon: Check,
    title: 'Lista para usar',
    text: 'Eso es todo. Los horarios que dejaste afuera de tus días/horas de atención ya quedaron bloqueados automáticamente — no vas a verlos en tu agenda.',
  },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState('days'); // 'days' | 'hours' | 'saving' | 'tour'
  const [tourIndex, setTourIndex] = useState(0);
  const [days, setDays] = useState([0, 1, 2, 3, 4]);
  const [hourStart, setHourStart] = useState(9);
  const [hourEnd, setHourEnd] = useState(19);

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--navy)', zIndex: 1000, display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>
        {step === 'days' && (
          <div style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 8 }}>Paso 1 de 2</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>¿Qué días atendés?</h1>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, margin: '0 0 22px' }}>
              Elegí los días que vas a usar en tu agenda. El resto los vamos a bloquear automáticamente para que no aparezcan.
            </p>
            <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className="pressable"
                  aria-label={d.label}
                  title={d.label}
                  style={{
                    flex: 1, aspectRatio: '1', borderRadius: '50%', border: '1px solid rgba(255,255,255,.15)',
                    background: days.includes(d.key) ? 'var(--teal)' : 'rgba(255,255,255,.05)',
                    color: days.includes(d.key) ? 'var(--navy)' : '#fff', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {d.short}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--teal)', fontSize: 12.5, fontWeight: 700, margin: '0 0 26px' }}>
              {days.length} día{days.length !== 1 ? 's' : ''} seleccionado{days.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setStep('hours')}
              disabled={days.length === 0}
              className="btn btn-primary pressable"
              style={{ width: '100%', opacity: days.length === 0 ? 0.5 : 1 }}
            >
              Continuar
            </button>
            <button onClick={handleSkip} className="pressable" style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 12 }}>
              Configurar esto más tarde
            </button>
          </div>
        )}

        {step === 'hours' && (
          <div style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 8 }}>Paso 2 de 2</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>¿De qué hora a qué hora?</h1>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, margin: '0 0 22px' }}>
              Fuera de este rango, en los días que elegiste, también lo bloqueamos automáticamente.
            </p>
            <div style={{ display: 'flex', gap: 14, marginBottom: 26 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Desde</label>
                <select value={hourStart} onChange={(e) => setHourStart(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.05)', color: '#fff' }}>
                  {HOURS.map((h) => <option key={h} value={h} style={{ color: '#000' }}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Hasta</label>
                <select value={hourEnd} onChange={(e) => setHourEnd(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.05)', color: '#fff' }}>
                  {HOURS.filter((h) => h > hourStart).map((h) => <option key={h} value={h} style={{ color: '#000' }}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: 'rgba(62,207,178,.08)', border: '1px solid rgba(62,207,178,.25)', borderRadius: 10, padding: '11px 13px', marginBottom: 22, fontSize: 12.5, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>
              Vamos a bloquear todo lo anterior a las {String(hourStart).padStart(2, '0')}:00 y posterior a las {String(hourEnd).padStart(2, '0')}:00, en los días que elegiste. Esto lo podés cambiar cuando quieras desde Perfil.
            </div>
            <button onClick={handleConfirmHours} className="btn btn-primary pressable" style={{ width: '100%' }}>
              Confirmar y armar mi agenda
            </button>
            <button onClick={() => setStep('days')} className="pressable" style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 12 }}>
              ‹ Volver
            </button>
          </div>
        )}

        {step === 'saving' && (
          <div style={{ textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
            <div
              style={{
                width: 40, height: 40, margin: '0 auto 20px', borderRadius: '50%',
                border: '3px solid rgba(62,207,178,.2)', borderTopColor: 'var(--teal)',
                animation: 'onboardSpin 0.8s linear infinite',
              }}
            />
            <style>{'@keyframes onboardSpin { to { transform: rotate(360deg); } }'}</style>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Armando tu agenda</h2>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Estamos bloqueando los horarios fuera de tu disponibilidad para los próximos 180 días. Esto tarda unos segundos.
            </p>
          </div>
        )}

        {step === 'tour' && (
          <div style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
            {TOUR_STEPS.map((s, i) => {
              if (i !== tourIndex) return null;
              const Icon = s.icon;
              return (
                <div key={i}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(62,207,178,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                    <Icon size={24} color="var(--teal)" />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Cómo agendar un turno · {i + 1} de {TOUR_STEPS.length}
                  </div>
                  <h2 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 10px' }}>{s.title}</h2>
                  <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 14, lineHeight: 1.55, margin: '0 0 26px' }}>{s.text}</p>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {TOUR_STEPS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= tourIndex ? 'var(--teal)' : 'rgba(255,255,255,.15)' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {tourIndex > 0 && (
                <button
                  onClick={() => setTourIndex((v) => v - 1)}
                  className="btn pressable"
                  style={{ background: 'rgba(255,255,255,.08)', color: '#fff' }}
                >
                  ‹ Atrás
                </button>
              )}
              <button
                onClick={() => (tourIndex < TOUR_STEPS.length - 1 ? setTourIndex((v) => v + 1) : finishTour())}
                className="btn btn-primary pressable"
                style={{ flex: 1 }}
              >
                {tourIndex < TOUR_STEPS.length - 1 ? 'Siguiente' : 'Empezar a usar la agenda'}
              </button>
            </div>
            {tourIndex < TOUR_STEPS.length - 1 && (
              <button onClick={finishTour} className="pressable" style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 12 }}>
                Saltear el recorrido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
