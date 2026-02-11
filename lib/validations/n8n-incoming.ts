import { z } from 'zod';

/**
 * Schema de validaÃ§Ã£o para o webhook do n8n/WhatsApp
 * Garante sanitizaÃ§Ã£o e formato correto dos dados de entrada
 */
export const n8nIncomingSchema = z.object({
    // Telefone no formato E.164 (ex: +5511999999999)
    phone: z
        .string()
        .min(10, 'Telefone deve ter no mÃ­nimo 10 dÃ­gitos')
        .max(15, 'Telefone deve ter no mÃ¡ximo 15 dÃ­gitos')
        .regex(/^\+?[1-9]\d{9,14}$/, 'Formato de telefone invÃ¡lido'),

    // Nome opcional do contato
    name: z.string().max(255).optional(),

    // ID da organizaÃ§Ã£o (UUID obrigatÃ³rio para multi-tenancy)
    organization_id: z.string().uuid('organization_id deve ser um UUID vÃ¡lido'),
});

export type N8nIncomingPayload = z.infer<typeof n8nIncomingSchema>;
