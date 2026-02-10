/**
 * AI Tools for WhatsApp Agent
 * Migrated from N8n workflow tools
 */

import { tool, jsonSchema } from 'ai';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { hybridSearchProperties } from './whatsapp-vector-search';

/**
 * Tool: Consultar_Base_Imoveis
 * Searches properties in the Supabase database
 * 
 * Uses explicit JSON Schema to avoid Zod version conflicts
 */
export const consultarBaseImoveis = tool({
    description: 'Busca informações detalhadas sobre imóveis (características, preço, localização, comodidades). Use quando o lead perguntar sobre imóveis específicos ou características.',
    parameters: jsonSchema({
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Termo de busca: pode ser ID do imóvel, bairro, tipo, ou características'
            },
        },
        required: ['query'],
    }),
    execute: async ({ query }: any) => {
        const supabase = createStaticAdminClient();

        // Check if query is an ID
        const idMatch = query.match(/ID:\s*(\d+)/i) || query.match(/^(\d+)$/);

        if (idMatch) {
            // Direct ID search
            const propertyId = idMatch[1];
            const { data, error } = await supabase
                .from('imoveis_catalogo')
                .select('*')
                .eq('id', propertyId)
                .single();

            if (error || !data) {
                return 'Imóvel não encontrado com este ID.';
            }

            return `Imóvel encontrado:
- Título: ${data.titulo}
- Tipo: ${data.tipo}
- Localização: ${data.localizacao}
- Preço: R$ ${data.preco?.toLocaleString('pt-BR')}
- Quartos: ${data.quartos || 'N/A'}
- Área: ${data.area_total}m²
- Link: ${data.link}`;
        }

        // Semantic search using vector embeddings + text fallback
        const results = await hybridSearchProperties(query, 5);

        if (results.length === 0) {
            return 'Nenhum imóvel encontrado com esses critérios. Sugira ao lead entrar em contato com o Max para buscar opções na rede RE/MAX.';
        }

        // Format results for AI
        return results.map((property, index) => `
${index + 1}. ${property.titulo || property.tipo}
   - Tipo: ${property.tipo}
   - Localização: ${property.localizacao}
   - Preço: R$ ${property.preco?.toLocaleString('pt-BR')}
   - Quartos: ${property.quartos || 'N/A'}
   - Área: ${property.area_total}m²
   - Link: ${property.link}
   - Relevância: ${(property.similarity * 100).toFixed(0)}%
      `).join('\n---\n');
    }
} as any);

/**
 * Tool: acionar_humano
 * Notifies human agent to take over the conversation
 * 
 * Uses explicit JSON Schema to avoid Zod version conflicts
 */
export const acionarHumano = tool({
    description: 'Notifica humano para assumir o atendimento. Use quando o lead pedir explicitamente para falar com humano ou quando você não conseguir resolver a solicitação.',
    parameters: jsonSchema({
        type: 'object',
        properties: {
            motivo: {
                type: 'string',
                description: 'Motivo do transbordo para humano'
            },
        },
        required: ['motivo'],
    }),
    execute: async ({ motivo }: any) => {
        const MAX_PHONE = process.env.MAX_PHONE_NUMBER || '5561992978796';

        // Simulação de transbordo (TODO: Integração real Evolution API)
        return `Transbordo solicitado. Motivo: ${motivo}. O Max será notificado.`;
    }
} as any);

/**
 * Export all tools as an object
 */
export const whatsappAgentTools = {
    consultarBaseImoveis,
    acionarHumano,
};
