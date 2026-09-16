import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import AvailabilityView from './AvailabilityView';
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
function isWeekend(d) {
  return d.getDay() === 0 || d.getDay() === 6;
}
function addWeeks(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n * 7);
  return toDateStr(d);
}
function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return toDateStr(d);
}
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export default async function AgendaPage({ searchParams }) {
  const dateStr = searchParams?.date || toDateStr(new Date());
  const view = searchParams?.view || 'day';
  const supabase = createClient();
  const d = new Date(dateStr + 'T00:00:00');
  const todayKey = toDateStr(new Date());

  const prevHref =
    view === 'week' ? `/agenda?view=week&date=${addWeeks(dateStr, -1)}` :
    view === 'month' ? `/agenda?view=month&date=${addMonths(dateStr, -1)}` :
    `/agenda?view=day&date=${addDays(dateStr, -1)}`;
  const nextHref =
    view === 'week' ? `/agenda?view=week&date=${addWeeks(dateStr, 1)}` :
    view === 'month' ? `/agenda?view=month&date=${addMonths(dateStr, 1)}` :
    `/agenda?view=day&date=${addDays(dateStr, 1)}`;
  const todayHref = `/agenda?view=${view}&date=${todayKey}`;

  let body = null;
  let navLabel = '';

  if (view === 'day') {
    const [{ data: appointments }, { data: blocks }, { data: others }, { data: patients }] = await Promise.all([
      supabase.from('appointments').select('*, patients(first_name, last_name)').eq('date', dateStr).eq('type', 'patient').order('time', { ascending: true }),
      supabase.from('appointments').select('*').eq('date', dateStr).eq('type', 'block').order('time', { ascending: true }),
      supabase.from('appointments').select('*').eq('date', dateStr).eq('type', 'other').order('time', { ascending: true }),
      supabase.from('patients').select('id, first_name, last_name').order('first_name', { ascending: true }),
    ]);
    navLabel = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
    body = <DayView dateStr={dateStr} appointments={appointments || []} blocks={blocks || []} others={others || []} patients={patients || []} />;
  }

  if (view === 'week') {
    const dow = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow - 1));
    const days = [];
    for (let i = 0; i < 5; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      days.push({ key: toDateStr(cur), day: cur.getDate() });
    }
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    navLabel = `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()].slice(0, 3)} – ${friday.getDate()} ${MONTH_NAMES[friday.getMonth()].slice(0, 3)}`;

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*, patients(first_name, last_name)')
      .eq('type', 'patient')
      .gte('date', days[0].key).lte('date', days[4].key);

    const appointmentsByDate = {};
    (appointments || []).forEach((a) => {
      if (!appointmentsByDate[a.date]) appointmentsByDate[a.date] = [];
      appointmentsByDate[a.date].push(a);
    });
    body = <WeekView days={days} appointmentsByDate={appointmentsByDate} />;
  }

  if (view === 'month') {
    const y = d.getFullYear(), m = d.getMonth();
    navLabel = `${MONTH_NAMES[m]} ${y}`;
    const firstOfMonth = new Date(y, m, 1);
    const lastOfMonth = new Date(y, m + 1, 0);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('date')
      .eq('type', 'patient')
      .gte('date', toDateStr(firstOfMonth)).lte('date', toDateStr(lastOfMonth));

    const countsByDate = {};
    (appointments || []).forEach((a) => { countsByDate[a.date] = (countsByDate[a.date] || 0) + 1; });

    const weeks = [];
    let week = [];
    let fwd = firstOfMonth.getDay() || 7;
    for (let i = 1; i < fwd; i++) week.push(null);
    for (let day = 1; day <= lastOfMonth.getDate(); day++) {
      const cur = new Date(y, m, day);
      if (isWeekend(cur)) continue;
      week.push({ key: toDateStr(cur), day });
      if (week.length === 5) { weeks.push(week); week = []; }
    }
    if (week.length) { while (week.length < 5) week.push(null); weeks.push(week); }

    body = <MonthView weeks={weeks} countsByDate={countsByDate} todayKey={todayKey} />;
  }

  if (view === 'availability') {
    navLabel = 'Disponibilidad — próximos 7 días';
    const start = new Date(todayKey + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const { data: weekAppts } = await supabase
      .from('appointments')
      .select('date, time, type, id')
      .gte('date', todayKey).lte('date', toDateStr(end));

    const byDate = {};
    (weekAppts || []).forEach((a) => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });

    const HOUR_START = 7, HOUR_END = 20;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const key = toDateStr(cur);
      const dayAppts = byDate[key] || [];
      const slots = [];
      for (let h = HOUR_START; h <= HOUR_END; h++) {
        const hStr = pad(h);
        const inHour = dayAppts.filter((a) => a.time?.startsWith(hStr + ':'));
        const patientOne = inHour.find((a) => a.type === 'patient' || a.type === 'other');
        const blockOne = inHour.find((a) => a.type === 'block');
        if (patientOne) slots.push({ time: `${hStr}:00`, status: 'occupied' });
        else if (blockOne) slots.push({ time: `${hStr}:00`, status: 'blocked', id: blockOne.id });
        else slots.push({ time: `${hStr}:00`, status: 'free' });
      }
      days.push({ key, day: cur.getDate(), month: cur.getMonth() + 1, weekday: cur.getDay(), slots });
    }

    body = <AvailabilityView days={days} />;
  }

  const viewLink = (v) => `/agenda?view=${v}&date=${dateStr}`;

  return (
    <SwipeDayNav prevHref={view === 'availability' ? '#' : prevHref} nextHref={view === 'availability' ? '#' : nextHref} dateKey={`${view}-${dateStr}`}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes'], ['availability', 'Disponible']].map(([v, label]) => (
              <Link
                key={v}
                href={viewLink(v)}
                className="pressable"
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  background: view === v ? 'var(--card)' : 'transparent',
                  color: view === v ? 'var(--navy)' : 'var(--text-md)',
                  boxShadow: view === v ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {view !== 'availability' && <Link href={prevHref} className="btn btn-secondary pressable" style={{ padding: '8px 12px' }}>‹</Link>}
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
            {navLabel}
          </div>
          {view !== 'availability' && <Link href={nextHref} className="btn btn-secondary pressable" style={{ padding: '8px 12px' }}>›</Link>}
        </div>

        {dateStr !== todayKey && view !== 'availability' && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Link href={todayHref} style={{ fontSize: 13, color: 'var(--teal-dk)', fontWeight: 700 }}>
              Volver a hoy
            </Link>
          </div>
        )}
      </div>

      {body}
    </SwipeDayNav>
  );
}
