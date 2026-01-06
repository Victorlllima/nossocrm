import { z } from 'zod'

/**
 * Schema de validação para o formulário de onboarding/setup
 */
export const setupFormSchema = z.object({
    organizationName: z
        .string()
        .min(2, 'Nome da empresa deve ter no mínimo 2 caracteres')
        .max(100, 'Nome da empresa deve ter no máximo 100 caracteres'),
    fullName: z
        .string()
        .min(2, 'Nome completo deve ter no mínimo 2 caracteres')
        .max(100, 'Nome completo deve ter no máximo 100 caracteres'),
})

export type SetupFormData = z.infer<typeof setupFormSchema>
