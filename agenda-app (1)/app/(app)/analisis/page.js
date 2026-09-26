import { createClient } from '@/lib/supabase/server';
import AnalisisClient from './AnalisisClient';

export default async function AnalisisPage() {
  const supabase = createClient();

  const [{ data: appointments }, { count: activeCount }, { data: events }] = await Promise.all([
    supabase.from('appointments').select('*, patients(first_name, last_name, status)').eq('type', 'patient').order('date', { ascending: true }),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('appointments').select('*').eq('type', 'other'),
  ]);

  return (
    <AnalisisClient
      appointments={appointments || []}
      activeCount={activeCount || 0}
      events={events || []}
    />
  );
}
