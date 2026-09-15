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
