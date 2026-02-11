'use client';

import type { Deal, DealView, LifecycleStage } from '@/types';

export type AnalyzeLeadResult = {
  action: string;
  reason: string;
  actionType: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'WHATSAPP';
  urgency: 'low' | 'medium' | 'high';
  probabilityScore: number;
  /** Campo legacy usado em algumas telas */
  suggestion: string;
};

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

async function postTask<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `AI task failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

/**
 * FunÃ§Ã£o pÃºblica `analyzeLead` do projeto.
 *
 * @param {Deal | DealView} deal - ParÃ¢metro `deal`.
 * @param {string | undefined} stageLabel - ParÃ¢metro `stageLabel`.
 * @returns {Promise<AnalyzeLeadResult>} Retorna um valor do tipo `Promise<AnalyzeLeadResult>`.
 */
export async function analyzeLead(
  deal: Deal | DealView,
  stageLabel?: string
): Promise<AnalyzeLeadResult> {
  const result = await postTask<Omit<AnalyzeLeadResult, 'suggestion'>>('/api/ai/tasks/deals/analyze', {
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
}

/**
 * FunÃ§Ã£o pÃºblica `generateEmailDraft` do projeto.
 *
 * @param {Deal | DealView} deal - ParÃ¢metro `deal`.
 * @param {string | undefined} stageLabel - ParÃ¢metro `stageLabel`.
 * @returns {Promise<string>} Retorna um valor do tipo `Promise<string>`.
 */
export async function generateEmailDraft(deal: Deal | DealView, stageLabel?: string): Promise<string> {
  const result = await postTask<{ text: string }>('/api/ai/tasks/deals/email-draft', {
    deal: {
      title: deal.title,
      value: deal.value,
      status: deal.status,
      contactName: 'contactName' in deal ? deal.contactName : undefined,
      companyName: 'companyName' in deal ? deal.companyName : undefined,
    },
    stageLabel,
  });

  return result.text;
}

/**
 * FunÃ§Ã£o pÃºblica `generateObjectionResponse` do projeto.
 *
 * @param {Deal | DealView} deal - ParÃ¢metro `deal`.
 * @param {string} objection - ParÃ¢metro `objection`.
 * @returns {Promise<string[]>} Retorna um valor do tipo `Promise<string[]>`.
 */
export async function generateObjectionResponse(
  deal: Deal | DealView,
  objection: string
): Promise<string[]> {
  const result = await postTask<{ responses: string[] }>('/api/ai/tasks/deals/objection-responses', {
    deal: { title: deal.title, value: deal.value },
    objection,
  });

  return result.responses;
}

/**
 * FunÃ§Ã£o pÃºblica `generateBoardStructure` do projeto.
 *
 * @param {string} description - ParÃ¢metro `description`.
 * @param {LifecycleStage[]} lifecycleStages - ParÃ¢metro `lifecycleStages`.
 * @returns {Promise<{ boardName: string; description: string; stages: { name: string; description: string; color: string; linkedLifecycleStage: string; estimatedDuration?: string | undefined; }[]; automationSuggestions: string[]; }>} Retorna um valor do tipo `Promise<{ boardName: string; description: string; stages: { name: string; description: string; color: string; linkedLifecycleStage: string; estimatedDuration?: string | undefined; }[]; automationSuggestions: string[]; }>`.
 */
export async function generateBoardStructure(
  description: string,
  lifecycleStages: LifecycleStage[] = []
): Promise<{
  boardName: string;
  description: string;
  stages: GeneratedBoard['stages'];
  automationSuggestions: string[];
}> {
  return await postTask('/api/ai/tasks/boards/generate-structure', {
    description,
    lifecycleStages: lifecycleStages.map(s => ({ id: s.id, name: s.name })),
  });
}

/**
 * FunÃ§Ã£o pÃºblica `generateBoardStrategy` do projeto.
 *
 * @param {{ boardName: string; description: string; stages: { name: string; description: string; color: string; linkedLifecycleStage: string; estimatedDuration?: string | undefined; }[]; automationSuggestions: string[]; }} boardData - ParÃ¢metro `boardData`.
 * @returns {Promise<Pick<GeneratedBoard, "goal" | "agentPersona" | "entryTrigger">>} Retorna um valor do tipo `Promise<Pick<GeneratedBoard, "goal" | "agentPersona" | "entryTrigger">>`.
 */
export async function generateBoardStrategy(boardData: {
  boardName: string;
  description: string;
  stages: GeneratedBoard['stages'];
  automationSuggestions: string[];
}): Promise<Pick<GeneratedBoard, 'goal' | 'agentPersona' | 'entryTrigger'>> {
  return await postTask('/api/ai/tasks/boards/generate-strategy', { boardData });
}

/**
 * FunÃ§Ã£o pÃºblica `refineBoardWithAI` do projeto.
 *
 * @param {GeneratedBoard} currentBoard - ParÃ¢metro `currentBoard`.
 * @param {string} userInstruction - ParÃ¢metro `userInstruction`.
 * @param {{ role: "user" | "ai"; content: string; }[] | undefined} chatHistory - ParÃ¢metro `chatHistory`.
 * @returns {Promise<{ message: string; board: any; }>} Retorna um valor do tipo `Promise<{ message: string; board: any; }>`.
 */
export async function refineBoardWithAI(
  currentBoard: GeneratedBoard,
  userInstruction: string,
  chatHistory?: { role: 'user' | 'ai'; content: string }[]
): Promise<{ message: string; board: any | null }> {
  const result = await postTask<{ message: string; board: any | null }>('/api/ai/tasks/boards/refine', {
    currentBoard,
    userInstruction,
    chatHistory,
  });

  // SAFETY MERGE: se a IA nÃ£o retornar campos de estratÃ©gia, preserva do board atual.
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
 * FunÃ§Ã£o pÃºblica `generateDailyBriefing` do projeto.
 *
 * @param {unknown} radarData - ParÃ¢metro `radarData`.
 * @returns {Promise<string>} Retorna um valor do tipo `Promise<string>`.
 */
export async function generateDailyBriefing(radarData: unknown): Promise<string> {
  const result = await postTask<{ text: string }>('/api/ai/tasks/inbox/daily-briefing', { radarData });
  return result.text;
}

/**
 * FunÃ§Ã£o pÃºblica `generateSalesScript` do projeto.
 *
 * @param {{ deal: { title?: string | undefined; }; scriptType?: string | undefined; context?: string | undefined; }} args - ParÃ¢metro `args`.
 * @returns {Promise<{ script: string; scriptType?: string | undefined; generatedFor?: string | undefined; }>} Retorna um valor do tipo `Promise<{ script: string; scriptType?: string | undefined; generatedFor?: string | undefined; }>`.
 */
export async function generateSalesScript(args: {
  deal: { title?: string };
  scriptType?: string;
  context?: string;
}): Promise<{ script: string; scriptType?: string; generatedFor?: string }> {
  return await postTask('/api/ai/tasks/inbox/sales-script', args);
}
