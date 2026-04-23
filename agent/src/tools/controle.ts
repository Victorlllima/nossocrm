import { supabase } from '../services/supabase.js';

export async function isAgenteSuspenso(phone: string): Promise<boolean> {
  const { data } = await supabase
    .from('ia_suspensa')
    .select('phone')
    .eq('phone', phone)
    .maybeSingle();

  return !!data;
}

export async function suspenderAgente(phone: string): Promise<void> {
  await supabase
    .from('ia_suspensa')
    .upsert({ phone, suspended_at: new Date().toISOString() });
}

export async function retomarAgente(phone: string): Promise<void> {
  await supabase
    .from('ia_suspensa')
    .delete()
    .eq('phone', phone);
}
