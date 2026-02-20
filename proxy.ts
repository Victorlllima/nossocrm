/**
 * Next.js 16+ Proxy (ex-"middleware")
 *
 * ConvenÃ§Ã£o oficial:
 * - Este arquivo precisa se chamar `proxy.ts|js` e ficar na raiz (ou em `src/`).
 * - Deve exportar APENAS uma funÃ§Ã£o (default export ou named `proxy`).
 * - Pode exportar `config.matcher` para limitar onde roda.
 *
 * ReferÃªncias oficiais:
 * - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * - https://nextjs.org/docs/app/api-reference/file-conventions/proxy#migration-to-proxy
 *
 * Neste projeto, o Proxy Ã© usado sÃ³ para:
 * - refresh de sessÃ£o do Supabase SSR
 * - redirects de pÃ¡ginas protegidas para `/login`
 *
 * Importante:
 * - NÃƒO queremos interceptar `/api/*` aqui, porque Route Handlers jÃ¡ tratam auth
 *   e um redirect 307 para /login quebra clientes (ex: fetch do chat).
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * FunÃ§Ã£o pÃºblica `proxy` do projeto.
 *
 * @param {NextRequest} request - Objeto da requisiÃ§Ã£o.
 * @returns {Promise<NextResponse<unknown>>} Retorna um valor do tipo `Promise<NextResponse<unknown>>`.
 */
export async function proxy(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths exceto:
         * - api (Route Handlers)
         * - _next/static, _next/image
         * - _next/data (mesmo excluindo, o Next pode ainda invocar o Proxy para /_next/data por seguranÃ§a)
         * - arquivos de metadata (manifest, sitemap, robots)
         * - assets (imagens)
         */
        '/((?!api|_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
