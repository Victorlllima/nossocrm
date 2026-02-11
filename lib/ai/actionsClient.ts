'use client';

import { callAIProxy, isConsentError, isRateLimitError } from '@/lib/supabase/ai-proxy';
import type { Deal, DealView, LifecycleStage } from '@/types';
import type { ParsedAction } from '@/types/aiActions';

/**
 * Cliente de alto nÃ­vel para as actions de IA.
 *
 * ObservaÃ§Ã£o: a configuraÃ§Ã£o (API key/modelo) Ã© tratada server-side em `/api/ai/actions`.
 * O parÃ¢metro `config` (legado) Ã© aceito apenas para compatibilidade de assinatura.
 */
export interface AIConfigLegacy {
  provider: 'google' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  thinking: boolean;
  search: boolean;
  anthropicCaching: boolean;
}

export type AnalyzeLeadResult = {
  action: string;
  reason: string;
  actionType: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP';
  urgency: 'low' | 'medium' | 'high';
  probabilityScore: number;
  /** Campo legacy usado em algumas telas */
  suggestion: string;
};

/**
 * FunÃ§Ã£o pÃºblica `analyzeLead` do projeto.
 *
 * @param {Deal | DealView} deal - ParÃ¢metro `deal`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @param {string | undefined} stageLabel - ParÃ¢metro `stageLabel`.
 * @returns {Promise<AnalyzeLeadResult>} Retorna um valor do tipo `Promise<AnalyzeLeadResult>`.
 */
export async function analyzeLead(
  deal: Deal | DealView,
  _config?: AIConfigLegacy,
  stageLabel?: string
): Promise<AnalyzeLeadResult> {
  try {
    const result = await callAIProxy<Omit<AnalyzeLeadResult, 'suggestion'>>('analyzeLead', {
      deal: {
        title: deal.title,
        value: deal.value,
        status: deal.status,
        probability: deal.probability,
        priority: deal.priority,
      },
      stageLabel,
    });

    return {
      ...result,
      suggestion: `${result.action} â€” ${result.reason}`,
    };
  } catch (error) {
    console.error('Error analyzing lead:', error);

    const fallbackScore = deal.probability ?? 50;

    if (isConsentError(error)) {
      return {
        action: 'Configurar consentimento',
        reason: 'Consentimento necessÃ¡rio para usar IA',
        actionType: 'TASK',
        urgency: 'medium',
        probabilityScore: fallbackScore,
        suggestion: 'Consentimento necessÃ¡rio para usar IA. VÃ¡ em ConfiguraÃ§Ãµes â†’ InteligÃªncia Artificial.',
      };
    }

    if (isRateLimitError(error)) {
      return {
        action: 'Tentar novamente',
        reason: 'Limite de requisiÃ§Ãµes atingido',
        actionType: 'TASK',
        urgency: 'low',
        probabilityScore: fallbackScore,
        suggestion: 'Limite de requisiÃ§Ãµes atingido. Tente novamente em alguns minutos.',
      };
    }

    return {
      action: 'Revisar manualmente',
      reason: 'NÃ£o foi possÃ­vel obter anÃ¡lise da IA',
      actionType: 'TASK',
      urgency: 'low',
      probabilityScore: fallbackScore,
      suggestion: 'NÃ£o foi possÃ­vel obter anÃ¡lise da IA.',
    };
  }
}

/**
 * FunÃ§Ã£o pÃºblica `generateEmailDraft` do projeto.
 *
 * @param {Deal | DealView} deal - ParÃ¢metro `deal`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @param {string | undefined} stageLabel - ParÃ¢metro `stageLabel`.
 * @returns {Promise<string>} Retorna um valor do tipo `Promise<string>`.
 */
export async function generateEmailDraft(
  deal: Deal | DealView,
  _config?: AIConfigLegacy,
  stageLabel?: string
): Promise<string> {
  try {
    return await callAIProxy<string>('generateEmailDraft', {
      deal: {
        title: deal.title,
        value: deal.value,
        status: deal.status,
        contactName: 'contactName' in deal ? deal.contactName : undefined,
        companyName: 'companyName' in deal ? deal.companyName : undefined,
      },
      stageLabel,
    });
  } catch (error) {
    console.error('Error generating email:', error);
    if (isConsentError(error)) return 'Consentimento necessÃ¡rio para usar IA.';
    if (isRateLimitError(error)) return 'Limite de requisiÃ§Ãµes atingido.';
    return 'Erro ao gerar e-mail.';
  }
}

/**
 * FunÃ§Ã£o pÃºblica `generateObjectionResponse` do projeto.
 *
 * @param {Deal | DealView} deal - ParÃ¢metro `deal`.
 * @param {string} objection - ParÃ¢metro `objection`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @returns {Promise<string[]>} Retorna um valor do tipo `Promise<string[]>`.
 */
export async function generateObjectionResponse(
  deal: Deal | DealView,
  objection: string,
  _config?: AIConfigLegacy
): Promise<string[]> {
  try {
    return await callAIProxy<string[]>('generateObjectionResponse', {
      deal: { title: deal.title, value: deal.value },
      objection,
    });
  } catch (error) {
    console.error('Error generating objections:', error);
    if (isConsentError(error)) return ['Consentimento necessÃ¡rio para usar IA.'];
    if (isRateLimitError(error)) return ['Limite de requisiÃ§Ãµes atingido.'];
    return ['NÃ£o foi possÃ­vel gerar respostas.'];
  }
}

export interface GeneratedBoard {
  name: string;
  description: string;
  stages: {
    name: string;
    description: string;
    color: string;
    linkedLifecycleStage: string;
    estimatedDuration?: string;
  }[];
  automationSuggestions: string[];
  goal: {
    description: string;
    kpi: string;
    targetValue: string;
    currentValue?: string;
  };
  agentPersona: {
    name: string;
    role: string;
    behavior: string;
  };
  entryTrigger: string;
  confidence: number;
  boardName?: string;
  linkedLifecycleStage?: string;
}

/**
 * FunÃ§Ã£o pÃºblica `generateBoardStructure` do projeto.
 *
 * @param {string} description - ParÃ¢metro `description`.
 * @param {LifecycleStage[]} lifecycleStages - ParÃ¢metro `lifecycleStages`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @returns {Promise<{ boardName: string; description: string; stages: { name: string; description: string; color: string; linkedLifecycleStage: string; estimatedDuration?: string | undefined; }[]; automationSuggestions: string[]; }>} Retorna um valor do tipo `Promise<{ boardName: string; description: string; stages: { name: string; description: string; color: string; linkedLifecycleStage: string; estimatedDuration?: string | undefined; }[]; automationSuggestions: string[]; }>`.
 */
export async function generateBoardStructure(
  description: string,
  lifecycleStages: LifecycleStage[] = [],
  _config?: AIConfigLegacy
): Promise<{
  boardName: string;
  description: string;
  stages: GeneratedBoard['stages'];
  automationSuggestions: string[];
}> {
  return await callAIProxy('generateBoardStructure', {
    description,
    lifecycleStages: lifecycleStages.map(s => ({ id: s.id, name: s.name })),
  });
}

/**
 * FunÃ§Ã£o pÃºblica `generateBoardStrategy` do projeto.
 *
 * @param {{ boardName: string; description: string; stages: { name: string; description: string; color: string; linkedLifecycleStage: string; estimatedDuration?: string | undefined; }[]; automationSuggestions: string[]; }} boardData - ParÃ¢metro `boardData`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @returns {Promise<Pick<GeneratedBoard, "goal" | "agentPersona" | "entryTrigger">>} Retorna um valor do tipo `Promise<Pick<GeneratedBoard, "goal" | "agentPersona" | "entryTrigger">>`.
 */
export async function generateBoardStrategy(
  boardData: {
    boardName: string;
    description: string;
    stages: GeneratedBoard['stages'];
    automationSuggestions: string[];
  },
  _config?: AIConfigLegacy
): Promise<Pick<GeneratedBoard, 'goal' | 'agentPersona' | 'entryTrigger'>> {
  try {
    return await callAIProxy('generateBoardStrategy', { boardData });
  } catch (error) {
    console.error('Error generating strategy:', error);
    return {
      goal: { description: 'Definir meta', kpi: 'N/A', targetValue: '0' },
      agentPersona: { name: 'Assistente', role: 'Operador', behavior: 'Ajudar no processo.' },
      entryTrigger: 'Novos itens',
    };
  }
}

/**
 * FunÃ§Ã£o pÃºblica `refineBoardWithAI` do projeto.
 *
 * @param {GeneratedBoard} currentBoard - ParÃ¢metro `currentBoard`.
 * @param {string} userInstruction - ParÃ¢metro `userInstruction`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @param {{ role: "user" | "ai"; content: string; }[] | undefined} chatHistory - ParÃ¢metro `chatHistory`.
 * @returns {Promise<{ message: string; board: GeneratedBoard | null; }>} Retorna um valor do tipo `Promise<{ message: string; board: GeneratedBoard | null; }>`.
 */
export async function refineBoardWithAI(
  currentBoard: GeneratedBoard,
  userInstruction: string,
  _config?: AIConfigLegacy,
  chatHistory?: { role: 'user' | 'ai'; content: string }[]
): Promise<{ message: string; board: GeneratedBoard | null }> {
  const result = await callAIProxy<{ message: string; board: GeneratedBoard | null }>('refineBoardWithAI', {
    currentBoard,
    userInstruction,
    chatHistory,
  });

  // SAFETY MERGE: se IA nÃ£o retornar campos de estratÃ©gia, preserva do board atual.
  if (result.board) {
    result.board = {
      ...currentBoard,
      ...result.board,
      goal: result.board.goal || currentBoard.goal,
      agentPersona: result.board.agentPersona || currentBoard.agentPersona,
      entryTrigger: result.board.entryTrigger || currentBoard.entryTrigger,
    };
  }

  return result;
}

/**
 * FunÃ§Ã£o pÃºblica `parseNaturalLanguageAction` do projeto.
 *
 * @param {string} text - ParÃ¢metro `text`.
 * @returns {Promise<ParsedAction>} Retorna um valor do tipo `Promise<ParsedAction>`.
 */
export async function parseNaturalLanguageAction(text: string): Promise<ParsedAction> {
  return await callAIProxy<ParsedAction>('parseNaturalLanguageAction', { text });
}

export type RewriteMessageDraftInput = {
  channel: 'WHATSAPP' | 'EMAIL';
  currentSubject?: string;
  currentMessage?: string;
  nextBestAction?: {
    action?: string;
    reason?: string;
    actionType?: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP';
    urgency?: 'low' | 'medium' | 'high';
  };
  cockpitSnapshot?: unknown;
};

export type RewriteMessageDraftResult = {
  subject?: string;
  message: string;
};

/**
 * FunÃ§Ã£o pÃºblica `rewriteMessageDraft` do projeto.
 *
 * @param {RewriteMessageDraftInput} input - ParÃ¢metro `input`.
 * @param {AIConfigLegacy | undefined} _config - ParÃ¢metro `_config`.
 * @returns {Promise<RewriteMessageDraftResult>} Retorna um valor do tipo `Promise<RewriteMessageDraftResult>`.
 */
export async function rewriteMessageDraft(
  input: RewriteMessageDraftInput,
  _config?: AIConfigLegacy
): Promise<RewriteMessageDraftResult> {
  return await callAIProxy<RewriteMessageDraftResult>('rewriteMessageDraft', input);
}
