/**
 * AI Tools for WhatsApp Agent
 * Migrated from N8n workflow tools
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { hybridSearchProperties } from './whatsapp-vector-search';

/**
 * Tool: Consultar_Base_Imoveis
 * Searches properties in the Supabase database
 */
export const consultarBaseImoveis = tool({
    description: 'Busca informações detalhadas sobre imóveis (características, preço, localização, comodidades). Use quando o lead perguntar sobre imóveis específicos ou características.',
    parameters: z.object({
        query: z.string().min(2).describe('Termo de busca: pode ser ID do imóvel, bairro, tipo, ou características em linguagem natural.'),
    }),
    execute: async ({ query }) => {
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
                .maybeSingle();

            if (error || !data) {
                return 'Imóvel não encontrado com este ID.';
            }

            return `Imóvel encontrado:
- Título: ${data.titulo}
- Tipo: ${data.tipo}
- Localização: ${data.localizacao}
- Preço: R$ ${data.preco?.toLocaleString('pt-BR')}
- Quartos: ${data.quartos || 'N/A'}
- Írea: ${data.area_total}mÂ²
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
   - Írea: ${property.area_total}mÂ²
   - Link: ${property.link}
   - Relevância: ${(property.similarity * 100).toFixed(0)}%
      `).join('\n---\n');
    }
});

/**
 * Tool: acionar_humano
 * Notifies human agent to take over the conversation
 */
export const acionarHumano = tool({
    description: 'Notifica humano para assumir o atendimento. Use quando o lead pedir explicitamente para falar com humano ou quando você não conseguir resolver a solicitação.',
    parameters: z.object({
        motivo: z.string().describe('Motivo do transbordo para humano'),
    }),
    execute: async ({ motivo }) => {
        // Simulação de transbordo (TODO: Integração real Evolution API)
        return `Transbordo solicitado. Motivo: ${motivo}. O Max será notificado.`;
    }
});

/**
 * Export all tools as an object
 */
export const whatsappAgentTools = {
    consultarBaseImoveis,
    acionarHumano,
};
