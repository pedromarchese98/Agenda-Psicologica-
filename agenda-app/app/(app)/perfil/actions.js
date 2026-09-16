'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateSettings(priceVirtual, pricePresencial) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from('settings')
    .upsert({ owner_id: user.id, price_virtual: priceVirtual, price_presencial: pricePresencial });

  revalidatePath('/perfil');
}
