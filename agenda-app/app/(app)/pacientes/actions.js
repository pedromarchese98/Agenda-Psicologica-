'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePatientStatus(patientId, status, reason) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from('patients').update({ status, status_date: new Date().toISOString() }).eq('id', patientId);
  await supabase.from('patient_status_history').insert({
    owner_id: user.id,
    patient_id: patientId,
    status,
    reason: reason || null,
  });
  revalidatePath('/pacientes');
}

export async function addNote(patientId, text) {
  if (!text?.trim()) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from('notes').insert({ owner_id: user.id, patient_id: patientId, text: text.trim() });
  revalidatePath('/pacientes');
}

export async function deleteFutureAppointments(patientId, fromDate) {
  const supabase = createClient();
  await supabase
    .from('appointments')
    .delete()
    .eq('patient_id', patientId)
    .gte('date', fromDate);
  revalidatePath('/pacientes');
  revalidatePath('/agenda');
}

export async function changeFutureSchedule(patientId, fromDate, time, frequency, modality, price) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Borra los turnos futuros desde la fecha elegida (el historial pasado no se toca).
  await supabase.from('appointments').delete().eq('patient_id', patientId).gte('date', fromDate);

  const d = new Date(fromDate + 'T00:00:00');
  const weekday = (d.getDay() + 6) % 7;

  const { data: series } = await supabase
    .from('appointment_series')
    .insert({
      owner_id: user.id, patient_id: patientId, weekday, time,
      frequency, modality, price, start_date: fromDate,
    })
    .select('id')
    .single();

  const count = frequency === 'weekly' ? 52 : 26;
  const stepDays = frequency === 'weekly' ? 7 : 14;
  const rows = [];
  for (let i = 0; i < count; i++) {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i * stepDays);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d2 = String(cur.getDate()).padStart(2, '0');
    rows.push({
      owner_id: user.id, patient_id: patientId, series_id: series?.id, type: 'patient',
      date: `${y}-${m}-${d2}`, time, modality, price,
    });
  }
  await supabase.from('appointments').insert(rows);

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
}
