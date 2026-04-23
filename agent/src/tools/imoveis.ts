import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';

const OPENAI_KEY = process.env.OPENAI_API_KEY!;

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!res.ok) throw new Error('Erro ao gerar embedding');
  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

export const consultarBaseImoveis = tool({
  description:
    'Busca imóveis na base. REQUER obrigatoriamente um ID do imóvel (ex: "880161048-30"), ' +
    'nome do imóvel, bairro ou tipo. IMPORTANTE: Se você NÃO tiver nenhuma dessas informações ' +
    'no contexto ou na mensagem atual, NÃO chame esta ferramenta — ' +
    'pergunte ao lead qual imóvel ele deseja consultar.',
  parameters: z.object({
    query: z.string().describe(
      'Texto de busca livre: bairro, tipo, número de quartos, ID do imóvel, etc. ' +
      'Ex: "apartamento Taguatinga", "casa 4 quartos Vicente Pires", "880161048-30"'
    ),
    tipo: z.string().optional().describe('Tipo do imóvel: apartamento, casa, loja, chacara'),
    quartos_min: z.number().optional().describe('Número mínimo de quartos'),
    preco_max: z.number().optional().describe('Preço máximo em reais'),
  }),
  execute: async ({ query, tipo, quartos_min, preco_max }) => {
    try {
      console.log(`[imoveis] Buscando: "${query}" tipo=${tipo} quartos>=${quartos_min} preco<=${preco_max}`);

      // Estratégia 1: buscar_imoveis_tool (busca textual + filtros)
      const rpcParams: Record<string, unknown> = { p_busca_texto: query };
      if (tipo) rpcParams.p_tipo = tipo;
      if (quartos_min) rpcParams.p_quartos_min = quartos_min;
      if (preco_max) rpcParams.p_preco_max = preco_max;

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('buscar_imoveis_tool', rpcParams);

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        console.log(`[imoveis] buscar_imoveis_tool retornou ${rpcData.length} resultados`);
        return JSON.stringify(rpcData.slice(0, 12));
      }

      if (rpcError) {
        console.error('[imoveis] buscar_imoveis_tool erro:', rpcError.message);
      }

      // Estratégia 2: busca vetorial via match_imoveis
      console.log('[imoveis] Tentando busca vetorial...');
      const embedding = await getEmbedding(query);

      const { data, error } = await supabase.rpc('match_imoveis', {
        query_embedding: embedding,
        match_count: 12,
        filter: {},
      });

      if (error) {
        console.error('[imoveis] match_imoveis erro:', error.message);
        return 'Não foi possível consultar a base de imóveis no momento.';
      }

      if (!data || data.length === 0) {
        return 'Nenhum imóvel encontrado para este perfil ou localização.';
      }

      console.log(`[imoveis] match_imoveis retornou ${data.length} resultados`);
      return JSON.stringify(data);
    } catch (err) {
      console.error('[imoveis] Erro inesperado:', err);
      return 'Erro ao consultar base de imóveis.';
    }
  },
});
