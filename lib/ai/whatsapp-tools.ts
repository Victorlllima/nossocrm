/**
 * AI Tools for WhatsApp Agent
 * Migrated from N8n workflow tools
 */

import { tool } from 'ai';
import { z } from 'zod'; // Zod v3.x (Correct version)
import { createStaticAdminClient } from '@/lib/supabase/server';
import { hybridSearchProperties } from './whatsapp-vector-search';

/**
 * Tool: Consultar_Base_Imoveis
 * Searches properties in the Supabase database
 * 
 * Original N8n implementation: Supabase Vector Store + Regular Query
 */
// @ts-ignore
export const consultarBaseImoveis = tool({
    description: 'Busca informações detalhadas sobre imóveis (características, preço, localização, comodidades). Use quando o lead perguntar sobre imóveis específicos ou características.',
    parameters: z.object({
        query: z.string().describe('Termo de busca: pode ser ID do imóvel, bairro, tipo, ou características'),
    }),
    execute: async (args: any) => {
        const query = args.query;
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
 * Original N8n implementation: HTTP Request to Evolution API
 */
// @ts-ignore
export const acionarHumano = tool({
    description: 'Notifica humano para assumir o atendimento. Use quando o lead pedir explicitamente para falar com humano ou quando você não conseguir resolver a solicitação.',
    parameters: z.object({
        motivo: z.string().describe('Motivo do transbordo para humano'),
    }),
    execute: async (args: any) => {
        const motivo = args.motivo;
        const MAX_PHONE = process.env.MAX_PHONE_NUMBER || '5561992978796';
        const EVOLUTION_URL = process.env.EVOLUTION_API_URL || '';
        const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';

        // Get lead phone from context (will be passed via agent state)
        // For now, returning success message
        // TODO: Implement actual Evolution API call

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
