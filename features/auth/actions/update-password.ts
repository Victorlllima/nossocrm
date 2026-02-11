'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

/**
 * Schema de validaÃ§Ã£o para atualizaÃ§Ã£o de senha
 */
const updatePasswordSchema = z.object({
    newPassword: z
        .string()
        .min(6, 'Senha deve ter no mÃ­nimo 6 caracteres')
        .max(72, 'Senha deve ter no mÃ¡ximo 72 caracteres'),
    confirmPassword: z
        .string()
        .min(1, 'ConfirmaÃ§Ã£o de senha Ã© obrigatÃ³ria'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas nÃ£o coincidem',
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
 * Server Action para atualizaÃ§Ã£o obrigatÃ³ria de senha
 * 
 * 1. Valida a nova senha
 * 2. Atualiza via supabase.auth.updateUser
 * 3. Remove flag must_change_password do profile
 * 4. Revalida cache
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

        // ObtÃ©m o usuÃ¡rio atual
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return {
                success: false,
                message: 'SessÃ£o expirada. FaÃ§a login novamente.',
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
            // NÃ£o retorna erro pois a senha jÃ¡ foi atualizada
            // O usuÃ¡rio pode tentar novamente
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
