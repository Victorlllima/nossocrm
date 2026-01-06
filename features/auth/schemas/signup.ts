import { z } from 'zod'

/**
 * Schema de validação para cadastro de usuário
 * Usado tanto no cliente (react-hook-form) quanto no servidor (Server Action)
 */
export const signupFormSchema = z.object({
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

export type SignupFormData = z.infer<typeof signupFormSchema>
