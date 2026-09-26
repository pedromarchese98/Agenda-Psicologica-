'use client';

import Link from 'next/link';
import { Calendar, Users, BarChart3, Check, Sparkles } from 'lucide-react';
import { useReveal } from './useReveal';
import { APP_NAME, APP_TAGLINE, LogoIcon } from '@/lib/brand';

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
    text: 'Cada vista muestra exactamente lo que necesitás ver, sin recargar la pantalla. Arrastrá un turno para reprogramarlo y la app avisa sola si se superpone con otro.',
    bullets: [
      'Arrastrar y soltar para reagendar en el momento',
      'Aviso automático ante turnos superpuestos',
      'Turnos que se repiten solos: si una semana cambia, movés esa sesión sin tocar el resto',
    ],
    mock: 'agenda',
  },
  {
    icon: Users,
    title: 'Un panel de pacientes que se explica solo',
    text: 'Filtrá por estado, sumá pacientes nuevos sin salir de la sección y editá el precio de sesión por modalidad, virtual y presencial, en el momento.',
    bullets: ['Estados claros: activo, en pausa, cerrado', 'Precio independiente por modalidad', 'Cambiar de semanal a quincenal en dos toques'],
    mock: 'patients',
  },
  {
    icon: BarChart3,
    title: 'Facturación proyectada, sin planillas',
    text: 'Vas a saber cuánto vas a facturar este mes y los siguientes, quién te debe sesiones y cuál es tu tasa real de cancelaciones por día.',
    bullets: [
      'Proyección de facturación mes a mes',
      'Deudores agrupados por paciente',
      'Análisis de tus sesiones: qué días se cancela más y cómo viene la asistencia',
    ],
    mock: 'analytics',
  },
];

const eyebrowStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, letterSpacing: '.04em',
  color: 'var(--teal-dk)', background: 'var(--teal-tint)', padding: '5px 12px', borderRadius: 999, marginBottom: 20,
};
const faint = { fontSize: 11, color: 'var(--text-lt)' };
const fvHeadLabel = { fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', letterSpacing: '.04em' };

function Avatar({ letter, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: 'none', background: 'linear-gradient(155deg, var(--navy), var(--navy-soft))',
      color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {letter}
    </div>
  );
}

function ActiveBadge({ children }) {
  return (
    <span className="badge badge-teal" style={{ fontSize: 10.5, padding: '3px 8px', marginLeft: 'auto', flex: 'none' }}>
      <span className="dot" />{children}
    </span>
  );
}

function HeroMock() {
  const rows = [
    { t: '10:00', name: 'Juan', sub: 'Virtual · semanal' },
    { t: '11:00', name: 'Micaela', sub: 'Presencial · quincenal' },
    { t: '12:00', name: 'Turno libre', sub: 'Disponible para agendar', free: true },
    { t: '15:00', name: 'Valentina', sub: 'Virtual · semanal' },
  ];
  return (
    <div className="mock-window">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', gap: 6 }}><span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" /></div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-lt)' }}>Jueves 24 de septiembre</span>
        <span style={{ width: 16 }} />
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.t} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', background: 'var(--surface)' }}>
            <span className="mock-time">{r.t}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              <div style={{ ...faint, marginTop: 1 }}>{r.sub}</div>
            </div>
            {r.free
              ? <span className="badge" style={{ marginLeft: 'auto', fontSize: 10.5, padding: '3px 8px', background: 'var(--muted)', color: 'var(--text-lt)', border: '1px dashed var(--border)' }}>Libre</span>
              : <ActiveBadge>Confirmado</ActiveBadge>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MockAgenda() {
  const slots = [
    { t: '09:00', name: 'Luca' },
    { t: '10:00', free: true },
    { t: '11:00', name: 'Agustín' },
    { t: '12:00', free: true },
    { t: '13:00', name: 'Reunión con colegio', event: true },
  ];
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={fvHeadLabel}>Agenda</span>
        <div className="segmented">
          {['Día', 'Semana', 'Mes'].map((l, i) => (
            <span key={l} className={`segmented-item${i === 0 ? ' active' : ''}`} style={{ fontSize: 11, padding: '5px 11px', cursor: 'default' }}>{l}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slots.map((s) => (
          <div
            key={s.t}
            className={s.free ? 'mono' : undefined}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 11px', borderRadius: 'var(--radius-md)', fontSize: 12.5,
              border: s.free ? '1px dashed var(--border)' : '1px solid var(--border-soft)',
              background: s.free ? 'transparent' : 'var(--surface)', color: s.free ? 'var(--text-lt)' : 'var(--text)',
            }}
          >
            {s.t} — {s.free ? 'libre' : s.name}
            {!s.free && (s.event
              ? <span className="badge" style={{ fontSize: 10.5, padding: '3px 8px', background: 'var(--muted)', color: 'var(--text-lt)', border: '1px dashed var(--border)' }}>Evento</span>
              : <span className="badge badge-teal" style={{ padding: '3px 6px' }}><span className="dot" /></span>)}
          </div>
        ))}
      </div>
    </>
  );
}

function MockPatients() {
  const patients = [
    ['Juan', 'Virtual · $40.000'], ['Micaela', 'Presencial · $45.000'],
    ['Valentina', 'Virtual · $40.000'], ['Luca', 'Presencial · $45.000'],
  ];
  return (
    <>
      <div style={{ ...fvHeadLabel, marginBottom: 14 }}>Pacientes · activos (12)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {patients.map(([n, sub]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px' }}>
            <Avatar letter={n[0]} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
              <div style={faint}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function MockAnalytics() {
  const kpis = [['$1,9M', 'Proyectado', true], ['94%', 'Asistencia'], ['$170k', 'Pendiente'], ['6%', 'Cancelación']];
  const debtors = [
    ['Juan', ['Lun 8/9', 'Lun 15/9'], '$80.000', '2 sesiones'],
    ['Micaela', ['Mié 10/9'], '$45.000', '1 sesión'],
    ['Luca', ['Mié 17/9'], '$45.000', '1 sesión'],
  ];
  return (
    <>
      <div style={{ ...fvHeadLabel, marginBottom: 14 }}>Análisis · septiembre</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {kpis.map(([v, l, up]) => (
          <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: up ? 'var(--teal-dk)' : 'var(--text)' }}>{v}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-lt)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.03em' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '16px 0 8px', ...fvHeadLabel }}>
        <span>Deudores</span>
        <span className="mono" style={{ color: 'var(--warning)', textTransform: 'none', letterSpacing: 0 }}>$170.000</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {debtors.map(([n, chips, amt, count]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
            <Avatar letter={n[0]} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {chips.map((c) => (
                  <span key={c} className="mono" style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'var(--warning-tint)', color: 'var(--warning-text)' }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right', flex: 'none' }}>
              <div className="mono" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--warning)' }}>{amt}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-lt)' }}>{count}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const MOCKS = { agenda: MockAgenda, patients: MockPatients, analytics: MockAnalytics };

export default function Landing() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)' }}>
      <style>{`
        .l-wrap { max-width: 1120px; margin: 0 auto; padding-inline: 20px; }
        .l-section { padding-block: 88px; }
        .l-hero-grid { display: grid; grid-template-columns: 1fr; gap: 44px; align-items: center; }
        .l-feature { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; }
        @media (min-width: 920px) {
          .l-hero-grid { grid-template-columns: 1.05fr 1fr; gap: 56px; }
          .l-feature { grid-template-columns: 1fr 1fr; gap: 64px; }
          .l-feature.rev .f-copy { order: 2; }
          .l-feature.rev .f-visual { order: 1; }
        }
        @media (max-width: 640px) {
          .l-section { padding-block: 56px; }
          .l-hero { padding-block: 44px 36px !important; }
          .l-closing { padding-block: 64px !important; }
        }
      `}</style>

      <header className="landing-nav">
        <div className="l-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 15, letterSpacing: '-.01em' }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, flex: 'none',
              background: 'linear-gradient(155deg, var(--navy), var(--navy-soft))', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogoIcon size={15} color="var(--teal)" />
            </span>
            {APP_NAME}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/login" className="btn btn-ghost pressable" style={{ fontSize: 14, padding: '10px 12px', whiteSpace: 'nowrap' }}>Iniciar sesión</Link>
            <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 14, padding: '10px 20px' }}>Registrate</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="l-hero" style={{ paddingBlock: '76px 60px' }}>
          <Reveal className="l-wrap l-hero-grid">
            <div>
              <span style={eyebrowStyle}><Sparkles size={13} /> Pensada para el consultorio real</span>
              <div className="landing-hero">
                <h1>Tu agenda,<br />sin fricción<span className="accent">.</span></h1>
              </div>
              <p style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-md)', marginTop: 18, fontStyle: 'italic' }}>
                {APP_TAGLINE}.
              </p>
              <p style={{ fontSize: 16, color: 'var(--text-md)', marginTop: 16, maxWidth: '46ch', lineHeight: 1.55 }}>
                Turnos, pacientes, cobros y estadísticas en un solo lugar — pensada para manejarse con el pulgar entre sesión y sesión.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
                <Link href="/login?mode=signup" className="btn btn-primary btn-lg pressable">Crear mi cuenta</Link>
                <a href="#features" className="btn btn-ghost btn-lg pressable">Ver cómo funciona →</a>
              </div>
            </div>
            <HeroMock />
          </Reveal>
        </section>

        {/* Features */}
        <div id="features">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const Mock = MOCKS[f.mock];
            return (
              <section key={f.title} className="l-section">
                <div className={`l-wrap l-feature${i % 2 === 1 ? ' rev' : ''}`}>
                  <Reveal className="f-copy">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <Icon size={21} color="var(--teal)" />
                    </div>
                    <h2 style={{ fontSize: 27, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-.03em', textWrap: 'balance' }}>{f.title}</h2>
                    <p style={{ fontSize: 15, color: 'var(--text-md)', maxWidth: '44ch', margin: '0 0 18px', lineHeight: 1.55 }}>{f.text}</p>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
                      {f.bullets.map((b) => (
                        <li key={b} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5 }}>
                          <Check size={16} color="var(--teal-dk)" strokeWidth={2.5} style={{ flex: 'none', marginTop: 2 }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                  <Reveal className="f-visual f-visual-card" delay={1}>
                    <Mock />
                  </Reveal>
                </div>
              </section>
            );
          })}
        </div>

        {/* Cierre */}
        <section className="l-closing" style={{ textAlign: 'center', paddingBlock: 96 }}>
          <Reveal className="l-wrap">
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-.03em', maxWidth: '24ch', margin: '0 auto 14px', textWrap: 'balance' }}>
              Dejá de armar tu agenda a mano y en <span style={{ color: 'var(--teal-dk)' }}>Excels interminables</span>.
            </h2>
            <p style={{ color: 'var(--text-md)', fontSize: 15, maxWidth: '44ch', margin: '0 auto 28px', lineHeight: 1.55 }}>
              Migramos tu historial completo de turnos y pacientes. Empezar toma diez minutos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/login?mode=signup" className="btn btn-primary btn-lg pressable">Crear mi cuenta gratis</Link>
              <Link href="/login" className="btn btn-ghost btn-lg pressable">Ya tengo cuenta</Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-soft)', paddingBlock: 32 }}>
        <div className="l-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12.5, color: 'var(--text-lt)' }}>
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <span>{APP_TAGLINE}</span>
        </div>
      </footer>
    </div>
  );
}
