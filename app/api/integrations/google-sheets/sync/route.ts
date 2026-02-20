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

    // Coletar TODOS os google_sheets_id já processados (principal + interests[])
    const existingGoogleSheetsIds = new Set<string>();
    (existingDeals || []).forEach((deal: any) => {
      const customFields = deal.custom_fields;
      if (!customFields) return;

      // Adicionar google_sheets_id principal
      if (customFields.google_sheets_id) {
        existingGoogleSheetsIds.add(customFields.google_sheets_id);
      }

      // Adicionar google_sheets_id de interests[] (leads reincidentes)
      if (Array.isArray(customFields.interests)) {
        customFields.interests.forEach((interest: any) => {
          if (interest.google_sheets_id) {
            existingGoogleSheetsIds.add(interest.google_sheets_id);
          }
        });
      }

      // Adicionar latest_google_sheets_id (backup)
      if (customFields.latest_google_sheets_id) {
        existingGoogleSheetsIds.add(customFields.latest_google_sheets_id);
      }
    });

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
        // Normalizar o número extraído do Google Sheets: remover tudo que não for dígito.
        // O Lead Adelice Coelho chegou com 'p:+554284218951', causando erro na Evolution API.
        const sanitizedPhone = lead.phone_number?.replace(/\D/g, '') || '';
        lead.phone_number = sanitizedPhone;

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

        // 2. Verificar se já existe deal em aberto para este contato
        const { data: existingDeal } = await supabase
          .from('deals')
          .select('id, title, ai_summary, custom_fields')
          .eq('organization_id', organizationId)
          .eq('contact_id', contactId)
          .eq('status', 'open')
          .maybeSingle();

        let dealId: string;
        const newInterestInfo = `🏢 Interesse: ${lead.form_name}\n📅 ${new Date(lead.created_time).toLocaleString('pt-BR')}`;

        if (existingDeal) {
          // LEAD REINCIDENTE: Atualizar deal existente com novo interesse
          const currentInterests = existingDeal.custom_fields?.interests || [];
          const updatedInterests = [
            ...currentInterests,
            {
              form_name: lead.form_name,
              ad_name: lead.ad_name,
              created_time: lead.created_time,
              google_sheets_id: lead.id,
            }
          ];

          const updatedSummary = `${existingDeal.ai_summary}\n\n📍 NOVO INTERESSE:\n${newInterestInfo}`;

          await supabase
            .from('deals')
            .update({
              title: `${lead.full_name} - Múltiplos interesses`,
              ai_summary: updatedSummary,
              updated_at: new Date().toISOString(),
              custom_fields: {
                ...existingDeal.custom_fields,
                interests: updatedInterests,
                latest_interest: lead.form_name,
                latest_google_sheets_id: lead.id,
              },
            })
            .eq('id', existingDeal.id);

          dealId = existingDeal.id;

          // Atualizar contato
          await supabase
            .from('contacts')
            .update({
              name: lead.full_name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contactId);

        } else {
          // LEAD NOVO: Criar deal novo
          const aiSummary = `📱 NOVO LEAD DO FACEBOOK\n\n👤 Cliente: ${lead.full_name}\n${newInterestInfo}\n\n✅ Importado via Planilha`;

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
                interests: [{
                  form_name: lead.form_name,
                  ad_name: lead.ad_name,
                  created_time: lead.created_time,
                  google_sheets_id: lead.id,
                }],
              },
            })
            .select('id')
            .single();

          if (dealError) throw new Error(`Erro ao criar deal: ${dealError.message}`);
          dealId = newDeal.id;
        }

        // 3. Adicionar nota sobre o interesse (novo ou adicional)
        const noteContent = existingDeal
          ? `📍 NOVO INTERESSE REGISTRADO:\n${newInterestInfo}\n\nCliente demonstrou interesse adicional.`
          : `📱 NOVO LEAD DO FACEBOOK\n\n👤 Cliente: ${lead.full_name}\n${newInterestInfo}\n\n✅ Importado via Planilha`;

        await supabase.from('deal_notes').insert({
          deal_id: dealId,
          content: noteContent,
        });

        // 4. Determinar destinatários (HML ou Produção)
        const IS_HML = process.env.HML_MODE === 'true';
        const RED_AUDIT_PHONE = process.env.RED_AUDIT_PHONE || '5561992978796'; // Seu número para conferência
        const MAX_REAL_PHONE = process.env.MAX_PHONE_NUMBER || '5561990445393'; // Novo número do Max

        // Em HML: todas mensagens vão apenas para Red
        // Em Produção: Max + Red recebem notificação, Lead recebe contato inicial
        const targetMaxNumbers = IS_HML ? [RED_AUDIT_PHONE] : [MAX_REAL_PHONE, RED_AUDIT_PHONE].filter(Boolean);
        const targetLeadPhone = IS_HML ? RED_AUDIT_PHONE : lead.phone_number;

        console.log(`[Google Sheets Sync] Notificando Max/Auditoria: ${targetMaxNumbers.join(', ')}`);

        // 5. Notificação Max (SEMPRE envia, seja lead novo ou reincidente)
        const notificationPrefix = existingDeal ? '🔄 INTERESSE ADICIONAL' : '🆕 NOVO LEAD';
        await evolutionClient.sendLeadNotificationToMax({
          nome: lead.full_name,
          telefone: lead.phone_number,
          empreendimento: lead.form_name,
          data: new Date(lead.created_time).toLocaleString('pt-BR'),
          respostas: existingDeal ? `${notificationPrefix} - Cliente demonstrou interesse em mais um imóvel` : 'Importado via Planilha\n🔍 MODO AUDITORIA ATIVO',
        }, targetMaxNumbers as string[]);

        // 6. Contato Lead (SEMPRE envia, seja lead novo ou reincidente)
        // Cliente recebe mensagem sobre o novo imóvel de interesse
        console.log(`[Google Sheets Sync] Enviando contato real/teste para: ${targetLeadPhone}`);
        const contactResponse = await evolutionClient.sendInitialContactToLead({
          nome: lead.full_name,
          telefone: targetLeadPhone!,
          empreendimento: lead.form_name,
        });

        if (contactResponse.success) {
          // Log message to dialogos for N8N context
          const sentMessageContent = `Olá, ${lead.full_name}! 👋\n\nTudo bem? Aqui é o assistente digital do Max Lima, da RE/MAX.\n\nVi que você demonstrou interesse na ${lead.form_name} através do nosso formulário. Muito obrigado pelo contato!\n\nConseguiu analisar as informações, fotos e características do imóvel? \n\nEstou à disposição para esclarecer todas as suas dúvidas! Se quiser, posso ligar para passar maiores informações.`;

          await supabase.from('dialogos').insert({
            session_id: `${targetLeadPhone}_memory`,
            message: {
              type: 'ai',
              content: sentMessageContent,
              additional_kwargs: {},
              response_metadata: {}
            }
          });
        }

        // 7. Cópia do Contato para Red (Auditoria)
        // 7. Cópia do Contato para Red (Auditoria)
        // Se estiver em produção, mandamos uma cópia explicita para auditoria
        if (!IS_HML && RED_AUDIT_PHONE) {
          console.log(`[Google Sheets Sync] Enviando cópia de auditoria para: ${RED_AUDIT_PHONE}`);
          await evolutionClient.sendInitialContactToLead({
            nome: `${lead.full_name} (AUDITORIA)`,
            telefone: RED_AUDIT_PHONE,
            empreendimento: lead.form_name,
          });
        }

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
