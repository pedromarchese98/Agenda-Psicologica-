import { createClient } from '@/lib/supabase/server';
import AnalisisClient from './AnalisisClient';

export default async function AnalisisPage() {
  const supabase = createClient();

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, patients(first_name, last_name, status)')
    .eq('type', 'patient')
    .order('date', { ascending: true });

  const { count: activeCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  return <AnalisisClient appointments={appointments || []} activeCount={activeCount || 0} />;
}
