import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/**
 * Regra do produto: padronizar telefones em E.164.
 *
 * - Aceita entrada â€œsoltaâ€ (com espaÃ§os, parÃªnteses, hÃ­fen etc.)
 * - Tenta normalizar usando `defaultCountry` quando nÃ£o houver prefixo +
 * - Retorna string E.164 (ex.: +5511999990000) ou '' quando vazio
 *
 * ObservaÃ§Ã£o:
 * - Se a string jÃ¡ estiver em E.164 vÃ¡lido, retorna como estÃ¡.
 * - Se nÃ£o for possÃ­vel parsear/validar, retorna uma versÃ£o â€œsanitizadaâ€
 *   (mantendo + e dÃ­gitos) apenas se parecer E.164; caso contrÃ¡rio, retorna o input trimado.
 */
export function normalizePhoneE164(
  input?: string | null,
  opts?: {
    defaultCountry?: CountryCode;
  }
): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';

  // Atalho: jÃ¡ estÃ¡ em E.164?
  const e164Candidate = raw.replace(/[\s\-()]/g, '');
  if (isE164(e164Candidate)) return e164Candidate;

  const defaultCountry = opts?.defaultCountry ?? 'BR';

  // Parse com fallback de paÃ­s; funciona bem para inputs sem + (ex.: (11) 99999-0000)
  const phone = parsePhoneNumberFromString(raw, defaultCountry);
  if (phone?.isValid()) return phone.number; // E.164

  // Fallback: mantÃ©m somente + e dÃ­gitos. Se ficar com cara de E.164, retorna.
  const sanitized = raw.replace(/[^\d+]/g, '');
  if (isE164(sanitized)) return sanitized;

  // Ãšltimo fallback: devolve o que o usuÃ¡rio tem (evita apagar dado), mas o objetivo
  // Ã© que o sistema normalize na entrada e nÃ£o chegue aqui com frequÃªncia.
  return raw;
}

/**
 * FunÃ§Ã£o pÃºblica `isE164` do projeto.
 *
 * @param {string | null | undefined} input - ParÃ¢metro `input`.
 * @returns {boolean} Retorna um valor do tipo `boolean`.
 */
export function isE164(input?: string | null): boolean {
  const value = (input ?? '').trim();
  return /^\+[1-9]\d{1,14}$/.test(value);
}

/**
 * Para WhatsApp (wa.me) normalmente usamos somente dÃ­gitos (sem '+').
 * Retorna '' se nÃ£o houver nÃºmero.
 */
export function toWhatsAppPhone(input?: string | null, opts?: { defaultCountry?: CountryCode }): string {
  const e164 = normalizePhoneE164(input, opts);
  if (!e164) return '';
  return e164.replace(/^\+/, '');
}
