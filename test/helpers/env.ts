import { readFileSync, existsSync } from 'node:fs';

function parseDotEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

/**
 * FunÃ§Ã£o pÃºblica `loadEnvFile` do projeto.
 *
 * @param {string} filePath - ParÃ¢metro `filePath`.
 * @param {{ override?: boolean | undefined; } | undefined} opts - ParÃ¢metro `opts`.
 * @returns {void} NÃ£o retorna valor.
 */
export function loadEnvFile(filePath: string, opts?: { override?: boolean }) {
  if (!existsSync(filePath)) return;
  const parsed = parseDotEnv(readFileSync(filePath, 'utf8'));
  const override = opts?.override === true;
  for (const [k, v] of Object.entries(parsed)) {
    if (override || process.env[k] == null) process.env[k] = v;
  }
}

/**
 * FunÃ§Ã£o pÃºblica `requireEnv` do projeto.
 *
 * @param {string} name - ParÃ¢metro `name`.
 * @returns {string} Retorna um valor do tipo `string`.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * FunÃ§Ã£o pÃºblica `getSupabaseUrl` do projeto.
 * @returns {string} Retorna um valor do tipo `string`.
 */
export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  );
}

/**
 * FunÃ§Ã£o pÃºblica `getServiceRoleKey` do projeto.
 * @returns {string} Retorna um valor do tipo `string`.
 */
export function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

/**
 * FunÃ§Ã£o pÃºblica `isPlaceholderApiKey` do projeto.
 *
 * @param {string | null | undefined} value - ParÃ¢metro `value`.
 * @returns {boolean} Retorna um valor do tipo `boolean`.
 */
export function isPlaceholderApiKey(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return v === 'your_google_ai_api_key' || v.startsWith('your_');
}
