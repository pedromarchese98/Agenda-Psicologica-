'use client';

import Link from 'next/link';
import {
  Calendar, CalendarClock, Users, BarChart3, ShieldCheck,
  Check, Sparkles,
} from 'lucide-react';
import { useReveal } from './useReveal';
import { APP_NAME, LogoIcon } from '@/lib/brand';

function Reveal({ children, delay, className = '', style }) {
  const { ref, inView } = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal${delay ? ` reveal-delay-${delay}` : ''}${inView ? ' in-view' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  {
    icon: Calendar,
    title: 'Día, semana y mes en el mismo lenguaje visual',
    text: 'Arrastrá un turno para reprogramarlo y la app avisa sola si se superpone con otro. Series semanales y quincenales se cargan solas.',
    bullets: ['Arrastrar y soltar para reagendar en el momento', 'Aviso automático ante turnos superpuestos', 'Series con excepciones: una sesión o todas las futuras'],
    mock: 'agenda',
  },
  {
    icon: CalendarClock,
    title: 'Encontrá un hueco en segundos',
    text: 'Todos los horarios disponibles de las próximas 4 semanas, de un vistazo — sin recorrer el calendario día por día.',
    bullets: ['4 semanas de disponibilidad de un vistazo', 'Bloqueá los horarios que no atendés'],
    mock: 'free',
  },
  {
    icon: Users,
    title: 'Un panel de pacientes que se explica solo',
    text: 'Filtrá por estado, sumá pacientes sin salir de la sección y editá el precio de sesión por modalidad, virtual y presencial.',
    bullets: ['Estados claros: activo, en pausa, cerrado', 'Precio independiente por modalidad', 'Cambiar de semanal a quincenal en dos toques'],
    mock: 'patients',
  },
  {
    icon: BarChart3,
    title: 'Facturación proyectada, sin planillas',
    text: 'Cuánto vas a facturar este mes y los siguientes, quién te debe sesiones y tu tasa real de cancelaciones por día.',
    bullets: ['Proyección de facturación mes a mes', 'Deudores agrupados por paciente', 'Cancelaciones por día de la semana, en %'],
    mock: 'analytics',
  },
  {
    icon: ShieldCheck,
    title: 'Pensada para crecer con tu equipo',
    text: 'Cada profesional tiene su propia agenda, sus pacientes y su información, totalmente aislada y privada.',
    bullets: ['Datos aislados por profesional', 'Alta en minutos, sin instalar nada', 'Se instala como app en iPhone y iPad'],
    mock: 'team',
  },
];

function MockAgenda() {
  const rows = [
    { t: '10:00', name: 'Juan Pedro', sub: 'Virtual · semanal', badge: 'Confirmado' },
    { t: '11:00', name: 'Micaela Fontana', sub: 'Presencial · quincenal', badge: 'Confirmado' },
    { t: '12:00', name: 'Turno libre', sub: 'Disponible para agendar', free: true },
    { t: '15:00', name: 'Valentina G.', sub: 'Virtual · semanal', badge: 'Confirmado' },
  ];
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div
          key={r.t}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
            borderRadius: 'var(--radius-md)',
            border: r.free ? '1px dashed var(--border)' : '1px solid var(--border)',
            background: r.free ? 'transparent' : 'var(--surface)',
          }}
        >
          <span className="mock-time">{r.t}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-lt)' }}>{r.sub}</div>
          </div>
          {r.badge && <span className="badge badge-teal">{r.badge}</span>}
        </div>
      ))}
    </div>
  );
}

function MockFreeSlots() {
  const weeks = [
    ['09:00', '10:00', '14:00'],
    ['08:00', '11:00', '15:00', '16:00'],
    ['09:00', '13:00'],
  ];
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {weeks.map((slots, i) => (
        <div key={i}>
          <div style={{ fontSize: 10, color: 'var(--text-lt)', marginBottom: 5, fontWeight: 700 }}>Semana {i + 1}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {slots.map((s) => (
              <span key={s} className="badge badge-teal">{s}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockPatients() {
  const patients = [
    { name: 'Juan Pedro', badge: 'Virtual · $18.000' },
    { name: 'Micaela Fontana', badge: 'Presencial · $20.000' },
    { name: 'Valentina G.', badge: 'Virtual · $18.000' },
  ];
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {patients.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'var(--navy)',
            color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11.5, fontWeight: 800, flex: 'none',
          }}>
            {p.name[0]}
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-lt)' }}>{p.badge}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockAnalytics() {
  const kpis = [
    { l: 'Proyectado', v: '$412k' },
    { l: 'Asistencia', v: '94%' },
    { l: 'Pendiente', v: '$36k' },
    { l: 'Cancelación', v: '6%' },
  ];
  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {kpis.map((k) => (
        <div key={k.l} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{k.v}</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-lt)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.03em' }}>{k.l}</div>
        </div>
      ))}
    </div>
  );
}

function MockTeam() {
  const members = [{ i: 'DG', n: 'Delfina' }, { i: 'AR', n: 'Agustín' }, { i: '+', n: 'Sumar' }];
  return (
    <div style={{ padding: 16, display: 'flex', gap: 8 }}>
      {members.map((m) => (
        <div key={m.n} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
            background: 'var(--navy)', color: 'var(--teal)',
            fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{m.i}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700 }}>{m.n}</div>
        </div>
      ))}
    </div>
  );
}

const MOCKS = { agenda: MockAgenda, free: MockFreeSlots, patients: MockPatients, analytics: MockAnalytics, team: MockTeam };

export default function Landing() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)' }}>
      <style>{`
        .l-wrap { max-width: 1120px; margin: 0 auto; padding-inline: 20px; }
        .l-feature { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center; }
        @media (min-width: 900px) {
          .l-feature { grid-template-columns: 1fr 1fr; gap: 56px; }
          .l-feature.rev .f-copy { order: 2; }
          .l-feature.rev .f-visual { order: 1; }
          .l-hero-grid { grid-template-columns: 1.05fr 1fr; gap: 48px; text-align: left !important; }
          .l-hero-grid .l-hero-cta, .l-hero-grid .l-eyebrow { justify-content: flex-start !important; }
        }
        .l-hero-grid { display: grid; grid-template-columns: 1fr; gap: 36px; align-items: center; }
      `}</style>

      {/* Nav */}
      <nav className="landing-nav">
        <div className="l-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 15 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, flex: 'none',
              background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogoIcon size={15} color="var(--teal)" />
            </span>
            {APP_NAME}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login" className="btn btn-secondary pressable" style={{ fontSize: 13 }}>Iniciar sesión</Link>
            <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 13 }}>Registrate</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="l-wrap" style={{ padding: '64px 20px 56px' }}>
        <Reveal className="l-hero-grid" style={{ display: 'grid' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="l-eyebrow" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              background: 'var(--teal-tint)', color: 'var(--teal-dk)', padding: '5px 14px',
              borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 18,
            }}>
              <Sparkles size={13} /> Pensada para el consultorio real
            </div>
            <h1 className="landing-hero">
              Tu agenda,<br />sin fricción<span className="accent">.</span>
            </h1>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-md)', marginTop: 14, fontStyle: 'italic' }}>
              Hecha por y para psicólogos.
            </p>
            <p style={{ color: 'var(--text-md)', fontSize: 15, maxWidth: 420, margin: '14px auto 0', lineHeight: 1.55 }}>
              Turnos, pacientes, cobros y estadísticas en un solo lugar — pensada para manejarse con el pulgar entre sesión y sesión.
            </p>
            <div className="l-hero-cta" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
              <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 14, padding: '13px 24px' }}>
                Crear mi cuenta
              </Link>
              <Link href="/login" className="btn btn-secondary pressable" style={{ fontSize: 14, padding: '13px 24px' }}>
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          <div className="mock-window">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-lt)' }}>Jueves 24 de septiembre</span>
              <span style={{ width: 16 }} />
            </div>
            <MockAgenda />
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="l-wrap" style={{ padding: '32px 20px 72px', display: 'flex', flexDirection: 'column', gap: 64 }}>
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const Mock = MOCKS[f.mock];
          return (
            <div key={f.title} className={`l-feature${f.mock === 'patients' || f.mock === 'team' ? ' rev' : ''}`}>
              <Reveal className="f-copy">
                <div style={{
                  width: 40, height: 40, borderRadius: 11, background: 'var(--navy)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                }}>
                  <Icon size={19} color="var(--teal)" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{f.title}</h2>
                <p style={{ fontSize: 14.5, color: 'var(--text-md)', lineHeight: 1.55, margin: '0 0 16px', maxWidth: '42ch' }}>{f.text}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.bullets.map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text)' }}>
                      <Check size={15} color="var(--teal-dk)" style={{ flexShrink: 0, marginTop: 2 }} />
                      {b}
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal className="f-visual mock-window">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                    {f.mock === 'agenda' && 'Agenda'}
                    {f.mock === 'free' && 'Turnos libres'}
                    {f.mock === 'patients' && 'Pacientes'}
                    {f.mock === 'analytics' && 'Análisis'}
                    {f.mock === 'team' && 'Equipo'}
                  </span>
                </div>
                <Mock />
              </Reveal>
            </div>
          );
        })}
      </section>

      {/* Closing CTA */}
      <section style={{ background: 'var(--navy)', padding: '64px 20px', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, margin: '0 auto 12px', maxWidth: 420 }}>
            Dejá de armar tu agenda a mano.
          </h2>
          <p style={{ color: 'rgba(255,255,255,.62)', fontSize: 14.5, maxWidth: 380, margin: '0 auto 26px', lineHeight: 1.55 }}>
            Migramos tu historial completo de turnos y pacientes. Empezar toma diez minutos.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 14, padding: '13px 26px' }}>
              Crear mi cuenta gratis
            </Link>
            <Link
              href="/login"
              className="btn pressable"
              style={{ fontSize: 14, padding: '13px 26px', background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}
            >
              Ya tengo cuenta
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="l-wrap" style={{ padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-lt)' }}>
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
        <span>Hecha por y para psicólogos</span>
      </footer>
    </div>
  );
}
