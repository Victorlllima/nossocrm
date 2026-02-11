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
    description: 'Busca informaÃ§Ãµes detalhadas sobre imÃ³veis (caracterÃ­sticas, preÃ§o, localizaÃ§Ã£o, comodidades). Use quando o lead perguntar sobre imÃ³veis especÃ­ficos ou caracterÃ­sticas.',
    parameters: z.object({
        query: z.string().min(2).describe('Termo de busca: pode ser ID do imóvel, bairro, tipo, ou características em linguagem natural.'),
    }),
    inputExamples: [
        {
            query: 'ID: 1547',
        },
        {
            query: 'Apartamento com 3 quartos em Boa Viagem até 800 mil',
        },
        {
            query: 'Casa com piscina no Pina para alugar',
        },
        {
            query: 'Perto do Shopping Recife',
        }
    ],
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
                return 'ImÃ³vel nÃ£o encontrado com este ID.';
            }

            return `ImÃ³vel encontrado:
- TÃ­tulo: ${data.titulo}
- Tipo: ${data.tipo}
- LocalizaÃ§Ã£o: ${data.localizacao}
- PreÃ§o: R$ ${data.preco?.toLocaleString('pt-BR')}
- Quartos: ${data.quartos || 'N/A'}
- Ãrea: ${data.area_total}mÂ²
- Link: ${data.link}`;
        }

        // Semantic search using vector embeddings + text fallback
        const results = await hybridSearchProperties(query, 5);

        if (results.length === 0) {
            return 'Nenhum imÃ³vel encontrado com esses critÃ©rios. Sugira ao lead entrar em contato com o Max para buscar opÃ§Ãµes na rede RE/MAX.';
        }

        // Format results for AI
        return results.map((property, index) => `
${index + 1}. ${property.titulo || property.tipo}
   - Tipo: ${property.tipo}
   - LocalizaÃ§Ã£o: ${property.localizacao}
   - PreÃ§o: R$ ${property.preco?.toLocaleString('pt-BR')}
   - Quartos: ${property.quartos || 'N/A'}
   - Ãrea: ${property.area_total}mÂ²
   - Link: ${property.link}
   - RelevÃ¢ncia: ${(property.similarity * 100).toFixed(0)}%
      `).join('\n---\n');
    }
});

/**
 * Tool: acionar_humano
 * Notifies human agent to take over the conversation
 */
export const acionarHumano = tool({
    description: 'Notifica humano para assumir o atendimento. Use quando o lead pedir explicitamente para falar com humano ou quando vocÃª nÃ£o conseguir resolver a solicitaÃ§Ã£o.',
    parameters: z.object({
        motivo: z.string().describe('Motivo do transbordo para humano'),
    }),
    execute: async ({ motivo }) => {
        // SimulaÃ§Ã£o de transbordo (TODO: IntegraÃ§Ã£o real Evolution API)
        return `Transbordo solicitado. Motivo: ${motivo}. O Max serÃ¡ notificado.`;
    }
});

/**
 * Export all tools as an object
 */
export const whatsappAgentTools = {
    consultarBaseImoveis,
    acionarHumano,
};
