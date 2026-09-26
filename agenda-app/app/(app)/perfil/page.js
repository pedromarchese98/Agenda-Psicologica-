import { createClient } from '@/lib/supabase/server';
import PerfilForm from './PerfilForm';

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  return (
    <PerfilForm email={user.email} avatarUrl={user.user_metadata?.avatar_url || ''} settings={settings} />
  );
}
