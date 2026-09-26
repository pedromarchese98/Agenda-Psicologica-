import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import SwipeDayNav from './SwipeDayNav';
import OnboardingWizard from '../onboarding/OnboardingWizard';
import { getHolidays } from './holidays';
import { todayISO } from '@/lib/date';

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toDateStr(d);
}
function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }
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
  const dateStr = searchParams?.date || todayISO();
  const view = searchParams?.view || 'day';
  const supabase = createClient();
  const d = new Date(dateStr + 'T00:00:00');
  const todayKey = todayISO();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase.from('settings').select('onboarding_completed').eq('owner_id', user.id).maybeSingle();
  if (!settings?.onboarding_completed) {
    return <OnboardingWizard />;
  }

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

    const [{ data: appointments }, { data: blocksData }, { data: othersData }, { data: patients }] = await Promise.all([
      supabase.from('appointments').select('*, patients(first_name, last_name)').eq('type', 'patient').gte('date', days[0].key).lte('date', days[4].key),
      supabase.from('appointments').select('date, time').eq('type', 'block').gte('date', days[0].key).lte('date', days[4].key),
      supabase.from('appointments').select('*').eq('type', 'other').gte('date', days[0].key).lte('date', days[4].key),
      supabase.from('patients').select('id, first_name, last_name').order('first_name', { ascending: true }),
    ]);

    const appointmentsByDate = {};
    (appointments || []).forEach((a) => {
      if (!appointmentsByDate[a.date]) appointmentsByDate[a.date] = [];
      appointmentsByDate[a.date].push(a);
    });
    const blockedByDate = {};
    (blocksData || []).forEach((b) => {
      if (!blockedByDate[b.date]) blockedByDate[b.date] = [];
      blockedByDate[b.date].push(b);
    });
    const othersByDate = {};
    (othersData || []).forEach((o) => {
      if (!othersByDate[o.date]) othersByDate[o.date] = [];
      othersByDate[o.date].push(o);
    });
    body = <WeekView days={days} appointmentsByDate={appointmentsByDate} blockedByDate={blockedByDate} othersByDate={othersByDate} patients={patients || []} />;
  }

  if (view === 'month') {
    const y = d.getFullYear(), m = d.getMonth();
    navLabel = `${MONTH_NAMES[m]} ${y}`;
    const firstOfMonth = new Date(y, m, 1);
    const lastOfMonth = new Date(y, m + 1, 0);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('date, time, attendance, payment, price, modality, patients(first_name, last_name)')
      .eq('type', 'patient')
      .gte('date', toDateStr(firstOfMonth)).lte('date', toDateStr(lastOfMonth))
      .order('time', { ascending: true });

    const countsByDate = {};
    const appointmentsByDate = {};
    (appointments || []).forEach((a) => {
      countsByDate[a.date] = (countsByDate[a.date] || 0) + 1;
      if (!appointmentsByDate[a.date]) appointmentsByDate[a.date] = [];
      appointmentsByDate[a.date].push(a);
    });

    const weeks = [];
    let week = [];
    let fwd = firstOfMonth.getDay() || 7;
    for (let i = 1; i < fwd; i++) week.push(null);
    for (let day = 1; day <= lastOfMonth.getDate(); day++) {
      const cur = new Date(y, m, day);
      week.push({ key: toDateStr(cur), day, weekend: isWeekend(cur) });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

    const holidaysByDate = await getHolidays(y);

    body = (
      <MonthView
        weeks={weeks}
        countsByDate={countsByDate}
        appointmentsByDate={appointmentsByDate}
        todayKey={todayKey}
        holidaysByDate={holidaysByDate}
      />
    );
  }

  const viewLink = (v) => `/agenda?view=${v}&date=${dateStr}`;

  return (
    <SwipeDayNav prevHref={prevHref} nextHref={nextHref} dateKey={`${view}-${dateStr}`}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div className="segmented">
            {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([v, label]) => (
              <Link key={v} href={viewLink(v)} className={`pressable segmented-item${view === v ? ' active' : ''}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Link href={prevHref} className="btn btn-secondary pressable" style={{ padding: '8px 12px' }}>‹</Link>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
            {navLabel}
          </div>
          <Link href={nextHref} className="btn btn-secondary pressable" style={{ padding: '8px 12px' }}>›</Link>
        </div>

        {dateStr !== todayKey && (
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
