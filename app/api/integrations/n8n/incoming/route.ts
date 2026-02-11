import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { n8nIncomingSchema } from '@/lib/validations/n8n-incoming';

export const dynamic = 'force-dynamic';

// API Key para autenticaÃ§Ã£o do webhook n8n
const WEBHOOK_API_KEY = process.env.N8N_INCOMING_WEBHOOK_KEY;

export async function POST(req: Request) {
    // Inicializa o cliente Supabase com a Service Role Key para bypass de RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
            { error: 'ConfiguraÃ§Ã£o do servidor incompleta: chaves do Supabase ausentes' },
            { status: 500 }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // =====================================================
        // 0. VALIDAÃ‡ÃƒO DE API KEY (SeguranÃ§a)
        // =====================================================
        const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');

        if (!WEBHOOK_API_KEY) {
            console.warn('[n8n-webhook] âš ï¸ N8N_INCOMING_WEBHOOK_KEY nÃ£o configurada - acesso liberado temporariamente');
        } else if (apiKey !== WEBHOOK_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized: API Key invÃ¡lida ou ausente' },
                { status: 401 }
            );
        }

        const body = await req.json();

        // =====================================================
        // 1. VALIDAÃ‡ÃƒO COM ZOD (SanitizaÃ§Ã£o)
        // =====================================================
        const parseResult = n8nIncomingSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: 'Dados invÃ¡lidos',
                    details: parseResult.error.flatten().fieldErrors
                },
                { status: 400 }
            );
        }

        const { phone, name, organization_id } = parseResult.data;

        // =====================================================
        // 2. LÃ“GICA DE CONTATO - Busca ou Cria
        // =====================================================
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('whatsapp_phone', phone)
            .eq('organization_id', organization_id)
            .single();

        let contactId = existingContact?.id;

        if (!contactId) {
            const { data: newContact, error: createError } = await supabase
                .from('contacts')
                .insert({
                    organization_id,
                    name: name || `WhatsApp ${phone}`,
                    whatsapp_phone: phone,
                    phone: phone,
                    source: 'whatsapp_n8n'
                })
                .select()
                .single();

            if (createError) {
                throw new Error(`Erro ao criar contato: ${createError.message}`);
            }
            contactId = newContact.id;
        }

        // =====================================================
        // 2. LÃ“GICA DE PIPELINE - Busca Board e EstÃ¡gio
        // =====================================================

        // Busca o primeiro board da organizaÃ§Ã£o
        const { data: board } = await supabase
            .from('boards')
            .select('id')
            .eq('organization_id', organization_id)
            .limit(1)
            .single();

        if (!board) {
            throw new Error('OrganizaÃ§Ã£o sem Pipeline configurado.');
        }

        // Tenta encontrar um estÃ¡gio com "Novo" no nome
        const { data: targetStage } = await supabase
            .from('board_stages')
            .select('id')
            .eq('board_id', board.id)
            .ilike('name', '%Novo%')
            .limit(1)
            .maybeSingle();

        let stageId = targetStage?.id;

        // Fallback: pega o primeiro estÃ¡gio ordenado por posiÃ§Ã£o
        if (!stageId) {
            const { data: firstStage } = await supabase
                .from('board_stages')
                .select('id')
                .eq('board_id', board.id)
                .order('position', { ascending: true })
                .limit(1)
                .single();

            stageId = firstStage?.id;
        }

        if (!stageId) {
            throw new Error('Nenhuma coluna encontrada para o Lead.');
        }

        // =====================================================
        // 3. LÃ“GICA DE DEAL - Cria novo Deal
        // =====================================================
        const { error: dealError } = await supabase
            .from('deals')
            .insert({
                organization_id,
                contact_id: contactId,
                board_id: board.id,
                stage_id: stageId,
                title: name ? `Oportunidade: ${name}` : `Lead ${phone}`,
                status: 'open'
            });

        if (dealError) {
            throw new Error(`Erro ao criar Deal: ${dealError.message}`);
        }

        // =====================================================
        // 4. RETORNO DE SUCESSO
        // =====================================================
        return NextResponse.json({
            success: true,
            message: 'Contato e Deal criados com sucesso',
            data: {
                contact_id: contactId,
                board_id: board.id,
                stage_id: stageId
            }
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro N8N Webhook:', errorMessage);

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
