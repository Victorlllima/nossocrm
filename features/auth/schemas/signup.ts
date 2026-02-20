import { z } from 'zod'

/**
 * Schema de validaÃ§Ã£o para cadastro de usuÃ¡rio
 * Usado tanto no cliente (react-hook-form) quanto no servidor (Server Action)
 */
export const signupFormSchema = z.object({
    email: z
        .string()
        .min(1, 'Email Ã© obrigatÃ³rio')
        .email('Email invÃ¡lido'),
    password: z
        .string()
        .min(6, 'Senha deve ter no mÃ­nimo 6 caracteres')
        .max(72, 'Senha deve ter no mÃ¡ximo 72 caracteres'),
    confirmPassword: z
        .string()
        .min(1, 'ConfirmaÃ§Ã£o de senha Ã© obrigatÃ³ria'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nÃ£o coincidem',
    path: ['confirmPassword'],
})

export type SignupFormData = z.infer<typeof signupFormSchema>
