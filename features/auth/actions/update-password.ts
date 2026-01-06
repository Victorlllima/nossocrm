'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

/**
 * Schema de validação para atualização de senha
 */
const updatePasswordSchema = z.object({
    newPassword: z
        .string()
        .min(6, 'Senha deve ter no mínimo 6 caracteres')
        .max(72, 'Senha deve ter no máximo 72 caracteres'),
    confirmPassword: z
        .string()
        .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

export type UpdatePasswordState = {
    success: boolean
    message: string
    errors?: {
        newPassword?: string[]
        confirmPassword?: string[]
    }
}

/**
 * Server Action para atualização obrigatória de senha
 * 
 * 1. Valida a nova senha
 * 2. Atualiza via supabase.auth.updateUser
 * 3. Remove flag must_change_password do profile
 * 4. Revalida cache
 * 
 * @param prevState - Estado anterior
 * @param formData - Dados do formulário
 * @returns Estado com resultado da operação
 */
export async function updatePassword(
    prevState: UpdatePasswordState | null,
    formData: FormData
): Promise<UpdatePasswordState> {
    const rawData = {
        newPassword: formData.get('newPassword') as string,
        confirmPassword: formData.get('confirmPassword') as string,
    }

    // Valida os dados
    const validatedFields = updatePasswordSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Verifique os campos abaixo',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { newPassword } = validatedFields.data

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

        // Atualiza a senha via Supabase Auth
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (updateError) {
            console.error('Error updating password:', updateError)

            // Mapeia erros comuns
            if (updateError.message.includes('should be different')) {
                return {
                    success: false,
                    message: 'A nova senha deve ser diferente da senha atual.',
                }
            }

            if (updateError.message.includes('weak')) {
                return {
                    success: false,
                    message: 'Senha muito fraca. Use uma senha mais forte.',
                    errors: { newPassword: ['Senha muito fraca'] },
                }
            }

            return {
                success: false,
                message: 'Erro ao atualizar senha. Tente novamente.',
            }
        }

        // Remove a flag must_change_password
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', user.id)

        if (profileError) {
            console.error('Error updating profile:', profileError)
            // Não retorna erro pois a senha já foi atualizada
            // O usuário pode tentar novamente
        }

        // Revalida o cache para atualizar o AuthContext
        revalidatePath('/', 'layout')

        return {
            success: true,
            message: 'Senha atualizada com sucesso!',
        }
    } catch (error) {
        console.error('Unexpected password update error:', error)
        return {
            success: false,
            message: 'Erro interno. Tente novamente mais tarde.',
        }
    }
}
