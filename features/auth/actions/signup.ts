'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { z } from 'zod'

/**
 * Schema de validação para cadastro
 */
const signupSchema = z.object({
    email: z
        .string()
        .min(1, 'Email é obrigatório')
        .email('Email inválido'),
    password: z
        .string()
        .min(6, 'Senha deve ter no mínimo 6 caracteres')
        .max(72, 'Senha deve ter no máximo 72 caracteres'),
    confirmPassword: z
        .string()
        .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

export type SignupState = {
    success: boolean
    message: string
    errors?: {
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
    }
}

/**
 * Server Action para cadastro de usuário
 * 
 * @param prevState - Estado anterior do formulário
 * @param formData - Dados do formulário
 * @returns Estado atualizado com resultado da operação
 */
export async function signup(
    prevState: SignupState | null,
    formData: FormData
): Promise<SignupState> {
    // Extrai os dados do formulário
    const rawData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        confirmPassword: formData.get('confirmPassword') as string,
    }

    // Valida os dados com Zod
    const validatedFields = signupSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Verifique os campos abaixo',
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { email, password } = validatedFields.data

    // Obtém a origem para o redirect do email
    const headersList = await headers()
    const origin = headersList.get('origin') || headersList.get('x-forwarded-host') || 'http://localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const baseUrl = origin.startsWith('http') ? origin : `${protocol}://${origin}`

    try {
        const supabase = await createClient()

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${baseUrl}/auth/callback`,
            },
        })

        if (error) {
            // Mapeia erros comuns do Supabase
            if (error.message.includes('already registered')) {
                return {
                    success: false,
                    message: 'Este email já está cadastrado. Tente fazer login.',
                }
            }

            if (error.message.includes('Password')) {
                return {
                    success: false,
                    message: 'Senha não atende aos requisitos de segurança.',
                    errors: { password: [error.message] },
                }
            }

            return {
                success: false,
                message: error.message || 'Erro ao criar conta. Tente novamente.',
            }
        }

        // Verifica se o email precisa de confirmação
        if (data?.user?.identities?.length === 0) {
            return {
                success: false,
                message: 'Este email já está cadastrado. Tente fazer login.',
            }
        }

        return {
            success: true,
            message: 'Conta criada com sucesso! Verifique seu email para confirmar o cadastro.',
        }
    } catch (error) {
        console.error('Signup error:', error)
        return {
            success: false,
            message: 'Erro interno. Tente novamente mais tarde.',
        }
    }
}
