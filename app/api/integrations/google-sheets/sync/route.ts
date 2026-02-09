import { NextRequest, NextResponse } from 'next/server';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { getSheetsClient, Lead } from '@/lib/integrations/google-sheets';
import { getEvolutionClient } from '@/lib/integrations/evolution-api';

/**
 * POST /api/integrations/google-sheets/sync
 *
 * Endpoint para sincronizar leads da planilha do Google Sheets para o CRM.
 *
 * Fluxo:
 * 1. Lê todos os leads da planilha
 * 2. Verifica quais já existem no CRM (usando custom_fields.google_sheets_id)
 * 3. Para cada lead novo:
 *    a. Cria um contato
 *    b. Cria um deal no primeiro estágio do board padrão
 *    c. Envia mensagem WhatsApp para Max (notificação)
 *    d. Envia mensagem WhatsApp para o Lead (contato inicial)
 *
 * @returns JSON com estatísticas da sincronização
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createStaticAdminClient();

    // Buscar a primeira organização (em produção, isso deveria vir de autenticação)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .limit(1)
      .single();

    if (profileError || !profiles) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    const organizationId = profiles.organization_id;

    // Buscar board padrão
    const { data: defaultBoard, error: boardError } = await supabase
      .from('boards')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .single();

    if (boardError || !defaultBoard) {
      console.error('[Google Sheets Sync] Board error:', boardError);
      return NextResponse.json(
        { error: 'Board padrão não encontrado. Configure um board como padrão.' },
        { status: 404 }
      );
    }

    // Buscar estágios do board
    const { data: stages, error: stagesError } = await supabase
      .from('board_stages')
      .select('id, name, order')
      .eq('board_id', defaultBoard.id)
      .order('order', { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      console.error('[Google Sheets Sync] Stages error:', stagesError);
      return NextResponse.json(
        { error: 'Board padrão não tem estágios configurados.' },
        { status: 404 }
      );
    }

    const firstStageId = stages[0].id;

    // Ler leads da planilha do Google Sheets
    const sheetsClient = getSheetsClient();
    const leads = await sheetsClient.getLeads();

    console.log(`[Google Sheets Sync] Encontrados ${leads.length} leads na planilha`);

    // Buscar deals existentes com google_sheets_id para detectar duplicatas
    const { data: existingDeals, error: dealsError } = await supabase
      .from('deals')
      .select('custom_fields')
      .eq('organization_id', organizationId);

    if (dealsError) {
      console.error('[Google Sheets Sync] Erro ao buscar deals existentes:', dealsError);
      return NextResponse.json(
        { error: 'Erro ao verificar duplicatas' },
        { status: 500 }
      );
    }

    // Criar set com IDs de leads já importados
    const existingGoogleSheetsIds = new Set(
      (existingDeals || [])
        .map((deal: any) => deal.custom_fields?.google_sheets_id)
        .filter(Boolean)
    );

    // Filtrar apenas leads novos
    const newLeads = leads.filter(lead => !existingGoogleSheetsIds.has(lead.id));

    console.log(`[Google Sheets Sync] ${newLeads.length} leads novos para importar`);

    const results = {
      total: leads.length,
      new: newLeads.length,
      skipped: leads.length - newLeads.length,
      imported: 0,
      errors: [] as string[],
    };

    // Processar cada lead novo
    const evolutionClient = getEvolutionClient();

    for (const lead of newLeads) {
      try {
        // 1. Criar ou buscar contato
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('phone', lead.phone_number)
          .single();

        let contactId: string;

        if (existingContact) {
          contactId = existingContact.id;
          console.log(`[Google Sheets Sync] Contato existente: ${lead.full_name}`);
        } else {
          // Criar novo contato
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              organization_id: organizationId,
              name: lead.full_name,
              phone: lead.phone_number,
              email: null,
              status: 'ACTIVE',
              stage: 'LEAD',
              source: 'facebook_ads',
              notes: `Lead importado automaticamente do Google Sheets.\nFormulário: ${lead.form_name}\nAnúncio: ${lead.ad_name}`,
            })
            .select('id')
            .single();

          if (contactError || !newContact) {
            throw new Error(`Erro ao criar contato: ${contactError?.message}`);
          }

          contactId = newContact.id;
          console.log(`[Google Sheets Sync] Novo contato criado: ${lead.full_name}`);
        }

        // 2. Montar respostas do formulário de forma amigável
        // Separar campos técnicos dos campos de resposta do cliente
        const technicalFields: Record<string, string> = {};
        const clientResponses: Record<string, string> = {};

        const technicalFieldKeys = ['adset_id', 'adset_name', 'campaign_id', 'campaign_name', 'is_organic', 'platform'];
        const standardFieldKeys = ['id', 'created_time', 'ad_id', 'ad_name', 'form_id', 'form_name', 'full_name', 'phone_number', 'lead_status'];

        for (const [key, value] of Object.entries(lead)) {
          if (standardFieldKeys.includes(key) || !value || value === '') {
            continue;
          }

          if (technicalFieldKeys.includes(key)) {
            technicalFields[key] = value;
          } else {
            clientResponses[key] = value;
          }
        }

        // Formatar origem do lead
        let origemSection = '📍 ORIGEM DO LEAD\n';
        origemSection += `• Veio do anúncio: "${lead.ad_name}"\n`;
        if (technicalFields.campaign_name) {
          origemSection += `• Campanha: ${technicalFields.campaign_name}\n`;
        }
        if (technicalFields.adset_name) {
          origemSection += `• Público: ${technicalFields.adset_name}\n`;
        }
        if (technicalFields.is_organic) {
          const tipo = technicalFields.is_organic.toLowerCase() === 'true' ? 'Orgânico (gratuito)' : 'Anúncio pago (Facebook Ads)';
          origemSection += `• Tipo: ${tipo}\n`;
        }

        // Formatar respostas do cliente
        let clientSection = '';
        if (Object.keys(clientResponses).length > 0) {
          clientSection = '\n💬 O QUE O CLIENTE DISSE:\n\n';
          for (const [question, answer] of Object.entries(clientResponses)) {
            // Formatar pergunta (remover underscores, capitalizar)
            const formattedQuestion = question.replace(/_/g, ' ');
            clientSection += `${formattedQuestion}:\n"${answer}"\n\n`;
          }
        }

        // 3. Criar deal
        const dealTitle = `${lead.full_name} - ${lead.form_name}`;

        // Montar resumo amigável para exibir na aba Resumo
        const aiSummary = `📱 NOVO LEAD DO FACEBOOK

👤 Cliente: ${lead.full_name}
🏢 Interesse: ${lead.form_name}
📅 Quando chegou: ${new Date(lead.created_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}

${origemSection}${clientSection}
---
✅ Lead importado automaticamente da planilha`;

        const { data: newDeal, error: dealError } = await supabase
          .from('deals')
          .insert({
            organization_id: organizationId,
            board_id: defaultBoard.id,
            stage_id: firstStageId,
            contact_id: contactId,
            title: dealTitle,
            value: 0,
            probability: 0,
            priority: 'medium',
            status: firstStageId,
            tags: ['google-sheets-import', 'facebook-ads'],
            ai_summary: aiSummary,
            custom_fields: {
              google_sheets_id: lead.id,
              ad_name: lead.ad_name,
              form_name: lead.form_name,
              created_time: lead.created_time,
              form_responses: aiSummary,
            },
            is_won: false,
            is_lost: false,
          })
          .select('id')
          .single();

        if (dealError || !newDeal) {
          throw new Error(`Erro ao criar deal: ${dealError?.message}`);
        }

        console.log(`[Google Sheets Sync] Deal criado: ${dealTitle}`);

        // 4. Criar nota no deal com respostas do formulário
        const { error: noteError } = await supabase
          .from('deal_notes')
          .insert({
            deal_id: newDeal.id,
            content: aiSummary,
            created_by: null, // Sistema
          });

        if (noteError) {
          console.error(`[Google Sheets Sync] Erro ao criar nota:`, noteError);
        }

        // 5. Enviar mensagem para Max (notificação)
        const formattedDate = new Date(lead.created_time).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });

        // Formatar respostas para WhatsApp (versão simplificada)
        let whatsappResponses = '';
        if (Object.keys(clientResponses).length > 0) {
          for (const [question, answer] of Object.entries(clientResponses)) {
            const formattedQuestion = question.replace(/_/g, ' ');
            whatsappResponses += `• ${formattedQuestion}: ${answer}\n`;
          }
        } else {
          whatsappResponses = 'Sem respostas adicionais';
        }

        // Definir números de destino (Max e equipe)
        const maxNumbers = [
          process.env.MAX_PHONE_NUMBER,
          process.env.MAX_PHONE_NUMBER_2
        ].filter(Boolean) as string[];

        const maxResult = await evolutionClient.sendLeadNotificationToMax({
          nome: lead.full_name,
          telefone: lead.phone_number,
          empreendimento: lead.form_name,
          data: formattedDate,
          respostas: whatsappResponses,
        }, maxNumbers);

        if (!maxResult.success) {
          console.error(`[Google Sheets Sync] Erro ao enviar WhatsApp para Max:`, maxResult.error);
        }

        // Delay de 2 minutos antes de enviar para o lead
        await new Promise(resolve => setTimeout(resolve, 120000));

        // 6. Enviar mensagem para o Lead (primeiro contato)
        const leadResult = await evolutionClient.sendInitialContactToLead({
          nome: lead.full_name,
          telefone: lead.phone_number,
          empreendimento: lead.form_name,
        });

        if (!leadResult.success) {
          console.error(`[Google Sheets Sync] Erro ao enviar WhatsApp para Lead:`, leadResult.error);
        }

        results.imported++;
      } catch (error) {
        const errorMsg = `Erro ao processar lead ${lead.full_name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        console.error(`[Google Sheets Sync] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log(`[Google Sheets Sync] Sincronização concluída:`, results);

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída',
      results,
    });
  } catch (error) {
    console.error('[Google Sheets Sync] Erro geral:', error);
    return NextResponse.json(
      {
        error: 'Erro ao sincronizar leads',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
