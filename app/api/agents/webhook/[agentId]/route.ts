/**
 * Multi-Agent Webhook Handler
 *
 * Recebe mensagens da Evolution API e processa com agente dinâmico
 * Suporta múltiplos agentes por organização
 * Isolamento de tenant garantido
 *
 * Flow:
 * 1. Recebe POST da Evolution
 * 2. Valida agente + organização
 * 3. Aplica accumulator (buffer X segundos)
 * 4. Carrega config dinâmica
 * 5. Monta histórico da conversa
 * 6. Chama IA (OpenAI + Anthropic fallback)
 * 7. Persiste conversa
 * 8. Envia resposta via Evolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

import {
  loadAgentConfig,
  addMessageToAccumulator,
  clearAccumulator,
  getOrCreateConversation,
  getFormattedConversationHistory,
  addMessageToConversation,
  incrementInteractionCount,
  buildSystemPrompt,
  formatResponse,
} from '@/lib/ai/agents';

import { formatAndSendResponse } from '@/lib/ai/whatsapp-sender';
import { createStaticAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ============================================================================
// TIPOS
// ============================================================================

interface EvolutionMessage {
  event: string;
  data: {
    messageType: string;
    key: {
      remoteJid: string;
      fromMe: boolean;
    };
    message: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    pushName: string;
  };
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes('quota') ||
        error?.message?.includes('rate_limit');

      if (!isRateLimit || attempt === maxAttempts) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ [Retry] Rate limit. Aguardando ${delay}ms... (Tentativa ${attempt}/${maxAttempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================================
// MODEL FALLBACK CHAIN
// ============================================================================

const modelChain = [
  { model: openai('gpt-4o-mini'), name: 'OpenAI (Primary)' },
  { model: anthropic('claude-3-5-sonnet-20241022'), name: 'Anthropic (Fallback)' },
];

async function robustGenerateWithFallback(params: {
  system: string;
  messages: any[];
  temperature: number;
  maxTokens: number;
  requestId: string;
}): Promise<{ text: string; provider: string }> {
  const { system, messages, temperature, maxTokens, requestId } = params;

  for (const { model, name } of modelChain) {
    try {
      console.log(`🤖 [${requestId}] Chamando ${name}...`);
      const result = await retryWithBackoff(
        () =>
          generateText({
            model,
            temperature,
            system,
            messages,
            maxTokens,
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

// ============================================================================
// VALIDAÇÃO E PARSING
// ============================================================================

function parseEvolutionWebhook(body: any): EvolutionMessage | null {
  if (body.event !== 'messages.upsert') {
    return null;
  }

  const data = body.data;
  if (!data || !data.key) {
    return null;
  }

  const messageText =
    data.message?.conversation || data.message?.extendedTextMessage?.text;

  if (!messageText || data.key.fromMe) {
    return null;
  }

  return body as EvolutionMessage;
}

/**
 * Valida que agente pertence à organização do usuário
 */
async function validateAgentOwnership(
  agentId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createStaticAdminClient();

  const { data, error } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('organization_id', organizationId)
    .single();

  return !error && !!data;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const requestId = `${params.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const startTime = Date.now();

  try {
    console.log(`📨 [${requestId}] Webhook recebido para agente: ${params.agentId}`);

    // ───────────────────────────────────────────────────────────
    // 1. PARSE E VALIDAÇÃO
    // ───────────────────────────────────────────────────────────

    const body = await req.json();
    const message = parseEvolutionWebhook(body);

    if (!message) {
      console.log(`[${requestId}] Mensagem ignorada (não é novo texto)`);
      return NextResponse.json({ status: 'ignored' });
    }

    const leadPhone = message.data.key.remoteJid.split('@')[0];
    const leadName = message.data.pushName || 'Lead';
    const userMessage = message.data.message.conversation ||
      message.data.message.extendedTextMessage?.text || '';

    console.log(`[${requestId}] De: ${leadName} (${leadPhone}) | Msg: "${userMessage.substring(0, 40)}..."`);

    // ───────────────────────────────────────────────────────────
    // 2. CARREGAR CONFIG DO AGENTE
    // ───────────────────────────────────────────────────────────

    const config = await loadAgentConfig(params.agentId);

    if (!config) {
      console.error(`[${requestId}] Agente não encontrado: ${params.agentId}`);
      return NextResponse.json({ status: 'error', message: 'Agent not found' }, { status: 404 });
    }

    if (!config.enabled) {
      console.warn(`[${requestId}] Agente desabilitado`);
      return NextResponse.json({ status: 'disabled' }, { status: 503 });
    }

    // ───────────────────────────────────────────────────────────
    // 3. VALIDAR TENANT ISOLATION
    // ───────────────────────────────────────────────────────────
    // TODO: Obter organizationId do request (JWT, headers, etc)
    // Por enquanto, usar organizationId do config
    const organizationId = config.organizationId;

    const isOwned = await validateAgentOwnership(params.agentId, organizationId);
    if (!isOwned) {
      console.error(`[${requestId}] Agent não pertence a organization`);
      return NextResponse.json({ status: 'forbidden' }, { status: 403 });
    }

    // ───────────────────────────────────────────────────────────
    // 4. APLICAR ACCUMULATOR (BUFFER)
    // ───────────────────────────────────────────────────────────

    const accumulationMs = config.responseDelayMs || 5000;
    const accumulated = addMessageToAccumulator(
      params.agentId,
      leadPhone,
      userMessage,
      accumulationMs
    );

    if (!accumulated.shouldProcess) {
      console.log(
        `[${requestId}] Mensagem buffered. Aguardando ${accumulationMs}ms por mais mensagens...`
      );
      return NextResponse.json({
        status: 'buffered',
        waitingMs: accumulationMs,
      });
    }

    console.log(
      `[${requestId}] Processando ${accumulated.accumulatedMessages.length} mensagens acumuladas`
    );

    // ───────────────────────────────────────────────────────────
    // 5. RECUPERAR/CRIAR CONVERSA
    // ───────────────────────────────────────────────────────────

    const conversation = await getOrCreateConversation(
      params.agentId,
      organizationId,
      leadPhone,
      leadName
    );

    if (!conversation) {
      console.error(`[${requestId}] Falha ao criar/recuperar conversa`);
      return NextResponse.json({ status: 'error', message: 'Conversation error' }, { status: 500 });
    }

    // Verificar limite de interações
    if (config.maxInteractionsPerSession &&
        conversation.interactionCount >= config.maxInteractionsPerSession) {
      console.log(
        `[${requestId}] Limite de interações atingido (${conversation.interactionCount})`
      );
      return NextResponse.json(
        { status: 'max_interactions_reached' },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────────────────
    // 6. CARREGAR HISTÓRICO
    // ───────────────────────────────────────────────────────────

    const history = await getFormattedConversationHistory(conversation.id);

    console.log(`[${requestId}] Histórico: ${history.length} mensagens`);

    // ───────────────────────────────────────────────────────────
    // 7. CONSTRUIR PROMPT
    // ───────────────────────────────────────────────────────────

    const systemPrompt = buildSystemPrompt(
      config,
      leadName,
      leadPhone,
      `Conversa ID: ${conversation.id}`
    );

    // ───────────────────────────────────────────────────────────
    // 8. SALVAR MENSAGENS DO USUÁRIO
    // ───────────────────────────────────────────────────────────

    for (const msg of accumulated.accumulatedMessages) {
      await addMessageToConversation(conversation.id, 'user', msg);
    }

    // ───────────────────────────────────────────────────────────
    // 9. CHAMAR IA COM FALLBACK
    // ───────────────────────────────────────────────────────────

    const { text: rawResponse, provider } = await robustGenerateWithFallback({
      system: systemPrompt,
      messages: convertToCoreMessages([
        ...history,
        {
          role: 'user',
          content: accumulated.accumulatedMessages.join('\n'),
        },
      ]),
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      requestId,
    });

    console.log(
      `[${requestId}] Resposta gerada (${provider}): "${rawResponse.substring(0, 40)}..."`
    );

    // ───────────────────────────────────────────────────────────
    // 10. FORMATAR RESPOSTA
    // ───────────────────────────────────────────────────────────

    const formattedResponse = formatResponse(rawResponse, config);

    // ───────────────────────────────────────────────────────────
    // 11. SALVAR RESPOSTA NA CONVERSA
    // ───────────────────────────────────────────────────────────

    await addMessageToConversation(conversation.id, 'assistant', formattedResponse);
    await incrementInteractionCount(conversation.id);

    // ───────────────────────────────────────────────────────────
    // 12. ENVIAR VIA EVOLUTION API
    // ───────────────────────────────────────────────────────────

    const sendResult = await formatAndSendResponse(leadPhone, formattedResponse);

    if (!sendResult) {
      console.warn(`⚠️ [${requestId}] Falha ao enviar via Evolution API`);
    }

    // ───────────────────────────────────────────────────────────
    // 13. LIMPAR BUFFER
    // ───────────────────────────────────────────────────────────

    clearAccumulator(params.agentId, leadPhone);

    // ───────────────────────────────────────────────────────────
    // ✅ SUCESSO
    // ───────────────────────────────────────────────────────────

    const latencyMs = Date.now() - startTime;
    console.log(`✅ [${requestId}] Sucesso! Latência: ${latencyMs}ms`);

    return NextResponse.json({
      status: 'success',
      requestId,
      provider,
      responseLength: formattedResponse.length,
      latencyMs,
      conversationId: conversation.id,
    });

  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`❌ [${requestId}] Erro (${latencyMs}ms):`, error.message);

    // Limpar buffer mesmo em erro
    try {
      const body = await req.json().catch(() => ({}));
      const leadPhone = body?.data?.key?.remoteJid?.split('@')[0];
      if (leadPhone && params.agentId) {
        clearAccumulator(params.agentId, leadPhone);
      }
    } catch {
      // Silencioso se falhar limpeza
    }

    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        requestId,
      },
      { status: 500 }
    );
  }
}
