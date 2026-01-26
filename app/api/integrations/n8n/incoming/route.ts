import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { n8nIncomingSchema } from '@/lib/validations/n8n-incoming';

// Inicializa o cliente Supabase com a Service Role Key para bypass de RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// API Key para autenticação do webhook n8n
const WEBHOOK_API_KEY = process.env.N8N_INCOMING_WEBHOOK_KEY;

export async function POST(req: Request) {
    try {
        // =====================================================
        // 0. VALIDAÇÃO DE API KEY (Segurança)
        // =====================================================
        const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');

        if (!WEBHOOK_API_KEY) {
            console.warn('[n8n-webhook] ⚠️ N8N_INCOMING_WEBHOOK_KEY não configurada - acesso liberado temporariamente');
        } else if (apiKey !== WEBHOOK_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized: API Key inválida ou ausente' },
                { status: 401 }
            );
        }

        const body = await req.json();

        // =====================================================
        // 1. VALIDAÇÃO COM ZOD (Sanitização)
        // =====================================================
        const parseResult = n8nIncomingSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: 'Dados inválidos',
                    details: parseResult.error.flatten().fieldErrors
                },
                { status: 400 }
            );
        }

        const { phone, name, organization_id } = parseResult.data;

        // =====================================================
        // 2. LÓGICA DE CONTATO - Busca ou Cria
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
        // 2. LÓGICA DE PIPELINE - Busca Board e Estágio
        // =====================================================

        // Busca o primeiro board da organização
        const { data: board } = await supabase
            .from('boards')
            .select('id')
            .eq('organization_id', organization_id)
            .limit(1)
            .single();

        if (!board) {
            throw new Error('Organização sem Pipeline configurado.');
        }

        // Tenta encontrar um estágio com "Novo" no nome
        const { data: targetStage } = await supabase
            .from('board_stages')
            .select('id')
            .eq('board_id', board.id)
            .ilike('name', '%Novo%')
            .limit(1)
            .maybeSingle();

        let stageId = targetStage?.id;

        // Fallback: pega o primeiro estágio ordenado por posição
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
        // 3. LÓGICA DE DEAL - Cria novo Deal
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
