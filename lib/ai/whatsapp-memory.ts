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
export async function saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<void> {
    const supabase = createStaticAdminClient();

    await supabase.from('dialogos').insert({
        session_id: sessionId,
        role,
        content,
        created_at: new Date().toISOString(),
    });
}

/**
 * Retrieves conversation history for a session
 * 
 * @param sessionId - Session identifier (phone_memory)
 * @param limit - Maximum number of messages to retrieve (default: 10)
 * @returns Array of messages in chronological order
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

    if (error || !data) {
        return [];
    }

    // Reverse to get chronological order (oldest first)
    return data.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
    }));
}

/**
 * Formats conversation history for Vercel AI SDK
 * 
 * @param sessionId - Session identifier
 * @returns Formatted messages array
 */
export async function getFormattedHistory(sessionId: string): Promise<ChatMessage[]> {
    return await getConversationHistory(sessionId, 10);
}
