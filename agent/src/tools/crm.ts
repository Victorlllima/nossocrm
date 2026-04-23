import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';

// Cria ou atualiza um lead no CRM com os dados coletados na conversa
export const criarOuAtualizarLead = tool({
  description:
    'Cria ou atualiza o cadastro do lead no CRM com as informações coletadas na conversa. ' +
    'Use quando o lead informar nome, interesse em imóvel, bairro desejado, ou tipo de negócio (compra/aluguel).',
  parameters: z.object({
    nome: z.string().optional().describe('Nome do lead'),
    bairros_interesse: z.string().optional().describe('Bairros de interesse mencionados'),
    tipo_interesse: z.string().optional().describe('Compra ou aluguel'),
    objetivo: z.string().optional().describe('Objetivo do lead: comprar, alugar, vender, investir'),
    imovel_interesse_id: z.string().optional().describe('ID do imóvel que o lead demonstrou interesse'),
    imovel_interesse_nome: z.string().optional().describe('Nome ou descrição do imóvel de interesse'),
    objecao_tipo: z.string().optional().describe('Tipo de objeção apresentada pelo lead (preço, localização, etc)'),
    notes: z.string().optional().describe('Observações adicionais sobre o lead'),
  }),
  execute: async (params, { toolCallId }) => {
    const sessionId: string = (toolCallId as unknown as { sessionId?: string })?.sessionId ?? '';
    const whatsappId: string = (toolCallId as unknown as { whatsappId?: string })?.whatsappId ?? '';

    if (!whatsappId) return 'Lead não identificado — whatsapp_id ausente.';

    const updateData: Record<string, unknown> = {
      ultima_interacao_at: new Date().toISOString(),
    };

    if (params.nome) updateData.name = params.nome;
    if (params.bairros_interesse) updateData.bairros_interesse = params.bairros_interesse;
    if (params.tipo_interesse) updateData.tipo_interesse = params.tipo_interesse;
    if (params.objetivo) updateData.objetivo = params.objetivo;
    if (params.imovel_interesse_id) updateData.imovel_interesse_id = params.imovel_interesse_id;
    if (params.imovel_interesse_nome) updateData.imovel_interesse_nome = params.imovel_interesse_nome;
    if (params.objecao_tipo) updateData.objecao_tipo = params.objecao_tipo;
    if (params.notes) updateData.notes = params.notes;

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('whatsapp_id', whatsappId);

    if (error) {
      console.error('[crm] Erro ao atualizar lead:', error.message);
      return 'Erro ao atualizar cadastro do lead.';
    }

    return 'Cadastro do lead atualizado com sucesso.';
  },
});

// Busca dados atuais do lead
export const buscarLead = tool({
  description: 'Busca os dados atuais do lead no CRM, incluindo histórico de interesse e status.',
  parameters: z.object({
    whatsapp_id: z.string().describe('WhatsApp ID do lead'),
  }),
  execute: async ({ whatsapp_id }) => {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, status, tipo_interesse, bairros_interesse, objetivo, imovel_interesse_id, imovel_interesse_nome, notes, ultima_interacao_at')
      .eq('whatsapp_id', whatsapp_id)
      .maybeSingle();

    if (error || !data) return 'Lead não encontrado no CRM.';

    return JSON.stringify(data);
  },
});
