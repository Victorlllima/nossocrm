import { z } from 'zod'

/**
 * Schema de validaÃ§Ã£o para o formulÃ¡rio de onboarding/setup
 */
export const setupFormSchema = z.object({
    organizationName: z
        .string()
        .min(2, 'Nome da empresa deve ter no mÃ­nimo 2 caracteres')
        .max(100, 'Nome da empresa deve ter no mÃ¡ximo 100 caracteres'),
    fullName: z
        .string()
        .min(2, 'Nome completo deve ter no mÃ­nimo 2 caracteres')
        .max(100, 'Nome completo deve ter no mÃ¡ximo 100 caracteres'),
})

export type SetupFormData = z.infer<typeof setupFormSchema>
