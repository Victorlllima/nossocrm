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

    // Detecta se a instÃ¢ncia jÃ¡ foi inicializada.
    // - Se falhar (env/supabase indisponÃ­vel), tratamos como "nÃ£o inicializada" quando o installer estÃ¡ enabled.
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

    // â€œPadrÃ£o ouroâ€ pÃ³s-deploy:
    // - Se o installer estÃ¡ habilitado e a instÃ¢ncia confirmadamente NÃƒO estÃ¡ inicializada, manda pro /install.
    // - Se jÃ¡ estÃ¡ inicializada ou houve erro na checagem, nÃ£o forÃ§a /install (evita loops em falhas de conexÃ£o).
    if (installerEnabled && isInitialized === false) {
        redirect('/install')
    }

    // ApÃ³s um reset do banco (ou instÃ¢ncia nÃ£o inicializada), leva para o setup interno.
    if (isInitialized === false) {
        redirect('/setup')
    }

    redirect('/dashboard')
}
