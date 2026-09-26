import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return addDays(dateStr, -((d.getDay() || 7) - 1));
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
const DAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

// Precio sugerido por paciente y modalidad: el último precio que tuvo cada uno.
// Si el paciente no tiene historial en esa modalidad, se usa el último precio de cualquier paciente
// (o el precio por defecto guardado en la configuración, si existe).
async function loadPriceHints(supabase, settings) {
  const { data } = await supabase
    .from('appointments')
    .select('patient_id, modality, price')
    .eq('type', 'patient')
    .gt('price', 0)
    .order('date', { ascending: false })
    .limit(1500);
  const byPatient = {};
  const fallback = {
    virtual: Number(settings?.price_virtual) || null,
    presencial: Number(settings?.price_presencial) || null,
  };
  const seenFallback = {};
  (data || []).forEach((a) => {
    if (!a.modality) return;
    if (!byPatient[a.patient_id]) byPatient[a.patient_id] = {};
    if (byPatient[a.patient_id][a.modality] == null) byPatient[a.patient_id][a.modality] = Number(a.price);
    if (!seenFallback[a.modality]) { fallback[a.modality] = Number(a.price); seenFallback[a.modality] = true; }
  });
  return { byPatient, fallback };
}

export default async function AgendaPage({ searchParams }) {
  const dateStr = searchParams?.date || todayISO();
  const view = searchParams?.view || 'day';
  const supabase = createClient();
  const d = new Date(dateStr + 'T00:00:00');
  const todayKey = todayISO();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase.from('settings').select('onboarding_completed, price_virtual, price_presencial').eq('owner_id', user.id).maybeSingle();
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
    const [{ data: appointments }, { data: blocks }, { data: others }, { data: patients }, priceHints] = await Promise.all([
      supabase.from('appointments').select('*, patients(first_name, last_name)').eq('date', dateStr).eq('type', 'patient').order('time', { ascending: true }),
      supabase.from('appointments').select('*').eq('date', dateStr).eq('type', 'block').order('time', { ascending: true }),
      supabase.from('appointments').select('*').eq('date', dateStr).eq('type', 'other').order('time', { ascending: true }),
      supabase.from('patients').select('id, first_name, last_name, status').order('first_name', { ascending: true }),
      loadPriceHints(supabase, settings),
    ]);
    navLabel = `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
    body = <DayView dateStr={dateStr} appointments={appointments || []} blocks={blocks || []} others={others || []} patients={patients || []} priceHints={priceHints} />;
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
    navLabel = monday.getMonth() === friday.getMonth()
      ? `${monday.getDate()} — ${friday.getDate()} ${MONTH_SHORT[friday.getMonth()]}`
      : `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]} — ${friday.getDate()} ${MONTH_SHORT[friday.getMonth()]}`;

    const [{ data: appointments }, { data: blocksData }, { data: othersData }, { data: patients }, priceHints] = await Promise.all([
      supabase.from('appointments').select('*, patients(first_name, last_name)').eq('type', 'patient').gte('date', days[0].key).lte('date', days[4].key),
      supabase.from('appointments').select('date, time').eq('type', 'block').gte('date', days[0].key).lte('date', days[4].key),
      supabase.from('appointments').select('*').eq('type', 'other').gte('date', days[0].key).lte('date', days[4].key),
      supabase.from('patients').select('id, first_name, last_name, status').order('first_name', { ascending: true }),
      loadPriceHints(supabase, settings),
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
    body = <WeekView days={days} appointmentsByDate={appointmentsByDate} blockedByDate={blockedByDate} othersByDate={othersByDate} patients={patients || []} priceHints={priceHints} />;
  }

  if (view === 'month') {
    const y = d.getFullYear(), m = d.getMonth();
    navLabel = y === new Date(todayKey + 'T00:00:00').getFullYear() ? MONTH_NAMES[m] : `${MONTH_NAMES[m]} ${y}`;
    const firstOfMonth = new Date(y, m, 1);
    const lastOfMonth = new Date(y, m + 1, 0);

    const [{ data: appointments }, { data: othersData }] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, date, time, attendance, payment, price, modality, patients(first_name, last_name)')
        .eq('type', 'patient')
        .gte('date', toDateStr(firstOfMonth)).lte('date', toDateStr(lastOfMonth))
        .order('time', { ascending: true }),
      supabase
        .from('appointments')
        .select('id, date, time, title')
        .eq('type', 'other')
        .gte('date', toDateStr(firstOfMonth)).lte('date', toDateStr(lastOfMonth)),
    ]);

    const appointmentsByDate = {};
    (appointments || []).forEach((a) => {
      if (!appointmentsByDate[a.date]) appointmentsByDate[a.date] = [];
      appointmentsByDate[a.date].push(a);
    });
    const othersByDate = {};
    (othersData || []).forEach((o) => {
      if (!othersByDate[o.date]) othersByDate[o.date] = [];
      othersByDate[o.date].push(o);
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
        appointmentsByDate={appointmentsByDate}
        othersByDate={othersByDate}
        todayKey={todayKey}
        holidaysByDate={holidaysByDate}
      />
    );
  }

  const viewLink = (v) => `/agenda?view=${v}&date=${dateStr}`;

  const isCurrent =
    view === 'month' ? dateStr.slice(0, 7) === todayKey.slice(0, 7) :
    view === 'week' ? mondayOf(dateStr) === mondayOf(todayKey) :
    dateStr === todayKey;

  return (
    <SwipeDayNav prevHref={prevHref} nextHref={nextHref} dateKey={`${view}-${dateStr}`}>
      <div className="agenda-toolbar">
        <div className="date-nav">
          <Link href={prevHref} className="circle-btn pressable" aria-label="Anterior"><ChevronLeft size={15} /></Link>
          <span className="d">{navLabel}</span>
          <Link href={nextHref} className="circle-btn pressable" aria-label="Siguiente"><ChevronRight size={15} /></Link>
          {!isCurrent && (
            <Link href={todayHref} className="today-pill pressable">Hoy</Link>
          )}
        </div>
        <div className="segmented">
          {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([v, label]) => (
            <Link key={v} href={viewLink(v)} className={`pressable segmented-item${view === v ? ' active' : ''}`} style={{ padding: '5px 10px', fontSize: 11 }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {body}
    </SwipeDayNav>
  );
}
