/**
 * Lead Context Preparation
 * Migrated from N8n node: Preparar_Contexto_Lead (line 1626)
 */

import { createStaticAdminClient } from '@/lib/supabase/server';

export interface LeadContext {
    contexto_lead: string;
    imovel_id: string | null;
    imovel_nome: string | null;
}

/**
 * Prepares dynamic context about the lead's property interest
 * 
 * This function replicates the N8n "Preparar_Contexto_Lead" node logic:
 * 1. Fetches lead data from Supabase
 * 2. Checks for property interest (imovel_interesse_id, imovel_interesse_nome)
 * 3. Builds context string to inject into system prompt
 * 
 * @param leadPhone - Lead's WhatsApp phone number
 * @returns Lead context object with formatted context string
 */
export async function prepararContextoLead(leadPhone: string): Promise<LeadContext> {
    const supabase = createStaticAdminClient();

    // Fetch lead data
    const { data: leadData, error } = await supabase
        .from('leads')
        .select('imovel_interesse_id, imovel_interesse_nome, campanha_origem, bairros_interesse, tipo_interesse')
        .eq('whatsapp_id', leadPhone)
        .single();

    if (error || !leadData) {
        return {
            contexto_lead: '',
            imovel_id: null,
            imovel_nome: null,
        };
    }

    // Build context string (exact logic from N8n)
    let contextoLead = '';

    if (leadData.imovel_interesse_id) {
        contextoLead = `
# CONTEXTO IMPORTANTE DO LEAD
Este lead demonstrou interesse no imóvel **"${leadData.imovel_interesse_nome || 'ID: ' + leadData.imovel_interesse_id}"** através da campanha "${leadData.campanha_origem || 'Meta Ads'}".

**REGRA CRÍTICA:** Quando o lead perguntar sobre "o imóvel", "o apartamento", "a casa", "esse imóvel", "preço", "fotos", "características" SEM especificar qual, você DEVE:
1. Usar a tool Consultar_Base_Imoveis com o termo: "ID: ${leadData.imovel_interesse_id}"
2. Mencionar o nome do imóvel nas respostas: "${leadData.imovel_interesse_nome}"
3. NUNCA perguntar "De qual imóvel você está falando?"

Exemplo:
- Lead: "Qual o preço?"
- Você: "O ${leadData.imovel_interesse_nome} está no valor de [buscar na tool]"
`;
    } else if (leadData.bairros_interesse) {
        contextoLead = `
# CONTEXTO DO LEAD
Lead interessado em: ${leadData.bairros_interesse}
Tipo de interesse: ${leadData.tipo_interesse || 'Não especificado'}
`;
    }

    return {
        contexto_lead: contextoLead,
        imovel_id: leadData.imovel_interesse_id || null,
        imovel_nome: leadData.imovel_interesse_nome || null,
    };
}
