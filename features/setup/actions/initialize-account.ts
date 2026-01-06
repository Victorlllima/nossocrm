'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

/**
 * Schema de validação para onboarding/setup
 */
const setupSchema = z.object({
    organizationName: z
        .string()
        .min(2, 'Nome da empresa deve ter no mínimo 2 caracteres')
        .max(100, 'Nome da empresa deve ter no máximo 100 caracteres'),
    fullName: z
        .string()
        .min(2, 'Nome completo deve ter no mínimo 2 caracteres')
        .max(100, 'Nome completo deve ter no máximo 100 caracteres'),
})

export type SetupFormData = z.infer<typeof setupSchema>

export type SetupState = {
    success: boolean
    message: string
    errors?: {
        organizationName?: string[]
        fullName?: string[]
    }
}

/**
 * Gera um slug único a partir do nome da organização
 */
function generateSlug(name: string): string {
    const base = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
        .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
        .substring(0, 50)

    // Adiciona um sufixo único baseado no timestamp
    const suffix = Date.now().toString(36).substring(-4)
    return `${base}-${suffix}`
}

/**
 * Server Action para inicializar a conta do usuário após o signup
 * 
 * Cria:
 * 1. Organization (empresa do usuário)
 * 2. Profile (perfil do usuário vinculado à org)
 * 3. Board padrão "Vendas" para não começar vazio
 * 
 * @param prevState - Estado anterior
 * @param formData - Dados do formulário
 * @returns Estado com resultado da operação
 */
export async function initializeAccount(
    prevState: SetupState | null,
    formData: FormData
): Promise<SetupState> {
    const rawData = {
        organizationName: formData.get('organizationName') as string,
        fullName: formData.get('fullName') as string,
    }

    // Valida os dados
    const validatedFields = setupSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Verifique os campos abaixo',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { organizationName, fullName } = validatedFields.data

    try {
        const supabase = await createClient()

        // Obtém o usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return {
                success: false,
                message: 'Sessão expirada. Faça login novamente.',
            }
        }

        // Verifica se já tem organização
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (existingProfile?.organization_id) {
            return {
                success: false,
                message: 'Sua conta já está configurada.',
            }
        }

        // Gera slug único
        const slug = generateSlug(organizationName)

        // 1. Criar Organization
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name: organizationName,
                slug,
                owner_id: user.id,
            })
            .select('id')
            .single()

        if (orgError) {
            console.error('Error creating organization:', orgError)

            if (orgError.code === '23505') { // Unique violation
                return {
                    success: false,
                    message: 'Uma organização com esse nome já existe. Tente outro nome.',
                    errors: { organizationName: ['Nome já está em uso'] },
                }
            }

            return {
                success: false,
                message: 'Erro ao criar organização. Tente novamente.',
            }
        }

        // Separa primeiro nome e sobrenome
        const nameParts = fullName.trim().split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || null

        // 2. Criar/Atualizar Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email!,
                organization_id: org.id,
                role: 'admin',
                first_name: firstName,
                last_name: lastName,
            }, {
                onConflict: 'id',
            })

        if (profileError) {
            console.error('Error creating profile:', profileError)

            // Rollback: remove org criada
            await supabase.from('organizations').delete().eq('id', org.id)

            return {
                success: false,
                message: 'Erro ao criar perfil. Tente novamente.',
            }
        }

        // 3. Criar Board padrão "Vendas"
        const { data: board, error: boardError } = await supabase
            .from('boards')
            .insert({
                organization_id: org.id,
                name: 'Vendas',
                description: 'Pipeline de vendas padrão',
                is_default: true,
            })
            .select('id')
            .single()

        if (!boardError && board) {
            // Criar estágios padrão
            const defaultStages = [
                { name: 'Novo', order: 0, color: '#3B82F6' },
                { name: 'Contato Feito', order: 1, color: '#8B5CF6' },
                { name: 'Proposta Enviada', order: 2, color: '#F59E0B' },
                { name: 'Negociação', order: 3, color: '#10B981' },
                { name: 'Fechado Ganho', order: 4, color: '#22C55E' },
                { name: 'Fechado Perdido', order: 5, color: '#EF4444' },
            ]

            await supabase.from('board_stages').insert(
                defaultStages.map(stage => ({
                    board_id: board.id,
                    name: stage.name,
                    order: stage.order,
                    color: stage.color,
                }))
            )
        }

        // Revalida o cache para atualizar o layout
        revalidatePath('/', 'layout')

        return {
            success: true,
            message: 'Conta configurada com sucesso!',
        }
    } catch (error) {
        console.error('Unexpected setup error:', error)
        return {
            success: false,
            message: 'Erro interno. Tente novamente mais tarde.',
        }
    }
}
