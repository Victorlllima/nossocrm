/**
 * useAIEnabled Hook - Verifica se IA estÃ¡ habilitada
 * 
 * SIMPLIFICADO: IA estÃ¡ habilitada se o usuÃ¡rio configurou uma API Key.
 * A aÃ§Ã£o de adicionar a key = consentimento implÃ­cito (LGPD compliant).
 * 
 * @example
 * const { isAIEnabled, goToSettings } = useAIEnabled();
 * 
 * if (!isAIEnabled) {
 *   return <NoAIMessage onConfigure={goToSettings} />;
 * }
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCRM } from '@/context/CRMContext';

export interface UseAIEnabledResult {
  /** Se a IA estÃ¡ habilitada (tem API Key configurada) */
  isAIEnabled: boolean;
  /** A API Key configurada */
  apiKey: string | null;
  /** Provider configurado (google, openai, anthropic) */
  provider: 'google' | 'openai' | 'anthropic';
  /** Navega para as configuraÃ§Ãµes de IA */
  goToSettings: () => void;
}

/**
 * Hook React `useAIEnabled` que encapsula uma lÃ³gica reutilizÃ¡vel.
 * @returns {UseAIEnabledResult} Retorna um valor do tipo `UseAIEnabledResult`.
 */
export function useAIEnabled(): UseAIEnabledResult {
  const router = useRouter();
  const { aiProvider, aiOrgEnabled, aiKeyConfigured } = useCRM();

  const isAIEnabled = Boolean(aiOrgEnabled && aiKeyConfigured);

  const goToSettings = useCallback(() => {
    router.push('/settings/ai#ai-config');
  }, [router]);

  return {
    isAIEnabled,
    apiKey: null,
    provider: aiProvider || 'google',
    goToSettings,
  };
}
