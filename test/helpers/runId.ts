import { randomUUID } from 'node:crypto';

let cached: string | null = null;

/**
 * FunÃ§Ã£o pÃºblica `getRunId` do projeto.
 *
 * @param {string} prefix - ParÃ¢metro `prefix`.
 * @returns {string} Retorna um valor do tipo `string`.
 */
export function getRunId(prefix = 'vitest'): string {
  if (cached) return cached;
  cached = `${prefix}_${randomUUID()}`;
  return cached;
}
