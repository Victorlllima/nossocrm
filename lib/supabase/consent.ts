/**
 * Consent Service - LGPD Compliance
 * 
 * Gerencia consentimento Ãºnico para uso de IA no sistema.
 * 
 * SIMPLIFICADO: Um Ãºnico consentimento (AI_CONSENT) cobre:
 * - Processamento de dados por IA (anÃ¡lise, sugestÃµes, geraÃ§Ã£o de texto)
 * - Envio de dados para APIs externas (Google Gemini, OpenAI, Anthropic)
 * 
 * Conforme LGPD Art. 7 (bases legais) e Art. 11 (dados sensÃ­veis).
 */

import { supabase } from './client';

/** 
 * Tipo Ãºnico de consentimento para IA
 * Mantemos como union type para compatibilidade futura, mas sÃ³ usamos AI_CONSENT
 */
export type ConsentType = 'AI_CONSENT';

export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  version: string;
  granted_at: string;
  ip_address?: string;
  user_agent?: string;
  revoked_at?: string | null;
  created_at: string;
}

/** VersÃ£o atual do consentimento - incrementar quando houver mudanÃ§as no texto */
export const CONSENT_VERSION = '1.0.1';

// Mantido para compatibilidade
export const CONSENT_VERSIONS: Record<ConsentType, string> = {
  AI_CONSENT: CONSENT_VERSION,
};

/**
 * Get all active consents for the current user
 */
export async function getUserConsents(): Promise<UserConsent[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', user.id)
    .is('revoked_at', null);

  if (error) {
    console.error('Error fetching consents:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user has a specific active consent
 */
export async function hasConsent(type: ConsentType): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('user_consents')
    .select('id')
    .eq('user_id', user.id)
    .eq('consent_type', type)
    .is('revoked_at', null)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking consent:', error);
  }

  return !!data;
}

/**
 * Grant consent for a specific type
 */
export async function grantConsent(type: ConsentType): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get client info for audit (IP is collected server-side by Supabase if needed)
  const userAgent = navigator.userAgent;

  const { error } = await supabase
    .from('user_consents')
    .insert({
      user_id: user.id,
      consent_type: type,
      version: CONSENT_VERSIONS[type],
      user_agent: userAgent,
    });

  if (error) {
    // Check if it's a duplicate (already has consent)
    if (error.code === '23505') {
      return true; // Already consented
    }
    console.error('Error granting consent:', error);
    return false;
  }

  // Log audit event (T052)
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'AI_CONSENT_GRANTED',
      p_resource_type: 'consent',
      p_details: { consent_type: type, version: CONSENT_VERSIONS[type] },
    });
  } catch (err) {
    // Audit logging is non-critical, silently fail
    console.warn('Audit log failed (non-critical):', err);
  }

  return true;
}

/**
 * Revoke consent for a specific type
 */
export async function revokeConsent(type: ConsentType): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_consents')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('consent_type', type)
    .is('revoked_at', null);

  if (error) {
    console.error('Error revoking consent:', error);
    return false;
  }

  // Log audit event (T052)
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'AI_CONSENT_REVOKED',
      p_resource_type: 'consent',
      p_details: { consent_type: type },
    });
  } catch (err) {
    // Audit logging is non-critical, silently fail
    console.warn('Audit log failed (non-critical):', err);
  }

  return true;
}

/**
 * Get consent text for display in modal
 */
export function getConsentText(): { title: string; description: string; version: string } {
  return {
    title: 'Consentimento para Uso de IA',
    description: `Ao aceitar, vocÃª autoriza:

â€¢ O processamento de seus dados e contatos por APIs de InteligÃªncia Artificial externas (Google Gemini, OpenAI, Anthropic)
â€¢ AnÃ¡lise de leads, sugestÃµes automatizadas e personalizaÃ§Ã£o de comunicaÃ§Ãµes

ObservaÃ§Ã£o sobre ditado por voz (microfone):
â€¢ O recurso de ditado/transcriÃ§Ã£o Ã© feito no seu navegador via Web Speech API.
â€¢ Dependendo do navegador, o reconhecimento pode envolver processamento pelo fornecedor do navegador/OS.

Seus dados serÃ£o tratados conforme nossa PolÃ­tica de Privacidade e a LGPD (Lei Geral de ProteÃ§Ã£o de Dados), incluindo Art. 11 para dados sensÃ­veis (voz).

VocÃª pode revogar este consentimento a qualquer momento nas ConfiguraÃ§Ãµes â†’ Privacidade.`,
    version: CONSENT_VERSION,
  };
}
