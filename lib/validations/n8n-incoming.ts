import { z } from 'zod';

/**
 * Schema de validação para o webhook do n8n/WhatsApp
 * Garante sanitização e formato correto dos dados de entrada
 */
export const n8nIncomingSchema = z.object({
    // Telefone no formato E.164 (ex: +5511999999999)
    phone: z
        .string()
        .min(10, 'Telefone deve ter no mínimo 10 dígitos')
        .max(15, 'Telefone deve ter no máximo 15 dígitos')
        .regex(/^\+?[1-9]\d{9,14}$/, 'Formato de telefone inválido'),

    // Nome opcional do contato
    name: z.string().max(255).optional(),

    // ID da organização (UUID obrigatório para multi-tenancy)
    organization_id: z.string().uuid('organization_id deve ser um UUID válido'),
});

export type N8nIncomingPayload = z.infer<typeof n8nIncomingSchema>;
