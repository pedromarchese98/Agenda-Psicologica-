import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Landing from './Landing';

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/agenda');

  return <Landing />;
}
