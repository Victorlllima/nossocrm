/**
 * WhatsApp Webhook Handler
 * Migrated from N8n workflow: Agente_Max_Corretor
 * 
 * This API route receives messages from Evolution API and processes them
 * using Vercel AI SDK instead of N8n/LangChain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getWhatsAppAgentPrompt } from '@/lib/ai/whatsapp-prompt';
import { whatsappAgentTools } from '@/lib/ai/whatsapp-tools';
import { prepararContextoLead } from '@/lib/ai/whatsapp-context';
import { getFormattedHistory, saveMessage } from '@/lib/ai/whatsapp-memory';
import { processMultimodalMessage } from '@/lib/ai/whatsapp-multimodal';
import { bufferMessage, markAsProcessing, markAsDone, isAgentActive } from '@/lib/ai/whatsapp-buffer';
import { formatAndSendResponse } from '@/lib/ai/whatsapp-sender';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/whatsapp/webhook
 * 
 * Receives webhook from Evolution API with WhatsApp messages
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Extract data from Evolution API webhook
        const messageData = body.data;
        const messageType = messageData?.messageType;
        const fromMe = messageData?.key?.fromMe;
        const remoteJid = messageData?.key?.remoteJid;

        // Ignore messages from self and groups
        if (fromMe || remoteJid?.includes('@g.us')) {
            return NextResponse.json({ status: 'ignored', reason: 'fromMe or group' });
        }

        // Ignore reactions and stickers
        if (messageType === 'reactionMessage' || messageType === 'stickerMessage') {
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
            return NextResponse.json({ status: 'ignored', reason: 'no text content' });
        }

        // Clean phone number (remove @s.whatsapp.net or @lid)
        const leadPhone = remoteJid?.split('@')[0] || '';
        const leadName = messageData.pushName || 'visitante';
        const sessionId = `${leadPhone}_memory`;

        // Check if agent is active for this conversation
        if (!isAgentActive(leadPhone)) {
            return NextResponse.json({ status: 'ignored', reason: 'agent inactive (timeout)' });
        }

        // Buffer management - prevent message flooding
        const shouldProcess = bufferMessage(leadPhone, userMessage);
        if (!shouldProcess) {
            return NextResponse.json({ status: 'buffered', reason: 'message buffered (anti-spam)' });
        }

        // Mark as processing
        markAsProcessing(leadPhone);

        // Get lead context
        const leadContext = await prepararContextoLead(leadPhone);

        // Get conversation history
        const history = await getFormattedHistory(sessionId);

        // Get current time and day (for greetings)
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

        // Build system prompt
        const systemPrompt = getWhatsAppAgentPrompt({
            leadContext: leadContext.contexto_lead,
            leadName,
            currentTime,
            dayOfWeek,
        });

        // Save user message to history
        await saveMessage(sessionId, 'user', userMessage);

        // Call AI agent - using AI SDK v3 Safe Mode with generateText for automatic tool loops
        const { text: responseText } = await generateText({
            model: openai('gpt-4o-mini') as any,
            temperature: 0.2,
            system: systemPrompt,
            messages: convertToCoreMessages([
                ...history,
                { role: 'user', content: userMessage },
            ]),
            tools: whatsappAgentTools,
            maxToolRoundtrips: 5, // Equivalent to maxSteps in v3
        });

        // Save assistant response to history
        await saveMessage(sessionId, 'assistant', responseText);

        // Send response via Evolution API (with message splitting and delays)
        const sendSuccess = await formatAndSendResponse(leadPhone, responseText);

        // Mark as done processing
        markAsDone(leadPhone);

        return NextResponse.json({
            status: 'success',
            sessionId,
            sent: sendSuccess,
            messageLength: responseText.length,
            debug: {
                leadPhone,
                leadName,
                leadContext: leadContext.imovel_nome,
                historyLength: history.length,
            },
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
