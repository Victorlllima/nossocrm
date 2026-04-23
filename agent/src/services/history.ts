import { supabase } from './supabase.js';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CONTEXT_WINDOW = 10;

// Usa a tabela dialogos (compatível com o n8n)
// session_id formato: "{phone}_memory"
// message: { type: "human"|"ai", content: string, ... }

function toSessionId(sessionId: string): string {
  return `${sessionId}_memory`;
}

export async function loadHistory(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('dialogos')
    .select('message')
    .eq('session_id', toSessionId(sessionId))
    .order('id', { ascending: true })
    .limit(CONTEXT_WINDOW);

  if (error) {
    console.error('[history] Erro ao carregar histórico:', error.message);
    return [];
  }

  return (data ?? []).map((row: { message: { type: string; content: string } }) => ({
    role: row.message.type === 'human' ? 'user' : 'assistant',
    content: row.message.content ?? '',
  }));
}

export async function saveMessage(
  sessionId: string,
  role: Message['role'],
  content: string
): Promise<void> {
  const message = {
    type: role === 'user' ? 'human' : 'ai',
    content,
    additional_kwargs: {},
    response_metadata: {},
    ...(role === 'assistant' ? { tool_calls: [], invalid_tool_calls: [] } : {}),
  };

  const { error } = await supabase
    .from('dialogos')
    .insert({ session_id: toSessionId(sessionId), message });

  if (error) {
    console.error('[history] Erro ao salvar mensagem:', error.message);
  }
}
