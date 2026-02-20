import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FunÃ§Ã£o pÃºblica `isAIFeatureEnabled` do projeto.
 *
 * @param {SupabaseClient<any, "public", "public", any, any>} supabase - ParÃ¢metro `supabase`.
 * @param {string} organizationId - Identificador do recurso.
 * @param {string} key - ParÃ¢metro `key`.
 * @returns {Promise<boolean>} Retorna um valor do tipo `Promise<boolean>`.
 */
export async function isAIFeatureEnabled(
  supabase: SupabaseClient,
  organizationId: string,
  key: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ai_feature_flags')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.warn('[ai/features] Failed to load feature flag; defaulting to enabled.', {
      key,
      message: error.message,
    });
    return true;
  }

  // Default: enabled when missing
  return data?.enabled !== false;
}

