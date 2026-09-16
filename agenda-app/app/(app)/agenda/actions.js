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

export async function rescheduleAppointment(appointmentId, newDate, newTime) {
  const supabase = createClient();
  await supabase.from('appointments').update({ date: newDate, time: newTime }).eq('id', appointmentId);
  revalidatePath('/agenda');
}

export async function createAppointment(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const type = formData.get('type')?.toString() || 'patient';
  const date = formData.get('date')?.toString();
  const time = formData.get('time')?.toString();

  if (!date || !time) return;

  if (type === 'block') {
    await supabase.from('appointments').insert({
      owner_id: user.id, type: 'block', date, time, attendance: 'pending', payment: 'na',
    });
    revalidatePath('/agenda');
    return;
  }

  if (type === 'other') {
    const title = formData.get('title')?.toString().trim();
    const isPaid = formData.get('isPaid') === 'on';
    const price = isPaid ? parseFloat(formData.get('price')?.toString() || '0') : 0;
    if (!title) return;
    await supabase.from('appointments').insert({
      owner_id: user.id, type: 'other', title, date, time,
      attendance: 'pending', payment: isPaid ? 'pending' : 'na', price,
    });
    revalidatePath('/agenda');
    return;
  }

  const name = formData.get('name')?.toString().trim();
  const modality = formData.get('modality')?.toString();
  const price = parseFloat(formData.get('price')?.toString() || '0');
  const repeat = formData.get('repeat')?.toString() || 'once';

  if (!name) return;

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

  let seriesId = null;
  if (repeat !== 'once') {
    const d = new Date(date + 'T00:00:00');
    const weekday = (d.getDay() + 6) % 7;
    const { data: series } = await supabase
      .from('appointment_series')
      .insert({
        owner_id: user.id, patient_id: patientId, weekday, time,
        frequency: repeat, modality, price, start_date: date,
      })
      .select('id')
      .single();
    seriesId = series?.id;
  }

  const count = repeat === 'weekly' ? 52 : repeat === 'biweekly' ? 26 : 1;
  const stepDays = repeat === 'biweekly' ? 14 : 7;
  const base = new Date(date + 'T00:00:00');
  const rows = [];
  for (let i = 0; i < count; i++) {
    const cur = new Date(base);
    cur.setDate(base.getDate() + i * stepDays);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d2 = String(cur.getDate()).padStart(2, '0');
    rows.push({
      owner_id: user.id, patient_id: patientId, series_id: seriesId, type: 'patient',
      date: `${y}-${m}-${d2}`, time, modality, price,
    });
  }
  await supabase.from('appointments').insert(rows);

  revalidatePath('/agenda');
}

export async function deleteEvent(id) {
  const supabase = createClient();
  await supabase.from('appointments').delete().eq('id', id).eq('type', 'block');
  revalidatePath('/agenda');
}

export async function deleteEventConfirmed(id) {
  const supabase = createClient();
  await supabase.from('appointments').delete().eq('id', id).eq('type', 'other');
  revalidatePath('/agenda');
}

export async function updateEventPayment(id, payment) {
  const supabase = createClient();
  await supabase.from('appointments').update({ payment }).eq('id', id).eq('type', 'other');
  revalidatePath('/agenda');
}
