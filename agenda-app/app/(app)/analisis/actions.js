'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registerPayment(appointmentId, amount, method) {
  const supabase = createClient();
  const { data: appt } = await supabase.from('appointments').select('price, amount_paid').eq('id', appointmentId).single();
  if (!appt) return;
  const newAmountPaid = (Number(appt.amount_paid) || 0) + Number(amount);
  const isFullyPaid = newAmountPaid >= Number(appt.price);
  await supabase
    .from('appointments')
    .update({
      amount_paid: newAmountPaid,
      payment: isFullyPaid ? 'paid' : 'unpaid',
      payment_method: isFullyPaid ? method : 'none',
    })
    .eq('id', appointmentId);
  revalidatePath('/analisis');
  revalidatePath('/agenda');
}
