import { createClient } from '@/lib/supabase/server';
import AvailabilityList from './AvailabilityList';

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }

const HOUR_START = 7, HOUR_END = 20;
const WEEKS_AHEAD = 4;

export default async function DisponiblesPage() {
  const supabase = createClient();
  const today = new Date();
  const todayKey = toDateStr(today);

  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + WEEKS_AHEAD * 7 - 1);

  const { data: weekAppts } = await supabase
    .from('appointments')
    .select('id, date, time, type, attendance')
    .gte('date', todayKey).lte('date', toDateStr(windowEnd))
    .in('type', ['patient', 'other', 'block']);

  const byDate = {};
  (weekAppts || []).forEach((a) => {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  });

  const days = [];
  for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
    const cur = new Date(today);
    cur.setDate(today.getDate() + i);
    if (isWeekend(cur)) continue;
    const key = toDateStr(cur);
    const dayAppts = byDate[key] || [];
    const freeSlots = [];
    const blockedSlots = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      const hStr = pad(h);
      const inHour = dayAppts.filter((a) => a.time?.startsWith(hStr + ':'));
      const blockRow = inHour.find((a) => a.type === 'block');
      // Un turno tipo "patient" cancelado (no-free) no cuenta como ocupado: el horario queda libre.
      const isOccupied = inHour.some((a) => (a.type === 'patient' && a.attendance !== 'no-free') || a.type === 'other');
      if (blockRow) blockedSlots.push({ time: `${hStr}:00`, id: blockRow.id });
      else if (!isOccupied) freeSlots.push(`${hStr}:00`);
    }
    days.push({ key, day: cur.getDate(), month: cur.getMonth() + 1, weekday: cur.getDay(), freeSlots, blockedSlots });
  }

  return <AvailabilityList days={days} />;
}
