import { createClient } from '@/lib/supabase/server';
import AnalisisClient from './AnalisisClient';

export default async function AnalisisPage() {
  const supabase = createClient();

  const [{ data: appointments }, { count: activeCount }, { data: allDebts }, { data: events }] = await Promise.all([
    supabase.from('appointments').select('*, patients(first_name, last_name, status)').eq('type', 'patient').order('date', { ascending: true }),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('appointments')
      .select('id, patient_id, date, time, price, amount_paid, patients(first_name, last_name)')
      .eq('type', 'patient')
      .eq('payment', 'unpaid')
      .order('date', { ascending: true }),
    supabase.from('appointments').select('*').eq('type', 'other'),
  ]);

  return (
    <AnalisisClient
      appointments={appointments || []}
      activeCount={activeCount || 0}
      allDebts={allDebts || []}
      events={events || []}
    />
  );
}
