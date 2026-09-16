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
    <div>
      <h2 style={{ fontSize: 17, margin: '16px 0 0 16px' }}>Perfil</h2>
      <PerfilForm email={user.email} settings={settings} />
    </div>
  );
}
