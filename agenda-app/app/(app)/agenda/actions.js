'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAttendance(appointmentId, attendance) {
  const supabase = createClient();
  // Al cambiar la asistencia, el pago vuelve a "pendiente" para que se elija de nuevo
  // según las opciones que correspondan a la nueva categoría (asistió/no asistió/canceló).
  await supabase
    .from('appointments')
    .update({ attendance, payment: 'pending', payment_method: 'none' })
    .eq('id', appointmentId);
  revalidatePath('/agenda');
  revalidatePath('/disponibles');
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

export async function deleteAppointment(appointmentId) {
  const supabase = createClient();
  await supabase.from('appointments').delete().eq('id', appointmentId).eq('type', 'patient');
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
    const reason = formData.get('reason')?.toString().trim() || null;
    const note = formData.get('note')?.toString().trim() || null;
    const recurring = formData.get('recurring') === 'on';

    // "Desde" / "Hasta": se bloquea una fila por cada hora del rango (mínimo una).
    const startHour = parseInt(time.slice(0, 2), 10);
    const endRaw = formData.get('end_time')?.toString();
    const endHour = endRaw ? parseInt(endRaw.slice(0, 2), 10) : NaN;
    const hours = [];
    for (let h = startHour; h < (Number.isNaN(endHour) || endHour <= startHour ? startHour + 1 : endHour); h++) hours.push(h);

    const count = recurring ? 52 : 1;
    const base = new Date(date + 'T00:00:00');
    const rows = [];
    for (let i = 0; i < count; i++) {
      const cur = new Date(base);
      cur.setDate(base.getDate() + i * 7);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d2 = String(cur.getDate()).padStart(2, '0');
      hours.forEach((h) => {
        rows.push({
          owner_id: user.id, type: 'block', date: `${y}-${m}-${d2}`, time: `${String(h).padStart(2, '0')}:00`,
          attendance: 'pending', payment: 'na',
          title: reason, block_note: note, block_recurring: recurring,
        });
      });
    }
    await supabase.from('appointments').insert(rows);
    revalidatePath('/agenda');
    revalidatePath('/disponibles');
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

  const [first, ...rest] = name.split(/\s+/);
  const last = rest.join(' ') || null;

  // Si se eligió un paciente de la lista viene su id; si no, se busca por nombre y, si no existe, se crea.
  let patientId = formData.get('patient_id')?.toString() || null;
  if (!patientId) {
    let lookup = supabase.from('patients').select('id').ilike('first_name', first);
    lookup = last ? lookup.ilike('last_name', last) : lookup.is('last_name', null);
    const { data: existing } = await lookup.limit(1).maybeSingle();
    patientId = existing?.id || null;
  }
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
  revalidatePath('/pacientes');
}

export async function deleteEvent(id) {
  return deleteBlocks([id]);
}

// Libera uno o varios horarios bloqueados (un bloque de varias horas son varias filas).
export async function deleteBlocks(ids) {
  if (!ids?.length) return;
  const supabase = createClient();
  await supabase.from('appointments').delete().in('id', ids).eq('type', 'block');
  revalidatePath('/agenda');
  revalidatePath('/disponibles');
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
