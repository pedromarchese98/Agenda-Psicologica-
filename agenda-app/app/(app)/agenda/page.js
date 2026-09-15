import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AppointmentRow from './AppointmentRow';
import NewAppointmentForm from './NewAppointmentForm';

function pad(n) {
  return String(n).padStart(2, '0');
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toDateStr(d);
}
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export default async function AgendaPage({ searchParams }) {
  const dateStr = searchParams?.date || toDateStr(new Date());
  const supabase = createClient();

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, patients(first_name, last_name)')
    .eq('date', dateStr)
    .order('time', { ascending: true });

  const patientAppts = (appointments || []).filter((a) => a.type === 'patient');
  const blocks = (appointments || []).filter((a) => a.type === 'block');

  const d = new Date(dateStr + 'T00:00:00');
  const label = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;

  return (
    <div style={{ padding: '16px 16px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href={`/agenda?date=${addDays(dateStr, -1)}`} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          ‹
        </Link>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
          {label}
        </div>
        <Link href={`/agenda?date=${addDays(dateStr, 1)}`} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
          ›
        </Link>
      </div>

      {dateStr !== toDateStr(new Date()) && (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <Link href="/agenda" style={{ fontSize: 13, color: 'var(--teal-dk)', fontWeight: 700 }}>
            Volver a hoy
          </Link>
        </div>
      )}

      <NewAppointmentForm defaultDate={dateStr} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {patientAppts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-lt)', fontSize: 14, padding: '30px 0' }}>
            No hay turnos agendados este día.
          </div>
        )}
        {patientAppts.map((appt) => (
          <AppointmentRow key={appt.id} appt={appt} />
        ))}
        {blocks.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 6 }}>
              Horarios bloqueados
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {blocks.map((b) => (
                <span
                  key={b.id}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-md)',
                    background: '#ECEFF6',
                    borderRadius: 8,
                    padding: '5px 9px',
                  }}
                >
                  🚫 {b.time?.slice(0, 5)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
