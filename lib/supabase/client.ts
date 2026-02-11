'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Check if Supabase is properly configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isConfigured = supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_') &&
    supabaseUrl.startsWith('http')

let _supabase: SupabaseClient | null = null

/**
 * FunÃ§Ã£o pÃºblica `createClient` do projeto.
 * @returns {SupabaseClient<any, "public", "public", any, any> | null} Retorna um valor do tipo `SupabaseClient<any, "public", "public", any, any> | null`.
 */
export function createClient(): SupabaseClient | null {
    if (!isConfigured) {
        console.warn('[supabase] Not configured - auth will not work')
        return null
    }

    if (!_supabase) {
        _supabase = createBrowserClient(supabaseUrl!, supabaseAnonKey!)
    }
    return _supabase
}

// Alias for backward compatibility
// Importante: em ambientes devidamente configurados, `createClient()` nunca deve retornar null.
// Mantemos o retorno `SupabaseClient | null` em `createClient` para permitir uma mensagem
// amigÃ¡vel em dev quando o `.env` nÃ£o estÃ¡ preenchido, mas exportamos o singleton como
// nÃ£o-nulo para simplificar o restante do cÃ³digo (e evitar checks repetitivos).
export const supabase: SupabaseClient = createClient() as SupabaseClient
