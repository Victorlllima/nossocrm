import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * FunÃ§Ã£o pÃºblica `updateSession` do projeto.
 *
 * @param {NextRequest} request - Objeto da requisiÃ§Ã£o.
 * @returns {Promise<NextResponse<unknown>>} Retorna um valor do tipo `Promise<NextResponse<unknown>>`.
 */
export async function updateSession(request: NextRequest) {
    // NOTE: Apesar do nome do arquivo, esta funÃ§Ã£o Ã© consumida pelo `proxy.ts` (Next 16+).
    // O Next renomeou a convenÃ§Ã£o de `middleware.ts` -> `proxy.ts`.
    // Doc: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
    //
    // Importante: o Proxy NÃƒO deve interferir em `/api/*`.
    // Route Handlers devem responder com 401/403 quando necessÃ¡rio.
    // Se redirecionarmos `/api/*` para `/login`, quebramos `fetch`/SDKs.
    if (request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next({ request })
    }

    // DEV MODE: Bypass authentication in development
    if (process.env.DEV_MODE === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
        console.log('[proxy] DEV_MODE active - bypassing auth checks')
        return NextResponse.next({ request })
    }

    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Skip auth if not configured or using placeholder values
    const isConfigured = supabaseUrl &&
        supabaseAnonKey &&
        !supabaseUrl.includes('your_') &&
        supabaseUrl.startsWith('http')

    if (!isConfigured) {
        console.warn('[proxy] Supabase not configured - skipping auth check')
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refreshing the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // ---------------------------------------------------------------------
    // Setup guard: se a instÃ¢ncia nÃ£o foi inicializada, forÃ§ar /setup
    // ---------------------------------------------------------------------
    // ObservaÃ§Ã£o: is_instance_initialized() estÃ¡ com GRANT para anon/authenticated.
    // Se der erro, falhamos "aberto" (nÃ£o bloqueia navegaÃ§Ã£o) para evitar lockout.
    const pathname = request.nextUrl.pathname
    const isSetupRoute = pathname === '/setup' || pathname.startsWith('/setup/')
    const isInstallRoute = pathname === '/install' || pathname.startsWith('/install/')

    try {
        const { data: initData, error: initError } = await supabase.rpc('is_instance_initialized')
        if (!initError && initData === false && !isSetupRoute && !isInstallRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/setup'
            return NextResponse.redirect(url)
        }
    } catch {
        // ignore
    }

    // Protected routes - redirect to login if not authenticated
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')
    const isPublicRoute = pathname === '/' || pathname.startsWith('/join') || isSetupRoute || isInstallRoute

    if (!user && !isAuthRoute && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from login
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
