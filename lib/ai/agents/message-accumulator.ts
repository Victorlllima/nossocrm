/**
 * Message Accumulator - In-Memory Buffer
 *
 * Acumula mensagens por X segundos e responde todas de uma vez
 * (Baseado na funcionalidade do N8n Redis buffer)
 *
 * Não usa Redis - mantém em RAM com cleanup automático
 */

interface AccumulatorEntry {
  agentId: string;
  phone: string;
  messages: Array<{
    text: string;
    timestamp: number;
  }>;
  lastMessageAt: number;
  accumulationTimeMs: number; // Quanto tempo aguardar antes de responder
  isProcessing: boolean;
}

// Global in-memory store
const accumulators = new Map<string, AccumulatorEntry>();

/**
 * Gera chave única para o acumulador
 */
function getAccumulatorKey(agentId: string, phone: string): string {
  return `${agentId}:${phone}`;
}

/**
 * Adiciona mensagem ao acumulador
 * Retorna true se deve processar agora, false se deve aguardar
 */
export function addMessageToAccumulator(
  agentId: string,
  phone: string,
  messageText: string,
  accumulationTimeMs: number = 5000 // Default: esperar 5 segundos
): {
  shouldProcess: boolean;
  accumulatedMessages: string[];
} {
  const key = getAccumulatorKey(agentId, phone);
  const now = Date.now();

  let entry = accumulators.get(key);

  // Se não existe, criar nova entrada
  if (!entry) {
    entry = {
      agentId,
      phone,
      messages: [{ text: messageText, timestamp: now }],
      lastMessageAt: now,
      accumulationTimeMs,
      isProcessing: false,
    };
    accumulators.set(key, entry);

    console.log(
      `[Accumulator] Nova entrada: ${agentId} / ${phone} | Aguardando ${accumulationTimeMs}ms`
    );

    return {
      shouldProcess: false,
      accumulatedMessages: [],
    };
  }

  // Se já está processando, buffera a mensagem
  if (entry.isProcessing) {
    entry.messages.push({ text: messageText, timestamp: now });
    console.log(
      `[Accumulator] Buffering: ${agentId} / ${phone} | Total: ${entry.messages.length} msgs`
    );
    return {
      shouldProcess: false,
      accumulatedMessages: [],
    };
  }

  // Adiciona a mensagem
  entry.messages.push({ text: messageText, timestamp: now });
  entry.lastMessageAt = now;

  // Verifica se passou o tempo de acumulação
  const timeSinceFirst = now - (entry.messages[0]?.timestamp || now);

  if (timeSinceFirst >= accumulationTimeMs) {
    // Tempo passou - processar agora
    console.log(
      `[Accumulator] Tempo expirado: ${agentId} / ${phone} | Processando ${entry.messages.length} msgs`
    );
    return {
      shouldProcess: true,
      accumulatedMessages: entry.messages.map((m) => m.text),
    };
  }

  // Ainda está no período de acumulação
  console.log(
    `[Accumulator] Acumulando: ${agentId} / ${phone} | ${entry.messages.length} msgs | ${Math.round(accumulationTimeMs - timeSinceFirst)}ms restantes`
  );

  return {
    shouldProcess: false,
    accumulatedMessages: [],
  };
}

/**
 * Marca entrada como processando
 */
export function markAsProcessing(agentId: string, phone: string): void {
  const key = getAccumulatorKey(agentId, phone);
  const entry = accumulators.get(key);

  if (entry) {
    entry.isProcessing = true;
    console.log(`[Accumulator] Marcando como processando: ${key}`);
  }
}

/**
 * Limpa entrada após processar
 */
export function clearAccumulator(agentId: string, phone: string): void {
  const key = getAccumulatorKey(agentId, phone);
  accumulators.delete(key);
  console.log(`[Accumulator] Limpando: ${key}`);
}

/**
 * Get info sobre acumulador (para debugging)
 */
export function getAccumulatorInfo(agentId: string, phone: string): AccumulatorEntry | null {
  const key = getAccumulatorKey(agentId, phone);
  return accumulators.get(key) || null;
}

/**
 * Limpa accumuladores inativos (> 1 hora sem mensagens)
 */
export function cleanupInactiveAccumulators(): number {
  const now = Date.now();
  const INACTIVITY_TIMEOUT = 3600000; // 1 hora
  let cleaned = 0;

  for (const [key, entry] of accumulators.entries()) {
    if (now - entry.lastMessageAt > INACTIVITY_TIMEOUT) {
      accumulators.delete(key);
      console.log(`[Accumulator] Cleanup - Removido inativo: ${key}`);
      cleaned++;
    }
  }

  return cleaned;
}

// Cleanup automático a cada 10 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanupInactiveAccumulators();
    if (cleaned > 0) {
      console.log(`[Accumulator] Cleanup periódico: ${cleaned} entradas removidas`);
    }
  }, 600000); // 10 minutos
}

/**
 * Retorna todas as entradas ativas (para monitoramento)
 */
export function getAllAccumulators(): Map<string, AccumulatorEntry> {
  return new Map(accumulators);
}
