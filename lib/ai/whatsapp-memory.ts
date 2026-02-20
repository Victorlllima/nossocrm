/**
 * Chat Memory Management
 * Migrated from N8n: Postgres Chat Memory node (line 73)
 */

import { createStaticAdminClient } from '@/lib/supabase/server';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Saves a message to the conversation history
 * 
 * Replicates N8n's PostgreSQL Chat Memory behavior:
 * - Table: dialogos
 * - Session ID format: {phone}_memory
 * - Context window: 10 messages
 * 
 * @param sessionId - Session identifier (phone_memory)
 * @param role - Message role (user or assistant)
 * @param content - Message content
 */
/**
 * Saves a message to the conversation history with safety checks
 */
export async function saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<void> {
    if (!content || content.trim().length === 0) return;

    // Truncate extremely long messages to avoid database/AI limits
    const safeContent = content.length > 5000 ? content.substring(0, 5000) + '...' : content;

    const supabase = createStaticAdminClient();

    try {
        const { error } = await supabase.from('dialogos').insert({
            session_id: sessionId,
            role,
            content: safeContent,
            created_at: new Date().toISOString(),
        });

        if (error) console.error(`[Memory] Erro ao salvar mensagem:`, error.message);
    } catch (err) {
        console.error(`[Memory] Falha fatal ao persistir:`, err);
    }
}

/**
 * Retrieves conversation history for a session
 */
export async function getConversationHistory(
    sessionId: string,
    limit: number = 10
): Promise<ChatMessage[]> {
    const supabase = createStaticAdminClient();

    const { data, error } = await supabase
        .from('dialogos')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

    return data.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
    }));
}

/**
 * Helper: Estima tokens (aproximação grosseira: 4 chars = 1 token)
 */
function estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce((acc, msg) => acc + (msg.content.length / 4), 0);
}

/**
 * Formats conversation history with automatic trimming (Best Practice)
 */
export async function getFormattedHistory(sessionId: string): Promise<ChatMessage[]> {
    // Pegamos as últimas 15 mensagens para ter uma margem
    let messages = await getConversationHistory(sessionId, 15);

    // Se o contexto estiver muito pesado (> 4000 tokens aproximados), trimamos para as últimas 6
    if (estimateTokens(messages) > 4000) {
        console.log(`[Memory] Contexto pesado detectado para ${sessionId}, trimando para as últimas 6 mensagens.`);
        messages = messages.slice(-6);
    }

    return messages;
}
