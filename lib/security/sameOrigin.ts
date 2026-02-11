/**
 * MitigaÃ§Ã£o simples de CSRF para endpoints autenticados por cookies.
 *
 * Ideia: em requests vindos do browser, o header `Origin` aparece em cenÃ¡rios cross-site.
 * Para rotas que dependem de cookies, negar quando `Origin` nÃ£o bate com o host atual.
 *
 * - Se `Origin` estiver ausente (ex: server-to-server), nÃ£o bloqueia.
 * - Usa x-forwarded-* quando disponÃ­vel (Vercel/reverse proxies).
 */

export function getExpectedOrigin(req: Request): string | null {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return null;

  const proto =
    req.headers.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  return `${proto}://${host}`;
}

/**
 * FunÃ§Ã£o pÃºblica `isAllowedOrigin` do projeto.
 *
 * @param {Request} req - Objeto da requisiÃ§Ã£o.
 * @returns {boolean} Retorna um valor do tipo `boolean`.
 */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;

  const expected = getExpectedOrigin(req);
  if (!expected) return true;

  return origin === expected;
}
