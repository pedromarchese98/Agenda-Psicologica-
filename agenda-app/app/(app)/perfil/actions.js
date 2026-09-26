'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { nowInTz, todayISO } from '@/lib/date';

const DAYS_AHEAD = 180; // misma ventana que usa el onboarding

// Cambia los días/horario de atención después del onboarding: guarda la preferencia
// y regenera los bloqueos automáticos futuros (los turnos con pacientes NO se tocan).
export async function updateSchedule(workingDays, hourStart, hourEnd) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from('settings').upsert({
    owner_id: user.id,
    working_days: workingDays,
    hour_start: hourStart,
    hour_end: hourEnd,
  });

  const today = nowInTz();
  const todayStr = todayISO();

  // Se borran SOLO los bloqueos automáticos futuros (auto_block = true).
  // Los turnos con pacientes y los horarios que la psicóloga bloqueó a mano no se tocan.
  await supabase.from('appointments').delete().eq('type', 'block').eq('auto_block', true).gte('date', todayStr);

  const rows = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const weekday = (d.getDay() + 6) % 7; // 0 = lunes ... 6 = domingo
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isWorkingDay = workingDays.includes(weekday);
    for (let h = 7; h <= 20; h++) {
      const isWithinHours = h >= hourStart && h < hourEnd;
      if (!isWorkingDay || !isWithinHours) {
        rows.push({
          owner_id: user.id,
          type: 'block',
          date: dateStr,
          time: `${String(h).padStart(2, '0')}:00`,
          attendance: 'pending',
          payment: 'na',
          auto_block: true,
        });
      }
    }
  }

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await supabase.from('appointments').insert(rows.slice(i, i + CHUNK));
  }

  revalidatePath('/agenda');
  revalidatePath('/disponibles');
  revalidatePath('/perfil');
}
