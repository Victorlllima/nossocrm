/**
 * WhatsApp Webhook Handler (MOCK VERSION FOR TESTING)
 *
 * This is a mock version that simulates AI responses without calling OpenAI
 * Used for testing the full workflow when OpenAI quota is exhausted
 *
 * To use: Rename route.ts to route-real.ts and this to route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppAgentPrompt } from '@/lib/ai/whatsapp-prompt';
import { whatsappAgentTools } from '@/lib/ai/whatsapp-tools';
import { prepararContextoLead } from '@/lib/ai/whatsapp-context';
import { getFormattedHistory, saveMessage } from '@/lib/ai/whatsapp-memory';
import { processMultimodalMessage } from '@/lib/ai/whatsapp-multimodal';
import { bufferMessage, markAsProcessing, markAsDone, isAgentActive } from '@/lib/ai/whatsapp-buffer';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * MOCK Response generator - simulates AI without OpenAI calls
 */
function generateMockResponse(userMessage: string, leadName: string): string {
    const query = userMessage.toLowerCase();

    // Detect intent from user message
    if (query.includes('oi') || query.includes('olá') || query.includes('bom dia') || query.includes('boa') || query.includes('noite')) {
        return `Olá ${leadName}! Bem-vindo ao serviço de corretoria do Max. 👋 Como posso te ajudar com a busca de um imóvel hoje?`;
    }

    if (query.includes('2 quarto') || query.includes('3 quarto') || query.includes('quartossai') || query.includes('boa viagem')) {
        return `Ótimo! Encontrei algumas opções para você:\n\n1. Apartamento 3Q em Boa Viagem - R$ 450.000 - 150m²\n2. Apartamento 2Q em Boa Viagem - R$ 380.000 - 120m²\n3. Casa 2Q em Boa Viagem - R$ 520.000 - 200m²\n\nQual desses te interessou?`;
    }

    if (query.includes('falar com') || query.includes('max') || query.includes('humano') || query.includes('atendente')) {
        return `Perfeito! Vou chamar o Max para você. Ele vai responder em breve! 👋`;
    }

    if (query.includes('qual o valor') || query.includes('preço') || query.includes('quanto custa')) {
        return `Os imóveis que mostrei variam de R$ 380.000 a R$ 520.000, dependendo do tamanho e localização. Qual faixa de preço você se encaixa melhor?`;
    }

    if (query.includes('id') || query.match(/^\d+$/)) {
        return `Imóvel #${query} - Ainda não temos os detalhes completos no sistema. Deixa eu chamar o Max para buscar essas informações!`;
    }

    if (query.includes('tudo bem') || query.includes('como vai') || query.includes('blz')) {
        return `Tudo certo! Como posso te ajudar com a busca de um imóvel? 😊`;
    }

    // Default response
    return `Entendi! Você está procurando um imóvel. Pode me detalhar mais: quantos quartos, qual bairro e qual sua faixa de preço? Assim acho as melhores opções para você! 🏠`;
}

/**
 * POST /api/whatsapp/webhook
 *
 * Receives webhook from Evolution API with WhatsApp messages (MOCK)
 */
export async function POST(req: NextRequest) {
    try {
        console.log('📨 [WhatsApp Webhook] Received message');
        const body = await req.json();

        // Extract data from Evolution API webhook
        const messageData = body.data;
        const messageType = messageData?.messageType;
        const fromMe = messageData?.key?.fromMe;
        const remoteJid = messageData?.key?.remoteJid;

        // Ignore messages from self and groups
        if (fromMe || remoteJid?.includes('@g.us')) {
            console.log('⏭️  [Filter] Ignoring self-message or group');
            return NextResponse.json({ status: 'ignored', reason: 'fromMe or group' });
        }

        // Ignore reactions and stickers
        if (messageType === 'reactionMessage' || messageType === 'stickerMessage') {
            console.log('⏭️  [Filter] Ignoring reaction/sticker');
            return NextResponse.json({ status: 'ignored', reason: 'reaction or sticker' });
        }

        // Extract message content
        let userMessage = '';
        if (messageType === 'conversation') {
            userMessage = messageData.message?.conversation || '';
        } else if (messageType === 'extendedTextMessage') {
            userMessage = messageData.message?.extendedTextMessage?.text || '';
        } else {
            // Try multimodal processing (image, PDF, audio)
            const multimodalText = await processMultimodalMessage(messageData);
            if (multimodalText) {
                userMessage = multimodalText;
            }
        }

        if (!userMessage) {
            console.log('⏭️  [Filter] No text content');
            return NextResponse.json({ status: 'ignored', reason: 'no text content' });
        }

        // Clean phone number
        const leadPhone = remoteJid?.split('@')[0] || '';
        const leadName = messageData.pushName || 'visitante';
        const sessionId = `${leadPhone}_memory`;

        console.log(`👤 Lead: ${leadName} (${leadPhone})`);
        console.log(`💬 Message: ${userMessage}`);

        // Check if agent is active
        if (!isAgentActive(leadPhone)) {
            console.log('⏭️  [Buffer] Agent inactive (timeout)');
            return NextResponse.json({ status: 'ignored', reason: 'agent inactive (timeout)' });
        }

        // Buffer management
        const shouldProcess = bufferMessage(leadPhone, userMessage);
        if (!shouldProcess) {
            console.log('⏭️  [Buffer] Message buffered (anti-spam)');
            return NextResponse.json({ status: 'buffered', reason: 'message buffered (anti-spam)' });
        }

        console.log('✅ [Buffer] Processing message');
        markAsProcessing(leadPhone);

        // Get lead context
        const leadContext = await prepararContextoLead(leadPhone);
        console.log('📋 [Context] Lead context retrieved');

        // Get conversation history
        const history = await getFormattedHistory(sessionId);
        console.log(`📜 [Memory] Retrieved ${history.length} messages from history`);

        // Get current time and day
        const now = new Date();
        const currentTime = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Recife'
        });
        const dayOfWeek = now.toLocaleDateString('pt-BR', {
            weekday: 'long',
            timeZone: 'America/Recife'
        });

        // Build system prompt (for reference, but we're using mock)
        const systemPrompt = getWhatsAppAgentPrompt({
            leadContext: leadContext.contexto_lead,
            leadName,
            currentTime,
            dayOfWeek,
        });

        console.log('🤖 [AI] Using MOCK response generator (OpenAI quota exhausted)');

        // Save user message to history
        await saveMessage(sessionId, 'user', userMessage);

        // MOCK: Generate response without calling OpenAI
        const responseText = generateMockResponse(userMessage, leadName);

        console.log(`📝 [Response] Generated: ${responseText.substring(0, 50)}...`);

        // Save assistant response to history
        await saveMessage(sessionId, 'assistant', responseText);

        // Mark as done
        markAsDone(leadPhone);

        console.log('✅ [Success] Message processed');

        return NextResponse.json({
            status: 'success',
            message: 'Message processed (mock)',
            response: responseText,
            leadPhone,
            leadName
        });

    } catch (error) {
        console.error('❌ [Error]', error);
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
