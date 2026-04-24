import { tool } from 'ai';
import { z } from 'zod';
import { supabase } from '../services/supabase.js';

const BOARD_ID = '7d9637e4-7bde-4a58-bc41-0bd3f03c329f';
const STAGE_NOVO_LEAD = '298e1028-8fc0-48d0-9d14-14a514415245';
const ORG_ID = '3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45';
const OWNER_ID = '963bb55f-37fe-4404-b0da-6f5f915aa23c';

// Cria contact + deal no board do CRM a partir de dados coletados na conversa
export const criarDealNoCRM = tool({
  description:
    'Cria um contato e um deal no board do CRM quando o lead informar nome e telefone. ' +
    'Use assim que tiver nome completo e telefone confirmados na conversa. ' +
    'Só chame uma vez por lead — verifica duplicata antes de criar.',
  parameters: z.object({
    nome: z.string().describe('Nome completo do lead'),
    telefone: z.string().describe('Telefone do lead com DDD, apenas dígitos'),
    bairro: z.string().optional().describe('Bairro de interesse mencionado'),
    objetivo: z.string().optional().describe('Compra, venda, aluguel ou investimento'),
    observacoes: z.string().optional().describe('Resumo do interesse coletado na conversa'),
  }),
  execute: async (params, { toolCallId }) => {
    const whatsappId: string = (toolCallId as unknown as { whatsappId?: string })?.whatsappId ?? '';

    // Normaliza telefone
    const telefone = params.telefone.replace(/\D/g, '');

    // Verifica duplicata por telefone
    const { data: existente } = await supabase
      .from('contacts')
      .select('id')
      .eq('whatsapp_phone', telefone)
      .eq('organization_id', ORG_ID)
      .maybeSingle();

    if (existente) {
      return `Lead já cadastrado no CRM (contact_id: ${existente.id}).`;
    }

    const notes = [
      params.objetivo ? `Objetivo: ${params.objetivo}` : '',
      params.bairro ? `Bairro de interesse: ${params.bairro}` : '',
      params.observacoes ? `Obs: ${params.observacoes}` : '',
      whatsappId ? `WhatsApp: ${whatsappId}` : '',
    ].filter(Boolean).join('\n');

    // Cria contato
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        name: params.nome,
        phone: telefone,
        whatsapp_phone: telefone,
        source: `whatsapp:${whatsappId}`,
        status: 'active',
        organization_id: ORG_ID,
        owner_id: OWNER_ID,
        notes,
      })
      .select('id')
      .single();

    if (contactError) {
      console.error('[crm] Erro ao criar contato:', contactError.message);
      return `Erro ao criar contato: ${contactError.message}`;
    }

    // Cria deal
    const dealTitle = params.bairro ? `${params.nome} — ${params.bairro}` : params.nome;

    const { error: dealError } = await supabase
      .from('deals')
      .insert({
        title: dealTitle,
        contact_id: contact.id,
        board_id: BOARD_ID,
        stage_id: STAGE_NOVO_LEAD,
        status: 'open',
        priority: 'medium',
        organization_id: ORG_ID,
        owner_id: OWNER_ID,
        tags: ['whatsapp'],
        custom_fields: {
          whatsapp_id: whatsappId,
          objetivo: params.objetivo ?? '',
          bairro: params.bairro ?? '',
        },
      });

    if (dealError) {
      await supabase.from('contacts').delete().eq('id', contact.id);
      console.error('[crm] Erro ao criar deal:', dealError.message);
      return `Erro ao criar deal: ${dealError.message}`;
    }

    return `Lead "${params.nome}" cadastrado no CRM com sucesso — aparecerá no board em "Novo Lead".`;
  },
});

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
