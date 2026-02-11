import { NextRequest, NextResponse } from 'next/server';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { getSheetsClient, Lead } from '@/lib/integrations/google-sheets';
import { getEvolutionClient } from '@/lib/integrations/evolution-api';

/**
 * POST /api/integrations/google-sheets/sync
 *
 * Endpoint para sincronizar leads da planilha do Google Sheets para o CRM.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createStaticAdminClient();

    // Buscar a primeira organizaÃ§Ã£o
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .limit(1)
      .single();

    if (profileError || !profiles) {
      return NextResponse.json(
        { error: 'OrganizaÃ§Ã£o nÃ£o encontrada' },
        { status: 404 }
      );
    }

    const organizationId = profiles.organization_id;

    // Buscar board padrÃ£o
    const { data: defaultBoard, error: boardError } = await supabase
      .from('boards')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .single();

    if (boardError || !defaultBoard) {
      console.error('[Google Sheets Sync] Board error:', boardError);
      return NextResponse.json(
        { error: 'Board padrÃ£o nÃ£o encontrado' },
        { status: 404 }
      );
    }

    // Buscar estÃ¡gios do board
    const { data: stages, error: stagesError } = await supabase
      .from('board_stages')
      .select('id, name, order')
      .eq('board_id', defaultBoard.id)
      .order('order', { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      return NextResponse.json(
        { error: 'Board padrÃ£o nÃ£o tem estÃ¡gios configurados.' },
        { status: 404 }
      );
    }

    const firstStageId = stages[0].id;

    // Ler leads da planilha
    const sheetsClient = getSheetsClient();
    const leads = await sheetsClient.getLeads();

    console.log(`[Google Sheets Sync] Encontrados ${leads.length} leads na planilha`);

    // Buscar deals existentes para detectar duplicatas por google_sheets_id
    const { data: existingDeals, error: dealsError } = await supabase
      .from('deals')
      .select('custom_fields')
      .eq('organization_id', organizationId);

    if (dealsError) {
      return NextResponse.json({ error: 'Erro ao verificar duplicatas' }, { status: 500 });
    }

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

    const evolutionClient = getEvolutionClient();

    // Configurações de Telefone para HML e Produção
    const RED_TEST_PHONE = '5561992978796'; // Seu número para conferência
    const MAX_REAL_PHONE = '5561990445393'; // Novo número do Max
    const IS_HML = process.env.HML_MODE === 'true';

    for (const lead of newLeads) {
      try {
        // 1. Criar ou buscar contato
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('phone', lead.phone_number)
          .maybeSingle();

        let contactId: string;

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              organization_id: organizationId,
              name: lead.full_name,
              phone: lead.phone_number,
              status: 'ACTIVE',
              stage: 'LEAD',
              source: 'facebook_ads',
              notes: `Lead importado do Google Sheets.\nFormulário: ${lead.form_name}`,
            })
            .select('id')
            .single();

          if (contactError || !newContact) throw new Error(`Erro ao criar contato: ${contactError?.message}`);
          contactId = newContact.id;
        }

        // 2. Formatar Resumo AI
        const aiSummary = `📱 NOVO LEAD DO FACEBOOK\n\n👤 Cliente: ${lead.full_name}\n🏢 Interesse: ${lead.form_name}\n📅 Chegada: ${new Date(lead.created_time).toLocaleString('pt-BR')}\n\n✅ Importado via Planilha`;

        // 3. Criar deal
        const { data: newDeal, error: dealError } = await supabase
          .from('deals')
          .insert({
            organization_id: organizationId,
            board_id: defaultBoard.id,
            stage_id: firstStageId,
            contact_id: contactId,
            title: `${lead.full_name} - ${lead.form_name}`,
            status: 'open',
            priority: 'medium',
            ai_summary: aiSummary,
            custom_fields: {
              google_sheets_id: lead.id,
              ad_name: lead.ad_name,
              form_name: lead.form_name,
              created_time: lead.created_time,
              form_responses: aiSummary,
            },
          })
          .select('id')
          .single();

        if (dealError) throw new Error(`Erro ao criar deal: ${dealError.message}`);

        // 4. Nota
        await supabase.from('deal_notes').insert({
          deal_id: newDeal.id,
          content: aiSummary,
        });

        // 5. Notificação Max (Interceptada se HML)
        const targetMaxNumbers = IS_HML ? [RED_TEST_PHONE] : [MAX_REAL_PHONE];

        console.log(`[Google Sheets Sync] Notificando Max em: ${targetMaxNumbers.join(', ')} (HML: ${IS_HML})`);

        await evolutionClient.sendLeadNotificationToMax({
          nome: lead.full_name,
          telefone: lead.phone_number,
          empreendimento: lead.form_name,
          data: new Date(lead.created_time).toLocaleString('pt-BR'),
          respostas: `Importado via Planilha\n${IS_HML ? '🧪 MODO CONFERÊNCIA RED' : ''}`,
        }, targetMaxNumbers);

        // 6. Contato Lead (Interceptado se HML)
        const targetLeadPhone = IS_HML ? RED_TEST_PHONE : lead.phone_number;

        console.log(`[Google Sheets Sync] Enviando contato para Lead em: ${targetLeadPhone} (Original: ${lead.phone_number})`);

        await evolutionClient.sendInitialContactToLead({
          nome: lead.full_name,
          telefone: targetLeadPhone,
          empreendimento: lead.form_name,
        });

        results.imported++;
      } catch (error) {
        const errorMsg = `Erro no lead ${lead.full_name}: ${error instanceof Error ? error.message : 'Erro'}`;
        console.error(`[Google Sheets Sync] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[Google Sheets Sync] Erro geral:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar', details: (error as any).message }, { status: 500 });
  }
}
