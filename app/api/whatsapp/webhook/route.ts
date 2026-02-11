/**
 * WhatsApp Webhook Handler - OPENAI RECOVERY VERSION
 * 
 * Migrated from Anthropic back to OpenAI with robust error handling
 * and rate-limit protection (Exponential Backoff).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { getWhatsAppAgentPrompt } from '@/lib/ai/whatsapp-prompt';
import { whatsappAgentTools } from '@/lib/ai/whatsapp-tools';
import { prepararContextoLead } from '@/lib/ai/whatsapp-context';
import { getFormattedHistory, saveMessage } from '@/lib/ai/whatsapp-memory';
import { formatAndSendResponse } from '@/lib/ai/whatsapp-sender';
import { markAsProcessing, markAsDone, isProcessing } from '@/lib/ai/whatsapp-locking';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Global counter for rate limiting monitoring
let requestCount = 0;
setInterval(() => {
    if (requestCount > 0) console.log(`📊 [Rate Limit] ${requestCount} requests processed in the last minute`);
    requestCount = 0;
}, 60000);

/**
 * Retentativa com espera exponencial (Backoff)
 * Se a OpenAI der erro de Rate Limit (429), esperamos e tentamos de novo.
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 2000
): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isRateLimit = error?.status === 429 ||
                error?.message?.includes('quota') ||
                error?.message?.includes('rate_limit');

            if (!isRateLimit || attempt === maxAttempts) throw error;

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`⚠️ [Retry] OpenAI congestionada. Aguardando ${delay}ms... (Tentativa ${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * Cadeia de modelos para resiliência (Baseado no Guia de Melhores Práticas)
 */
const modelChain = [
    { model: openai('gpt-4o-mini'), name: 'OpenAI (Primary)' },
    { model: anthropic('claude-3-5-sonnet-20241022'), name: 'Anthropic (Fallback)' },
];

/**
 * Geração robusta com fallback entre provedores
 */
async function robustGenerateWithFallback(params: {
    system: string;
    messages: any[];
    tools: any;
    requestId: string;
}): Promise<{ text: string; provider: string }> {
    const { system, messages, tools, requestId } = params;

    for (const { model, name } of modelChain) {
        try {
            console.log(`🤖 [${requestId}] Chamando ${name}...`);
            const result = await retryWithBackoff(
                () => generateText({
                    model,
                    temperature: 0.3,
                    system,
                    messages,
                    tools,
                    maxToolRoundtrips: 5,
                    maxRetries: 2,
                }),
                2,
                2000
            );
            return { text: result.text, provider: name };
        } catch (error: any) {
            console.warn(`⚠️ [${requestId}] ${name} falhou: ${error.message}`);
        }
    }
    throw new Error('Todos os modelos de IA falharam (OpenAI/Anthropic).');
}

/**
 * Validação e Truncamento de resposta
 */
function validateAndTruncateResponse(text: string, maxChars = 500): string {
    if (!text) return '';
    let result = text.trim();
    if (result.length > maxChars) {
        const truncated = result.substring(0, maxChars);
        const lastPeriod = truncated.lastIndexOf('.');
        if (lastPeriod > maxChars * 0.8) result = truncated.substring(0, lastPeriod + 1);
        else result = truncated + '...';
    }
    return result;
}

export async function POST(req: NextRequest) {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    try {
        requestCount++;
        const body = await req.json();

        // 🛡️ FILTRO DE SEGURANÇA: Só processamos mensagens recebidas (MESSAGES_UPSERT)
        // Isso evita responder a notificações de status, leitura, etc.
        if (body.event !== 'messages.upsert') {
            return NextResponse.json({ status: 'ignored', reason: 'Not a new message event' });
        }

        const messageData = body.data;
        const leadPhone = messageData.key.remoteJid.split('@')[0];
        const leadName = messageData.pushName || 'Lead';
        const userMessage = messageData.message?.conversation ||
            messageData.message?.extendedTextMessage?.text;

        if (!userMessage || messageData.key.fromMe) {
            return NextResponse.json({ status: 'ignored', reason: 'Empty or outgoing message' });
        }

        // 🛡️ TRAVA DE DUPLICIDADE: Evita processar a mesma mensagem duas vezes
        if (isProcessing(leadPhone)) {
            console.log(`⏳ [${requestId}] Ignorando: Já existe um processamento ativo para ${leadPhone}`);
            return NextResponse.json({ status: 'pending', message: 'Already processing this lead' });
        }

        markAsProcessing(leadPhone);
        console.log(`📨 [${requestId}] Nova mensagem de ${leadName} (${leadPhone}): "${userMessage.substring(0, 40)}..."`);

        // 1. Contexto e Memória
        const leadContext = await prepararContextoLead(leadPhone);
        const sessionId = `whatsapp-${leadPhone}`;
        const history = await getFormattedHistory(sessionId);

        const systemPrompt = getWhatsAppAgentPrompt({
            leadName,
            leadPhone,
            imovelContext: leadContext.imovel_nome,
            detalhesImovel: leadContext.contexto_markdown
        });

        // Salva mensagem do usuário
        await saveMessage(sessionId, 'user', userMessage);

        // 2. Chamada Robusta com Fallback (Best Practice)
        const { text: rawResponse, provider } = await robustGenerateWithFallback({
            system: systemPrompt,
            messages: convertToCoreMessages([
                ...history,
                { role: 'user', content: userMessage },
            ]),
            tools: whatsappAgentTools,
            requestId
        });

        const responseText = validateAndTruncateResponse(rawResponse);
        console.log(`✅ [${requestId}] Resposta (${provider}): "${responseText.substring(0, 40)}..."`);

        // 3. Persistência e Envio
        await saveMessage(sessionId, 'assistant', responseText);
        const sendResult = await formatAndSendResponse(leadPhone, responseText);

        if (!sendResult) {
            console.warn(`⚠️ [${requestId}] Falha ao enviar via Evolution API`);
        }

        markAsDone(leadPhone);

        return NextResponse.json({
            status: 'success',
            requestId,
            provider,
            responseLength: responseText.length
        });

    } catch (error: any) {
        console.error(`❌ [${requestId}] Erro Crítico:`, error.message);

        // Se der erro, precisamos liberar a trava para o usuário poder tentar de novo
        const body = await req.json().catch(() => ({}));
        const leadPhone = body?.data?.key?.remoteJid?.split('@')[0];
        if (leadPhone) markAsDone(leadPhone);

        return NextResponse.json(
            { status: 'error', message: error.message },
            { status: 500 }
        );
    }
}
