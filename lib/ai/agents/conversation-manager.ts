/**
 * Conversation Manager
 *
 * Gerencia histórico de conversas com um lead/cliente
 * Persiste em Supabase, carrega com limites de context window
 */

import { createStaticAdminClient } from '@/lib/supabase/server';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationSession {
  id: string;
  agentId: string;
  organizationId: string;
  phone: string;
  leadName: string;
  status: 'active' | 'completed' | 'transferred';
  interactionCount: number;
  startedAt: string;
  endedAt?: string;
}

/**
 * Cria nova conversa com um lead
 */
export async function createConversation(
  agentId: string,
  organizationId: string,
  phone: string,
  leadName: string,
  initialContext?: Record<string, any>
): Promise<ConversationSession | null> {
  const supabase = createStaticAdminClient();

  const { data, error } = await supabase
    .from('agent_conversations')
    .insert({
      agent_id: agentId,
      organization_id: organizationId,
      phone_number: phone,
      lead_name: leadName,
      conversation_context: initialContext || {},
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('[ConversationManager] Erro ao criar conversa:', error);
    return null;
  }

  return mapToSession(data);
}

/**
 * Recupera ou cria conversa ativa
 */
export async function getOrCreateConversation(
  agentId: string,
  organizationId: string,
  phone: string,
  leadName: string
): Promise<ConversationSession | null> {
  const supabase = createStaticAdminClient();

  // Tentar encontrar conversa ativa
  const { data: existing } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('phone_number', phone)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return mapToSession(existing);
  }

  // Criar nova conversa
  return createConversation(agentId, organizationId, phone, leadName);
}

/**
 * Salva mensagem na conversa
 */
export async function addMessageToConversation(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    latencyMs?: number;
  }
): Promise<boolean> {
  if (!content || content.trim().length === 0) {
    return false;
  }

  const supabase = createStaticAdminClient();

  // Truncar se muito longo
  const safeContent = content.length > 5000 ? content.substring(0, 5000) + '...' : content;

  const { error } = await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role,
    content: safeContent,
    model_used: metadata?.modelUsed,
    tokens_used: metadata?.tokensUsed,
    latency_ms: metadata?.latencyMs,
  });

  if (error) {
    console.error('[ConversationManager] Erro ao salvar mensagem:', error);
    return false;
  }

  return true;
}

/**
 * Recupera histórico da conversa
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 10
): Promise<ConversationMessage[]> {
  const supabase = createStaticAdminClient();

  const { data, error } = await supabase
    .from('agent_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('[ConversationManager] Erro ao recuperar histórico:', error);
    return [];
  }

  return data
    .reverse()
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
}

/**
 * Recupera histórico com trimming automático por tokens
 */
export async function getFormattedConversationHistory(
  conversationId: string,
  maxTokensApprox: number = 4000
): Promise<ConversationMessage[]> {
  // Carregar mais mensagens para ter margem
  let messages = await getConversationHistory(conversationId, 20);

  // Estimar tokens (aproximação: 4 chars = 1 token)
  const estimateTokens = (msgs: ConversationMessage[]): number => {
    return msgs.reduce((acc, msg) => acc + msg.content.length / 4, 0);
  };

  // Se contexto muito pesado, trim para últimas 6 mensagens
  if (estimateTokens(messages) > maxTokensApprox) {
    console.log(
      `[ConversationManager] Contexto pesado (${estimateTokens(messages).toFixed(0)} tokens), trimando...`
    );
    messages = messages.slice(-6);
  }

  return messages;
}

/**
 * Incrementa contagem de interações
 */
export async function incrementInteractionCount(conversationId: string): Promise<boolean> {
  const supabase = createStaticAdminClient();

  const { error } = await supabase
    .from('agent_conversations')
    .update({
      interaction_count: supabase.rpc('increment', {
        column_name: 'interaction_count',
      }),
    })
    .eq('id', conversationId);

  if (error) {
    // Fallback: fazer de forma manual
    const { data: conv } = await supabase
      .from('agent_conversations')
      .select('interaction_count')
      .eq('id', conversationId)
      .single();

    if (conv) {
      await supabase
        .from('agent_conversations')
        .update({ interaction_count: (conv.interaction_count || 0) + 1 })
        .eq('id', conversationId);
    }
  }

  return !error;
}

/**
 * Marca conversa como completada
 */
export async function completeConversation(conversationId: string): Promise<boolean> {
  const supabase = createStaticAdminClient();

  const { error } = await supabase
    .from('agent_conversations')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[ConversationManager] Erro ao completar conversa:', error);
    return false;
  }

  return true;
}

/**
 * Transfere para humano
 */
export async function transferToHuman(
  conversationId: string,
  targetAgentId?: string
): Promise<boolean> {
  const supabase = createStaticAdminClient();

  const { error } = await supabase
    .from('agent_conversations')
    .update({
      status: 'transferred',
      transferred_to_human_at: new Date().toISOString(),
      transferred_to_agent_id: targetAgentId || null,
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[ConversationManager] Erro ao transferir:', error);
    return false;
  }

  return true;
}

/**
 * Recupera conversa pelo ID
 */
export async function getConversation(conversationId: string): Promise<ConversationSession | null> {
  const supabase = createStaticAdminClient();

  const { data, error } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('[ConversationManager] Erro ao recuperar conversa:', error);
    return null;
  }

  return mapToSession(data);
}

/**
 * Helper: mapear resposta do banco para interface
 */
function mapToSession(data: any): ConversationSession {
  return {
    id: data.id,
    agentId: data.agent_id,
    organizationId: data.organization_id,
    phone: data.phone_number,
    leadName: data.lead_name,
    status: data.status,
    interactionCount: data.interaction_count || 0,
    startedAt: data.started_at,
    endedAt: data.ended_at,
  };
}
