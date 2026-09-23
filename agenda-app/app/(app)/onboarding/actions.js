'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const DAYS_AHEAD = 180; // ventana de bloqueo automático (~6 meses)

export async function completeOnboarding(workingDays, hourStart, hourEnd) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from('settings').upsert({
    owner_id: user.id,
    working_days: workingDays,
    hour_start: hourStart,
    hour_end: hourEnd,
    onboarding_completed: true,
  });

  const rows = [];
  const today = new Date();
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
}

export async function skipOnboarding() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from('settings').upsert({ owner_id: user.id, onboarding_completed: true });
  revalidatePath('/agenda');
}
