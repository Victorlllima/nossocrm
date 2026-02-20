/**
 * WhatsApp Webhook Handler - ANTHROPIC VERSION (NO TOOLS - TESTING CONNECTIVITY)
 *
 * Uses Anthropic Claude without tools to validate token and connectivity
 * This is a testing version to confirm Anthropic API works
 * Once confirmed, we'll integrate tools properly
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, convertToCoreMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getWhatsAppAgentPrompt } from '@/lib/ai/whatsapp-prompt';
import { prepararContextoLead } from '@/lib/ai/whatsapp-context';
import { getFormattedHistory, saveMessage } from '@/lib/ai/whatsapp-memory';
import { processMultimodalMessage } from '@/lib/ai/whatsapp-multimodal';
import { bufferMessage, markAsProcessing, markAsDone, isAgentActive } from '@/lib/ai/whatsapp-buffer';
import { formatAndSendResponse } from '@/lib/ai/whatsapp-sender';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Global counter for rate limiting
let requestCount = 0;
let lastResetTime = Date.now();

// Reset counter every minute
setInterval(() => {
    console.log(`📊 [Rate Limit] Requests in last minute: ${requestCount}`);
    requestCount = 0;
    lastResetTime = Date.now();
}, 60000);

// Exponential backoff retry
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isQuotaError = error?.message?.includes('quota') ||
                                 error?.message?.includes('rate') ||
                                 error?.message?.includes('overloaded');

            if (!isQuotaError || attempt === maxAttempts) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`⚠️  [Retry] Service error, waiting ${delay}ms before retry ${attempt}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * POST /api/whatsapp/webhook
 *
 * Receives webhook from Evolution API with WhatsApp messages
 * ANTHROPIC VERSION (NO TOOLS): Testing token connectivity
 */
export async function POST(req: NextRequest) {
    try {
        // Track request count for rate limiting monitoring
        requestCount++;
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log(`📨 [${requestId}] Request #${requestCount} in current minute (ANTHROPIC - NO TOOLS)`);

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

        console.log(`[${requestId}] Processing: ${leadName} (${leadPhone}) -> "${userMessage.substring(0, 30)}..."`);

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

        console.log(`[${requestId}] Calling Anthropic (model: claude-3-5-sonnet, NO TOOLS - testing connectivity)`);

        // Call AI agent WITHOUT tools first (testing connectivity)
        const { text: responseText } = await retryWithBackoff(
            () => generateText({
                model: anthropic('claude-opus-4-1') as any,
                temperature: 1.0,  // Claude default
                system: systemPrompt,
                messages: convertToCoreMessages([
                    ...history,
                    { role: 'user', content: userMessage },
                ]),
                // NO TOOLS - just testing connectivity
            }),
            3,      // max attempts
            2000    // base delay 2s (will backoff to 4s, 8s)
        );

        console.log(`[${requestId}] ✅ Response generated (${responseText.length} chars)`);

        // Save assistant response to history
        await saveMessage(sessionId, 'assistant', responseText);

        // Send response via Evolution API
        const sendResult = await formatAndSendResponse(leadPhone, responseText);
        if (!sendResult) {
            console.warn(`⚠️  [${requestId}] Message sent to HTTP but Evolution API failed`);
        }

        // Mark as done
        markAsDone(leadPhone);

        return NextResponse.json({
            status: 'success',
            requestId,
            message: 'Message processed successfully',
            response: responseText,
            leadPhone,
            leadName,
            provider: 'anthropic',
            version: 'no-tools-test'
        });

    } catch (error) {
        console.error('❌ [Error]', error);

        // Log specific error types
        if (error instanceof Error) {
            if (error.message.includes('quota')) {
                console.error('🚨 QUOTA ERROR - Anthropic account may have rate limit');
            }
            if (error.message.includes('rate')) {
                console.error('🚨 RATE LIMIT - Implementing exponential backoff');
            }
            if (error.message.includes('overloaded')) {
                console.error('⚠️  SERVICE OVERLOADED - Retrying with backoff');
            }
            if (error.message.includes('401') || error.message.includes('authentication')) {
                console.error('🔐 AUTHENTICATION ERROR - Check ANTHROPIC_API_KEY in .env.local');
            }
            if (error.message.includes('input_schema')) {
                console.error('⚠️  SCHEMA ERROR - Tools format issue (expected without tools)');
            }
        }

        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                provider: 'anthropic',
                version: 'no-tools-test'
            },
            { status: 500 }
        );
    }
}
