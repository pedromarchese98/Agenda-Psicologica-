import { createClient } from '@/lib/supabase/server';
import AvailabilityList from './AvailabilityList';

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }

const HOUR_START = 7, HOUR_END = 20;

export default async function DisponiblesPage() {
  const supabase = createClient();
  const today = new Date();
  const todayKey = toDateStr(today);

  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 6);

  const { data: weekAppts } = await supabase
    .from('appointments')
    .select('date, time, type')
    .gte('date', todayKey).lte('date', toDateStr(windowEnd))
    .in('type', ['patient', 'other', 'block']);

  const byDate = {};
  (weekAppts || []).forEach((a) => {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  });

  const days = [];
  for (let i = 0; i <= 6; i++) {
    const cur = new Date(today);
    cur.setDate(today.getDate() + i);
    if (isWeekend(cur)) continue;
    const key = toDateStr(cur);
    const dayAppts = byDate[key] || [];
    const freeSlots = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      const hStr = pad(h);
      const occupied = dayAppts.some((a) => a.time?.startsWith(hStr + ':'));
      if (!occupied) freeSlots.push(`${hStr}:00`);
    }
    days.push({ key, day: cur.getDate(), month: cur.getMonth() + 1, weekday: cur.getDay(), freeSlots });
  }

  return <AvailabilityList days={days} />;
}
