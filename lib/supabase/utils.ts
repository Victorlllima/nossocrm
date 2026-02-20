/**
 * @fileoverview UtilitÃ¡rios de sanitizaÃ§Ã£o e validaÃ§Ã£o para Supabase.
 * 
 * Este mÃ³dulo fornece funÃ§Ãµes para validar e sanitizar dados antes
 * de enviar ao Supabase, prevenindo erros de FK e garantindo integridade.
 * 
 * ## Conceitos Multi-Tenant
 * 
 * - **organization_id**: ID do tenant (quem paga pelo SaaS) - vem do auth/profile
 * - **client_company_id**: Empresa do cliente cadastrada no CRM - relacionamento de negÃ³cio
 * 
 * ## Regra de Ouro
 * 
 * Todos os UUIDs devem ser vÃ¡lidos ou NULL - nunca string vazia!
 * 
 * @module lib/supabase/utils
 * 
 * @example
 * ```typescript
 * import { sanitizeUUID, requireUUID, sanitizeText } from '@/lib/supabase/utils';
 * 
 * // Campo opcional - retorna null se invÃ¡lido
 * const contactId = sanitizeUUID(form.contactId);
 * 
 * // Campo obrigatÃ³rio - lanÃ§a erro se invÃ¡lido
 * const boardId = requireUUID(form.boardId, 'Board ID');
 * ```
 */

import { OrganizationId, ClientCompanyId } from '@/types';
import { supabase } from './client';

/**
 * ExpressÃ£o regular para validaÃ§Ã£o de UUID v4.
 * @constant
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verifica se um valor Ã© um UUID vÃ¡lido.
 * 
 * @param value - Valor a ser verificado.
 * @returns true se for um UUID vÃ¡lido, false caso contrÃ¡rio.
 * 
 * @example
 * ```typescript
 * isValidUUID('123e4567-e89b-12d3-a456-426614174000') // true
 * isValidUUID('') // false
 * isValidUUID('abc') // false
 * ```
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!value || value.trim() === '') return false;
  return UUID_REGEX.test(value);
}

/**
 * Sanitiza um campo UUID - retorna null se invÃ¡lido.
 * 
 * Use para TODOS os campos FK opcionais. Previne erros de
 * constraint violation quando o usuÃ¡rio nÃ£o preenche um campo.
 * 
 * @param value - UUID a ser sanitizado.
 * @returns UUID vÃ¡lido ou null.
 * 
 * @example
 * ```typescript
 * sanitizeUUID('123e4567-e89b-12d3-a456-426614174000') // '123e4567-...'
 * sanitizeUUID('') // null
 * sanitizeUUID(undefined) // null
 * sanitizeUUID('invalid') // null (com warning no console)
 * ```
 */
export function sanitizeUUID(value: string | undefined | null): string | null {
  if (!value || value === '' || value.trim() === '') return null;
  if (!isValidUUID(value)) {
    console.warn(`[sanitizeUUID] UUID invÃ¡lido descartado: "${value}"`);
    return null;
  }
  return value;
}

/**
 * Sanitiza mÃºltiplos campos UUID de um objeto.
 * 
 * Ãštil para processar formulÃ¡rios com vÃ¡rios campos UUID de uma vez.
 * 
 * @param obj - Objeto contendo os campos.
 * @param uuidFields - Lista de campos a serem sanitizados.
 * @returns Novo objeto com campos sanitizados.
 * 
 * @example
 * ```typescript
 * const form = { contactId: '', boardId: 'valid-uuid', name: 'Test' };
 * const sanitized = sanitizeUUIDs(form, ['contactId', 'boardId']);
 * // { contactId: null, boardId: 'valid-uuid', name: 'Test' }
 * ```
 */
export function sanitizeUUIDs<T extends Record<string, unknown>>(
  obj: T,
  uuidFields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of uuidFields) {
    const value = obj[field];
    if (value !== undefined) {
      (result as Record<string, unknown>)[field as string] = sanitizeUUID(value as string);
    }
  }
  return result;
}

/**
 * Valida que um UUID existe e Ã© vÃ¡lido, lanÃ§ando erro se nÃ£o for.
 * 
 * Use para campos OBRIGATÃ“RIOS como board_id em deals.
 * 
 * @param value - UUID a ser validado.
 * @param fieldName - Nome do campo para mensagem de erro.
 * @returns UUID vÃ¡lido.
 * @throws Error se o UUID for invÃ¡lido ou vazio.
 * 
 * @example
 * ```typescript
 * const boardId = requireUUID(form.boardId, 'Board ID');
 * // Retorna UUID vÃ¡lido ou lanÃ§a erro
 * ```
 */
export function requireUUID(value: string | undefined | null, fieldName: string): string {
  const sanitized = sanitizeUUID(value);
  if (!sanitized) {
    throw new Error(`${fieldName} Ã© obrigatÃ³rio e deve ser um UUID vÃ¡lido`);
  }
  return sanitized;
}

/**
 * @deprecated Single-tenant migration. Use string directly if needed, but organization_id is no longer used for filtering.
 */
export function sanitizeOrganizationId(value: string | undefined | null): OrganizationId | null {
  return sanitizeUUID(value) as OrganizationId | null;
}

/**
 * @deprecated Single-tenant migration. Authentication is handled by RLS via auth.uid().
 */
export const getCurrentUserOrganizationId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Return a dummy value or null as strictly single-tenant doesn't need this
  return null;
};

/**
 * @deprecated Single-tenant migration. Do not use.
 */
export function requireOrganizationId(value: string | undefined | null): OrganizationId {
  // Just return empty string or whatever satisfies the type if strictly needed, or throw if we want to catch usage
  // But to avoid breaking legacy code that might still call it:
  return (sanitizeUUID(value) || '') as OrganizationId;
}

/**
 * Sanitiza client_company_id (empresa CRM do cliente).
 * 
 * Alias semÃ¢ntico para empresas cadastradas no CRM.
 * 
 * @param value - Client company ID a ser sanitizado.
 * @returns ClientCompanyId vÃ¡lido ou null.
 */
export function sanitizeClientCompanyId(value: string | undefined | null): ClientCompanyId | null {
  return sanitizeUUID(value) as ClientCompanyId | null;
}

/**
 * Sanitiza string de texto - retorna null se vazio.
 * 
 * @param value - Texto a ser sanitizado.
 * @returns Texto trimado ou null.
 * 
 * @example
 * ```typescript
 * sanitizeText('  hello  ') // 'hello'
 * sanitizeText('   ') // null
 * sanitizeText('') // null
 * ```
 */
export function sanitizeText(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

/**
 * Sanitiza nÃºmero - retorna valor default se invÃ¡lido.
 * 
 * @param value - Valor a ser convertido.
 * @param defaultValue - Valor padrÃ£o se invÃ¡lido (default: 0).
 * @returns NÃºmero vÃ¡lido ou valor padrÃ£o.
 * 
 * @example
 * ```typescript
 * sanitizeNumber(42) // 42
 * sanitizeNumber('42') // 42
 * sanitizeNumber('abc') // 0
 * sanitizeNumber(NaN, 100) // 100
 * ```
 */
export function sanitizeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}
