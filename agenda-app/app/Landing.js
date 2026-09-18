'use client';

import Link from 'next/link';
import {
  Calendar, CalendarClock, Users, BarChart3, ShieldCheck, Smartphone,
  Check, TrendingUp, Repeat, Bell,
} from 'lucide-react';
import { useReveal } from './useReveal';

function Reveal({ children, delay, style }) {
  const { ref, inView } = useReveal();
  return (
    <div ref={ref} className={`reveal${delay ? ` reveal-delay-${delay}` : ''}${inView ? ' in-view' : ''}`} style={style}>
      {children}
    </div>
  );
}

const FEATURES = [
  {
    icon: Calendar,
    title: 'Agenda visual, sin fricción',
    text: 'Vistas de Día, Semana y Mes pensadas para el celular. Arrastrá un turno para reprogramarlo, tocá un horario libre para agendar. Nada de formularios largos para lo que hacés todos los días.',
    bullets: ['Arrastrar y soltar para reprogramar', 'Alertas si dos turnos se superponen', 'Series semanales y quincenales automáticas'],
    mock: 'agenda',
  },
  {
    icon: CalendarClock,
    title: 'Encontrá un hueco en segundos',
    text: 'Encontrá un hueco en tu agenda, todos los horarios disponibles de las próximas 4 semanas — sin tener que recorrer el calendario día por día para encontrar un espacio.',
    bullets: ['4 semanas de disponibilidad de un vistazo', 'Bloqueá los horarios de tu agenda'],
    mock: 'free',
  },
  {
    icon: Users,
    title: 'Cada paciente, con su historia completa',
    text: 'Estado del tratamiento, frecuencia de sesiones, notas clínicas y estadísticas de asistencia — todo en una ficha. Cambiar de semanal a quincenal, o pausar por un viaje, es un par de toques.',
    bullets: ['Estadísticas de asistencia y cancelación', 'Cambiar día/horario/frecuencia en un paso', 'Alta, pausa o abandono libera la agenda sola'],
    mock: 'patients',
  },
  {
    icon: BarChart3,
    title: 'Números claros de tu consultorio',
    text: 'Proyección de facturación del mes, evolución de sesiones, deudores con pagos parciales y patrones de cancelación — para tomar decisiones con datos, no a ojo.',
    bullets: ['Proyección de recaudación del mes', 'Deudores con pago total o parcial', 'Tasa de cancelación por día de la semana'],
    mock: 'analytics',
  },
  {
    icon: ShieldCheck,
    title: 'Lista para crecer con tu equipo',
    text: 'Cada profesional tiene su propia agenda, pacientes y precios — completamente aislados y privados, aunque compartan la misma plataforma.',
    bullets: ['Datos privados por profesional', 'Se instala como app en iPhone y iPad', 'Sin planillas, sin excels, todo desde tu celular'],
    mock: 'team',
  },
];

function MockAgenda() {
  const rows = [
    { t: '09:00', label: 'Libre', free: true },
    { t: '10:00', label: 'Carola', color: '#3B6FD9' },
    { t: '11:00', label: 'Libre', free: true },
    { t: '12:00', label: 'Pilar Goyret', color: '#2E9C6A' },
    { t: '13:00', label: 'Santiago · ⚠ superpuesto', color: '#C62828' },
  ];
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r) => (
        <div key={r.t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text-lt)', width: 34 }}>{r.t}</span>
          <div
            style={{
              flex: 1, borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700,
              background: r.free ? '#E6F8F3' : '#F4F6FB',
              color: r.free ? 'var(--teal-dk)' : 'var(--text)',
              borderLeft: r.free ? '2px dashed #9FE0CE' : `4px solid ${r.color}`,
            }}
          >
            {r.label}
          </div>
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
    ['10:00', '12:00', '17:00'],
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
    { name: 'Agustina', status: 'Activo', badge: 'badge-teal', last: 'Última: 12/09' },
    { name: 'Tomás', status: 'Pausado', badge: 'badge-amber', last: 'Última: 30/08' },
    { name: 'Martina', status: 'Alta', badge: 'badge-violet', last: 'Última: 01/07' },
  ];
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {patients.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6F8F3', color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
            {p.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {p.name} <span className={`badge ${p.badge}`}>{p.status}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-lt)' }}>{p.last}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockAnalytics() {
  const bars = [40, 65, 50, 80, 60, 90];
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[{ l: 'Proyección', v: '$540k' }, { l: 'Asistencia', v: '87%' }].map((k) => (
          <div key={k.l} style={{ flex: 1, background: 'var(--surface)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: 'var(--text-lt)', textTransform: 'uppercase', fontWeight: 700 }}>{k.l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--teal)', borderRadius: 3 }} />
        ))}
      </div>
    </div>
  );
}

function MockTeam() {
  return (
    <div style={{ padding: 20, display: 'flex', justifyContent: 'center', gap: -10 }}>
      {['A', 'B', 'C'].map((l, i) => (
        <div
          key={l}
          style={{
            width: 46, height: 46, borderRadius: '50%', background: i === 1 ? 'var(--navy)' : '#E6F8F3',
            color: i === 1 ? 'var(--teal)' : 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, marginLeft: i === 0 ? 0 : -12, border: '2px solid #fff', boxShadow: 'var(--shadow-sm)',
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

const MOCKS = { agenda: MockAgenda, free: MockFreeSlots, patients: MockPatients, analytics: MockAnalytics, team: MockTeam };

export default function Landing() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)' }}>
      {/* Nav */}
      <nav className="landing-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Agenda Psicológica</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/login" className="btn pressable" style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.25)', fontSize: 13, padding: '8px 14px' }}>
            Iniciar sesión
          </Link>
          <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 13, padding: '8px 14px' }}>
            Registrate
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero" style={{ padding: '64px 20px 60px', textAlign: 'center' }}>
        <Reveal>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(62,207,178,.12)', color: 'var(--teal)', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
            <Bell size={13} /> Hecha por y para psicólogos
          </div>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, lineHeight: 1.15, maxWidth: 480, margin: '0 auto 16px', letterSpacing: '-0.02em' }}>
            Tu agenda, tus pacientes y tus números — sin planillas, sin fricción.
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 15, maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.5 }}>
            Agendá con un arrastre, encontrá un hueco libre en segundos y mirá cómo va tu consultorio con números reales — todo desde el celular.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 14, padding: '13px 22px' }}>
              Crear mi cuenta gratis
            </Link>
            <Link href="/login" className="btn pressable" style={{ fontSize: 14, padding: '13px 22px', background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}>
              Ya tengo cuenta
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section style={{ padding: '56px 20px', display: 'flex', flexDirection: 'column', gap: 64, maxWidth: 480, margin: '0 auto' }}>
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          const Mock = MOCKS[f.mock];
          return (
            <Reveal key={f.title}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color="var(--teal)" />
                </div>
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{f.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-md)', lineHeight: 1.55, margin: '0 0 16px' }}>{f.text}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {f.bullets.map((b) => (
                  <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text)' }}>
                    <Check size={15} color="var(--teal-dk)" style={{ flexShrink: 0, marginTop: 1 }} />
                    {b}
                  </div>
                ))}
              </div>
              <div className="mock-window">
                <div style={{ display: 'flex', gap: 5, padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span className="mock-dot" style={{ background: '#FF5F57' }} />
                  <span className="mock-dot" style={{ background: '#FEBC2E' }} />
                  <span className="mock-dot" style={{ background: '#28C840' }} />
                </div>
                <Mock />
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* Closing CTA */}
      <section style={{ background: 'var(--navy)', padding: '56px 20px', textAlign: 'center' }}>
        <Reveal>
          <TrendingUp size={28} color="var(--teal)" style={{ marginBottom: 14 }} />
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>
            Empezá a ordenar tu consultorio hoy
          </h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, maxWidth: 360, margin: '0 auto 26px' }}>
            Creá tu cuenta en un minuto. Tus datos quedan completamente privados, separados de cualquier otro profesional.
          </p>
          <Link href="/login?mode=signup" className="btn btn-primary pressable" style={{ fontSize: 14, padding: '13px 26px' }}>
            Crear mi cuenta gratis
          </Link>
        </Reveal>
      </section>

      <footer style={{ padding: '24px 20px', textAlign: 'center', fontSize: 12, color: 'var(--text-lt)' }}>
        Agenda Psicológica — hecha a medida para tu consultorio.
      </footer>
    </div>
  );
}
