// Buffer em memória — acumula mensagens de uma mesma conversa por 5s
// Garante que só UM processamento ocorre por sessão por vez

interface BufferEntry {
  messages: string[];
  timer: ReturnType<typeof setTimeout>;
  resolvers: Array<(msgs: string[]) => void>;
}

const buffers = new Map<string, BufferEntry>();
// Sessões com processamento em andamento — novas mensagens aguardam
const processing = new Set<string>();

const BUFFER_WAIT_MS = 5_000;

export function bufferMessage(
  conversationId: string,
  text: string
): Promise<string[]> {
  return new Promise((resolve) => {
    const existing = buffers.get(conversationId);

    if (existing) {
      // Já tem buffer aberto — adiciona mensagem e registra resolver
      existing.messages.push(text);
      existing.resolvers.push(resolve);
      // Reinicia o timer
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => flush(conversationId), BUFFER_WAIT_MS);
    } else {
      // Novo buffer
      const entry: BufferEntry = {
        messages: [text],
        resolvers: [resolve],
        timer: setTimeout(() => flush(conversationId), BUFFER_WAIT_MS),
      };
      buffers.set(conversationId, entry);
    }
  });
}

function flush(conversationId: string): void {
  const entry = buffers.get(conversationId);
  if (!entry) return;
  buffers.delete(conversationId);

  const { messages, resolvers } = entry;

  // Resolve todos os callers com o conjunto completo de mensagens
  // Apenas o PRIMEIRO caller processa — os demais recebem array vazio
  resolvers[0]?.(messages);
  for (let i = 1; i < resolvers.length; i++) {
    resolvers[i]([]);
  }
}

// Deduplicação de messageId para evitar reprocessamento de webhooks duplicados
const processedIds = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000;

export function isDuplicate(messageId: string): boolean {
  const ts = processedIds.get(messageId);
  if (ts && Date.now() - ts < DEDUP_TTL_MS) return true;
  processedIds.set(messageId, Date.now());
  return false;
}
