import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Componente React `Home`.
 * @returns {Promise<void>} Retorna uma Promise resolvida sem valor.
 */
export default async function Home() {
    // Bypass em desenvolvimento local: sempre vai para o dashboard
    if (process.env.NODE_ENV === 'development') {
        redirect('/dashboard')
    }

    const installerEnabled = process.env.INSTALLER_ENABLED !== 'false'

    // Detecta se a instância já foi inicializada.
    // - Se falhar (env/supabase indisponível), tratamos como "não inicializada" quando o installer está enabled.
    let isInitialized: boolean | null = null
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('is_instance_initialized')
        if (!error && typeof data === 'boolean') {
            isInitialized = data
        }
    } catch {
        isInitialized = null
    }

    // “Padrão ouro” pós-deploy:
    // - Se o installer está habilitado e a instância confirmadamente NÃO está inicializada, manda pro /install.
    // - Se já está inicializada ou houve erro na checagem, não força /install (evita loops em falhas de conexão).
    if (installerEnabled && isInitialized === false) {
        redirect('/install')
    }

    // Após um reset do banco (ou instância não inicializada), leva para o setup interno.
    if (isInitialized === false) {
        redirect('/setup')
    }

    redirect('/dashboard')
}
