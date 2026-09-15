'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAttendance(appointmentId, attendance) {
  const supabase = createClient();
  const patch = { attendance };
  if (attendance === 'no-free') {
    patch.payment = 'na';
    patch.payment_method = 'none';
  }
  await supabase.from('appointments').update(patch).eq('id', appointmentId);
  revalidatePath('/agenda');
}

export async function updatePayment(appointmentId, payment, paymentMethod) {
  const supabase = createClient();
  await supabase
    .from('appointments')
    .update({ payment, payment_method: payment === 'paid' ? paymentMethod : 'none' })
    .eq('id', appointmentId);
  revalidatePath('/agenda');
}

export async function createAppointment(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = formData.get('name')?.toString().trim();
  const date = formData.get('date')?.toString();
  const time = formData.get('time')?.toString();
  const modality = formData.get('modality')?.toString();
  const price = parseFloat(formData.get('price')?.toString() || '0');

  if (!name || !date || !time) return;

  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ') || null;

  let { data: existing } = await supabase
    .from('patients')
    .select('id')
    .ilike('first_name', first)
    .is('last_name', last)
    .maybeSingle();

  let patientId = existing?.id;
  if (!patientId) {
    const { data: created } = await supabase
      .from('patients')
      .insert({ owner_id: user.id, first_name: first, last_name: last })
      .select('id')
      .single();
    patientId = created?.id;
  }

  await supabase.from('appointments').insert({
    owner_id: user.id,
    patient_id: patientId,
    type: 'patient',
    date,
    time,
    modality,
    price,
  });

  revalidatePath('/agenda');
}
