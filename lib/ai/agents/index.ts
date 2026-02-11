/**
 * Agents Platform - Core Exports
 */

// Message Accumulator
export {
  addMessageToAccumulator,
  markAsProcessing,
  clearAccumulator,
  getAccumulatorInfo,
  cleanupInactiveAccumulators,
  getAllAccumulators,
  type AccumulatorEntry as MessageAccumulatorEntry,
} from './message-accumulator';

// Agent Config
export {
  loadAgentConfig,
  invalidateAgentCache,
  clearAllConfigCache,
  getCacheInfo,
  type AgentConfig,
} from './agent-config-loader';

// Prompt Building
export {
  buildSystemPrompt,
  formatResponse,
  createHumanTransferMessage,
  createTerminationMessage,
} from './prompt-builder';

// Conversation Management
export {
  createConversation,
  getOrCreateConversation,
  addMessageToConversation,
  getConversationHistory,
  getFormattedConversationHistory,
  incrementInteractionCount,
  completeConversation,
  transferToHuman,
  getConversation,
  type ConversationMessage,
  type ConversationSession,
} from './conversation-manager';
