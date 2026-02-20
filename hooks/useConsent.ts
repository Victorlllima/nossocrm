/**
 * @fileoverview Hook de Gerenciamento de Consentimentos LGPD
 * 
 * Hook React que fornece interface completa para gerenciar consentimentos
 * de usuÃ¡rio conforme requisitos da LGPD (Lei Geral de ProteÃ§Ã£o de Dados).
 * 
 * @module hooks/useConsent
 * 
 * Funcionalidades:
 * - VerificaÃ§Ã£o de status de consentimento
 * - GestÃ£o de consentimentos obrigatÃ³rios e opcionais
 * - Controle automÃ¡tico de modal de consentimento
 * - RevogaÃ§Ã£o de consentimentos
 * - Cache inteligente com TanStack Query
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { 
 *     hasRequiredConsents, 
 *     shouldShowConsentModal, 
 *     giveConsents 
 *   } = useConsent();
 *   
 *   if (shouldShowConsentModal) {
 *     return <ConsentModal onAccept={() => giveConsents(['terms', 'privacy'])} />;
 *   }
 *   
 *   return <MainApp />;
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  consentService, 
  ConsentType, 
  ConsentRecord, 
  REQUIRED_CONSENTS,
  OPTIONAL_CONSENTS 
} from '@/lib/consent/consentService';

/**
 * Retorno do hook useConsent
 * 
 * @interface UseConsentReturn
 */
export interface UseConsentReturn {
  /** Mapa de status de consentimento por tipo */
  consents: Record<ConsentType, ConsentRecord> | null;
  /** Se estÃ¡ carregando dados iniciais */
  isLoading: boolean;
  /** Erro se houver falha na operaÃ§Ã£o */
  error: Error | null;
  /** Se usuÃ¡rio tem todos os consentimentos obrigatÃ³rios */
  hasRequiredConsents: boolean;
  /** Lista de tipos de consentimento faltantes */
  missingConsents: ConsentType[];
  /** Concede consentimento para um tipo especÃ­fico */
  giveConsent: (type: ConsentType) => Promise<boolean>;
  /** Concede mÃºltiplos consentimentos de uma vez */
  giveConsents: (types: ConsentType[]) => Promise<boolean>;
  /** Revoga um consentimento especÃ­fico */
  revokeConsent: (type: ConsentType) => Promise<boolean>;
  /** Recarrega status de consentimento do servidor */
  refetch: () => void;
  /** Se o modal de consentimento deve ser exibido */
  shouldShowConsentModal: boolean;
}

/**
 * Hook para gerenciamento de consentimentos LGPD
 * 
 * Fornece interface reativa para verificar, conceder e revogar
 * consentimentos do usuÃ¡rio. Gerencia automaticamente a exibiÃ§Ã£o
 * do modal de consentimento quando necessÃ¡rio.
 * 
 * @returns {UseConsentReturn} Estado e funÃ§Ãµes de controle de consentimento
 * 
 * @example
 * ```tsx
 * function PrivacySettings() {
 *   const { consents, giveConsent, revokeConsent } = useConsent();
 *   
 *   return (
 *     <div>
 *       <Toggle
 *         checked={consents?.marketing?.consented}
 *         onChange={(checked) => 
 *           checked ? giveConsent('marketing') : revokeConsent('marketing')
 *         }
 *         label="Aceitar comunicaÃ§Ãµes de marketing"
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useConsent(): UseConsentReturn {
  const queryClient = useQueryClient();
  const [shouldShowModal, setShouldShowModal] = useState(false);

  // Fetch consent status
  const { 
    data: consents, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['user-consents'],
    queryFn: () => consentService.getConsentStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Calculate missing consents
  const missingConsents = consents
    ? REQUIRED_CONSENTS.filter(type => !consents[type]?.consented)
    : [];

  const hasRequiredConsents = missingConsents.length === 0;

  // Update modal visibility
  useEffect(() => {
    if (!isLoading && !hasRequiredConsents) {
      setShouldShowModal(true);
    } else {
      setShouldShowModal(false);
    }
  }, [isLoading, hasRequiredConsents]);

  // Give consent mutation
  const giveConsentMutation = useMutation({
    mutationFn: async (type: ConsentType) => {
      return consentService.giveConsent(type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-consents'] });
    },
  });

  // Give multiple consents mutation
  const giveConsentsMutation = useMutation({
    mutationFn: async (types: ConsentType[]) => {
      return consentService.giveConsents(types);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-consents'] });
    },
  });

  // Revoke consent mutation
  const revokeConsentMutation = useMutation({
    mutationFn: async (type: ConsentType) => {
      return consentService.revokeConsent(type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-consents'] });
    },
  });

  const giveConsent = useCallback(async (type: ConsentType) => {
    try {
      const result = await giveConsentMutation.mutateAsync(type);
      return result;
    } catch {
      return false;
    }
  }, [giveConsentMutation]);

  const giveConsents = useCallback(async (types: ConsentType[]) => {
    try {
      const result = await giveConsentsMutation.mutateAsync(types);
      return result;
    } catch {
      return false;
    }
  }, [giveConsentsMutation]);

  const revokeConsent = useCallback(async (type: ConsentType) => {
    try {
      const result = await revokeConsentMutation.mutateAsync(type);
      return result;
    } catch {
      return false;
    }
  }, [revokeConsentMutation]);

  return {
    consents: consents || null,
    isLoading,
    error: error as Error | null,
    hasRequiredConsents,
    missingConsents,
    giveConsent,
    giveConsents,
    revokeConsent,
    refetch,
    shouldShowConsentModal: shouldShowModal,
  };
}

export { REQUIRED_CONSENTS, OPTIONAL_CONSENTS };
