import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DayView from './DayView';
import SwipeDayNav from './SwipeDayNav';

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

  // Solo turnos de pacientes: los bloqueos no se muestran (no aportan nada al día a día).
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, patients(first_name, last_name)')
    .eq('date', dateStr)
    .eq('type', 'patient')
    .order('time', { ascending: true });

  const d = new Date(dateStr + 'T00:00:00');
  const label = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
  const prevHref = `/agenda?date=${addDays(dateStr, -1)}`;
  const nextHref = `/agenda?date=${addDays(dateStr, 1)}`;

  return (
    <SwipeDayNav prevHref={prevHref} nextHref={nextHref} dateKey={dateStr}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Link href={prevHref} className="btn btn-secondary pressable" style={{ padding: '8px 12px' }}>
            ‹
          </Link>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
            {label}
          </div>
          <Link href={nextHref} className="btn btn-secondary pressable" style={{ padding: '8px 12px' }}>
            ›
          </Link>
        </div>

        {dateStr !== toDateStr(new Date()) && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Link href="/agenda" style={{ fontSize: 13, color: 'var(--teal-dk)', fontWeight: 700 }}>
              Volver a hoy
            </Link>
          </div>
        )}
      </div>

      <DayView dateStr={dateStr} appointments={appointments || []} />
    </SwipeDayNav>
  );
}
