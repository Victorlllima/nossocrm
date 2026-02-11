/**
 * Agent Config Loader
 *
 * Carrega configuração dinâmica do agente do Supabase
 * Cache local com TTL para performance
 */

import { createStaticAdminClient } from '@/lib/supabase/server';

export interface AgentConfig {
  id: string;
  organizationId: string;
  name: string;
  agentName: string;
  communicationStyle: 'formal' | 'casual' | 'normal';
  customSystemPrompt: string;

  // Comportamento
  useEmojis: boolean;
  signWithName: boolean;
  restrictTopics: boolean;
  splitLongMessages: boolean;
  allowReminders: boolean;

  // Transferência
  allowHumanTransfer: boolean;
  humanTransferWebhook: string | null;

  // Avançadas
  timezone: string;
  responseDelayMs: number;
  maxInteractionsPerSession: number | null;
  typingIndicator: boolean;
  autoMarkRead: boolean;
  audioProcessing: 'ignore' | 'transcribe' | 'analyze';
  activationTrigger: 'always' | 'keyword' | 'manual';
  terminationTrigger: 'timeout' | 'user_request' | 'max_interactions';
  acceptGroupMessages: boolean;
  respondToPrivateChats: boolean;
  callHandling: 'ignore' | 'notify' | 'respond';

  // Modelo
  modelProvider: 'openai' | 'anthropic' | 'google';
  modelName: string;
  temperature: number;
  maxTokens: number;

  // Status
  enabled: boolean;
}

// Cache local com TTL
interface CacheEntry {
  config: AgentConfig;
  loadedAt: number;
}

const configCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300000; // 5 minutos

/**
 * Carrega configuração do agente pelo ID
 */
export async function loadAgentConfig(agentId: string): Promise<AgentConfig | null> {
  // Verificar cache
  const cached = configCache.get(agentId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    console.log(`[ConfigLoader] Cache hit para agente: ${agentId}`);
    return cached.config;
  }

  // Carregar do banco
  const supabase = createStaticAdminClient();

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error || !data) {
    console.error(`[ConfigLoader] Erro ao carregar agente ${agentId}:`, error);
    return null;
  }

  // Mapear para interface
  const config: AgentConfig = {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    agentName: data.agent_name || 'Agent',
    communicationStyle: data.communication_style || 'normal',
    customSystemPrompt: data.custom_system_prompt || '',

    useEmojis: data.use_emojis || false,
    signWithName: data.sign_with_name || false,
    restrictTopics: data.restrict_topics || false,
    splitLongMessages: data.split_long_messages !== false,
    allowReminders: data.allow_reminders || false,

    allowHumanTransfer: data.allow_human_transfer !== false,
    humanTransferWebhook: data.human_transfer_webhook || null,

    timezone: data.timezone || 'America/Recife',
    responseDelayMs: data.response_delay_ms || 0,
    maxInteractionsPerSession: data.max_interactions_per_session || null,
    typingIndicator: data.typing_indicator !== false,
    autoMarkRead: data.auto_mark_read || false,
    audioProcessing: data.audio_processing || 'ignore',
    activationTrigger: data.activation_trigger || 'always',
    terminationTrigger: data.termination_trigger || 'timeout',
    acceptGroupMessages: data.accept_group_messages || false,
    respondToPrivateChats: data.respond_to_private_chats !== false,
    callHandling: data.call_handling || 'ignore',

    modelProvider: data.model_provider || 'openai',
    modelName: data.model_name || 'gpt-4o-mini',
    temperature: parseFloat(data.temperature) || 0.3,
    maxTokens: data.max_tokens || 500,

    enabled: data.enabled !== false,
  };

  // Cachear
  configCache.set(agentId, {
    config,
    loadedAt: Date.now(),
  });

  console.log(`[ConfigLoader] Agente carregado e cacheado: ${agentId}`);
  return config;
}

/**
 * Invalida cache de um agente (após atualizar configurações)
 */
export function invalidateAgentCache(agentId: string): void {
  configCache.delete(agentId);
  console.log(`[ConfigLoader] Cache invalidado para agente: ${agentId}`);
}

/**
 * Limpa cache inteiro
 */
export function clearAllConfigCache(): void {
  configCache.clear();
  console.log(`[ConfigLoader] Cache completo limpo`);
}

/**
 * Retorna info do cache (para debugging)
 */
export function getCacheInfo(): {
  totalCached: number;
  agents: Array<{ agentId: string; ageSeconds: number }>;
} {
  const now = Date.now();
  const agents = Array.from(configCache.entries()).map(([agentId, entry]) => ({
    agentId,
    ageSeconds: Math.round((now - entry.loadedAt) / 1000),
  }));

  return {
    totalCached: configCache.size,
    agents,
  };
}
