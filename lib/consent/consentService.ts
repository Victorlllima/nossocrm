/**
 * @fileoverview ServiÃ§o de gerenciamento de consentimentos LGPD.
 * 
 * Este mÃ³dulo gerencia os consentimentos do usuÃ¡rio para compliance com a LGPD
 * (Lei Geral de ProteÃ§Ã£o de Dados). Suporta mÃºltiplos tipos de consentimento,
 * versionamento, revogaÃ§Ã£o e exportaÃ§Ã£o de histÃ³rico.
 * 
 * @module services/consentService
 * @see {@link https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm LGPD}
 */

import { supabase } from '@/lib/supabase/client';

/**
 * Tipos de consentimento suportados pelo sistema.
 * 
 * @typedef {'terms' | 'privacy' | 'marketing' | 'analytics' | 'data_processing'} ConsentType
 */
export type ConsentType = 'terms' | 'privacy' | 'marketing' | 'analytics' | 'data_processing';

/**
 * Registro de consentimento do usuÃ¡rio no banco de dados.
 * 
 * @interface UserConsent
 * @property {string} id - ID Ãºnico do registro.
 * @property {string} user_id - ID do usuÃ¡rio que deu o consentimento.
 * @property {ConsentType} consent_type - Tipo do consentimento.
 * @property {string} version - VersÃ£o do documento consentido.
 * @property {string} consented_at - Data/hora do consentimento (ISO 8601).
 * @property {string | null} ip_address - IP do usuÃ¡rio no momento.
 * @property {string | null} user_agent - User agent do navegador.
 * @property {string | null} revoked_at - Data/hora da revogaÃ§Ã£o, se aplicÃ¡vel.
 */
export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  version: string;
  consented_at: string;
  ip_address: string | null;
  user_agent: string | null;
  revoked_at: string | null;
}

/**
 * Registro simplificado de status de consentimento.
 * 
 * @interface ConsentRecord
 * @property {ConsentType} type - Tipo do consentimento.
 * @property {string} version - VersÃ£o atual do documento.
 * @property {boolean} consented - Se o usuÃ¡rio consentiu na versÃ£o atual.
 * @property {string} [consentedAt] - Data do consentimento, se existir.
 */
export interface ConsentRecord {
  type: ConsentType;
  version: string;
  consented: boolean;
  consentedAt?: string;
}

/**
 * VersÃµes atuais dos documentos de consentimento.
 * Ao atualizar um documento, incrementar a versÃ£o forÃ§a re-consentimento.
 * 
 * @constant
 */
export const CONSENT_VERSIONS: Record<ConsentType, string> = {
  terms: '1.0.0',
  privacy: '1.0.0',
  marketing: '1.0.0',
  analytics: '1.0.0',
  data_processing: '1.0.0',
};

/**
 * Consentimentos obrigatÃ³rios para uso da plataforma.
 * Sem estes, o usuÃ¡rio nÃ£o pode acessar funcionalidades principais.
 * 
 * @constant
 */
export const REQUIRED_CONSENTS: ConsentType[] = ['terms', 'privacy', 'data_processing'];

/**
 * Consentimentos opcionais (marketing e analytics).
 * 
 * @constant
 */
export const OPTIONAL_CONSENTS: ConsentType[] = ['marketing', 'analytics'];

/**
 * ServiÃ§o de gerenciamento de consentimentos LGPD.
 * 
 * @class ConsentService
 * 
 * @example
 * ```typescript
 * // Verificar se tem consentimentos obrigatÃ³rios
 * const hasRequired = await consentService.hasRequiredConsents();
 * 
 * // Dar consentimento
 * await consentService.giveConsent('terms');
 * 
 * // Revogar consentimento
 * await consentService.revokeConsent('marketing');
 * ```
 */
class ConsentService {
  /**
   * Busca todos os consentimentos ativos do usuÃ¡rio atual.
   * 
   * @returns Promise com array de consentimentos ativos (nÃ£o revogados).
   */
  async getUserConsents(): Promise<UserConsent[]> {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .is('revoked_at', null)
      .order('consented_at', { ascending: false });

    if (error) {
      console.error('Error fetching consents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Verifica se o usuÃ¡rio deu todos os consentimentos obrigatÃ³rios.
   * 
   * Compara com as versÃµes atuais dos documentos - consentimentos
   * de versÃµes antigas sÃ£o considerados invÃ¡lidos.
   * 
   * @returns Promise<boolean> - true se todos os consentimentos obrigatÃ³rios estÃ£o vÃ¡lidos.
   */
  async hasRequiredConsents(): Promise<boolean> {
    const consents = await this.getUserConsents();
    
    return REQUIRED_CONSENTS.every((requiredType) => {
      const consent = consents.find(c => c.consent_type === requiredType);
      if (!consent) return false;
      
      // Check if consent is for current version
      return consent.version === CONSENT_VERSIONS[requiredType];
    });
  }

  /**
   * Identifica quais consentimentos obrigatÃ³rios estÃ£o faltando ou desatualizados.
   * 
   * @returns Promise com array de tipos de consentimento que precisam ser dados.
   */
  async getMissingConsents(): Promise<ConsentType[]> {
    const consents = await this.getUserConsents();
    
    return REQUIRED_CONSENTS.filter((requiredType) => {
      const consent = consents.find(c => c.consent_type === requiredType);
      if (!consent) return true;
      
      // Check if consent is for current version
      return consent.version !== CONSENT_VERSIONS[requiredType];
    });
  }

  /**
   * Registra o consentimento do usuÃ¡rio para um tipo especÃ­fico.
   * 
   * Automaticamente revoga qualquer consentimento anterior do mesmo tipo
   * antes de registrar o novo.
   * 
   * @param type - Tipo de consentimento a ser dado.
   * @param options - OpÃ§Ãµes adicionais (IP, user agent).
   * @param options.ipAddress - EndereÃ§o IP do usuÃ¡rio.
   * @param options.userAgent - User agent do navegador.
   * @returns Promise<boolean> - true se o consentimento foi registrado com sucesso.
   */
  async giveConsent(
    type: ConsentType,
    options?: { ipAddress?: string; userAgent?: string }
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return false;
    }

    // First, revoke any existing consent of this type
    await this.revokeConsent(type);

    const { error } = await supabase
      .from('user_consents')
      .insert({
        user_id: user.id,
        consent_type: type,
        version: CONSENT_VERSIONS[type],
        ip_address: options?.ipAddress || null,
        user_agent: options?.userAgent || navigator.userAgent,
      });

    if (error) {
      console.error('Error giving consent:', error);
      return false;
    }

    return true;
  }

  /**
   * Registra mÃºltiplos consentimentos de uma vez.
   * 
   * Ãštil para onboarding onde o usuÃ¡rio aceita todos os termos juntos.
   * 
   * @param types - Array de tipos de consentimento.
   * @param options - OpÃ§Ãµes adicionais (IP, user agent).
   * @returns Promise<boolean> - true se todos foram registrados com sucesso.
   */
  async giveConsents(
    types: ConsentType[],
    options?: { ipAddress?: string; userAgent?: string }
  ): Promise<boolean> {
    const results = await Promise.all(
      types.map(type => this.giveConsent(type, options))
    );
    
    return results.every(r => r);
  }

  /**
   * Revoga um consentimento previamente dado.
   * 
   * Implementa o direito de revogaÃ§Ã£o da LGPD.
   * 
   * @param type - Tipo de consentimento a ser revogado.
   * @returns Promise<boolean> - true se a revogaÃ§Ã£o foi registrada.
   */
  async revokeConsent(type: ConsentType): Promise<boolean> {
    const { error } = await supabase
      .from('user_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('consent_type', type)
      .is('revoked_at', null);

    if (error) {
      console.error('Error revoking consent:', error);
      return false;
    }

    return true;
  }

  /**
   * ObtÃ©m o status de todos os tipos de consentimento.
   * 
   * Retorna um mapa com status de cada tipo, indicando se estÃ¡
   * consentido na versÃ£o atual.
   * 
   * @returns Promise com mapa de status por tipo de consentimento.
   */
  async getConsentStatus(): Promise<Record<ConsentType, ConsentRecord>> {
    const consents = await this.getUserConsents();
    
    const allTypes: ConsentType[] = [...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS];
    
    return allTypes.reduce((acc, type) => {
      const consent = consents.find(c => c.consent_type === type);
      acc[type] = {
        type,
        version: CONSENT_VERSIONS[type],
        consented: consent?.version === CONSENT_VERSIONS[type],
        consentedAt: consent?.consented_at,
      };
      return acc;
    }, {} as Record<ConsentType, ConsentRecord>);
  }

  /**
   * Exporta o histÃ³rico completo de consentimentos do usuÃ¡rio.
   * 
   * Implementa o direito de acesso da LGPD - permite ao usuÃ¡rio
   * visualizar todo o histÃ³rico de consentimentos e revogaÃ§Ãµes.
   * 
   * @returns Promise com array completo do histÃ³rico de consentimentos.
   */
  async exportConsentHistory(): Promise<UserConsent[]> {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .order('consented_at', { ascending: false });

    if (error) {
      console.error('Error exporting consent history:', error);
      return [];
    }

    return data || [];
  }
}

/**
 * InstÃ¢ncia singleton do serviÃ§o de consentimentos.
 * Use esta instÃ¢ncia para todas as operaÃ§Ãµes de consentimento.
 * 
 * @example
 * ```typescript
 * import { consentService } from '@/lib/consent/consentService';
 * 
 * const hasConsent = await consentService.hasRequiredConsents();
 * ```
 */
export const consentService = new ConsentService();
