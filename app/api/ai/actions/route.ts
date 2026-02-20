// Route Handler for AI "actions" (RPC-style helpers)
//
// This is the supported non-streaming endpoint for UI features that need a single, direct
// AI result (e.g. email draft, board generation, daily briefing).
//
// IMPORTANT:
// - Auth is cookie-based (Supabase SSR).
// - API keys are read server-side from `organization_settings`.
// - This is NOT the streaming Agent chat endpoint; that one is `/api/ai/chat`.
//
// Contract:
// POST { action: string, data: object }
// -> 200 { result?: any, error?: string, consentType?: string, retryAfter?: number }

import { generateObject, generateText } from 'ai';
import { getModel, type AIProvider } from '@/lib/ai/config';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { getResolvedPrompt } from '@/lib/ai/prompts/server';
import { renderPromptTemplate } from '@/lib/ai/prompts/render';
import { isAIFeatureEnabled } from '@/lib/ai/features/server';

export const maxDuration = 60;

type AIActionResponse<T = unknown> = {
  result?: T;
  error?: string;
  consentType?: string;
  retryAfter?: number;
};

type AIAction =
  | 'analyzeLead'
  | 'generateEmailDraft'
  | 'rewriteMessageDraft'
  | 'generateObjectionResponse'
  | 'generateDailyBriefing'
  | 'generateRescueMessage'
  | 'parseNaturalLanguageAction'
  | 'chatWithCRM'
  | 'generateBirthdayMessage'
  | 'generateBoardStructure'
  | 'generateBoardStrategy'
  | 'refineBoardWithAI'
  | 'chatWithBoardAgent'
  | 'generateSalesScript';

const AnalyzeLeadSchema = z.object({
  action: z.string().max(50).describe('AÃ§Ã£o curta e direta, mÃ¡ximo 50 caracteres.'),
  reason: z.string().max(80).describe('RazÃ£o breve, mÃ¡ximo 80 caracteres.'),
  actionType: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK', 'WHATSAPP']).describe('Tipo de aÃ§Ã£o sugerida'),
  urgency: z.enum(['low', 'medium', 'high']).describe('UrgÃªncia da aÃ§Ã£o'),
  probabilityScore: z.number().min(0).max(100).describe('Score de probabilidade (0-100)'),
});

const BoardStructureSchema = z.object({
  boardName: z.string().describe('Nome do board em portuguÃªs'),
  description: z.string().describe('DescriÃ§Ã£o do propÃ³sito do board'),
  stages: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      color: z.string().describe('Classe Tailwind CSS, ex: bg-blue-500'),
      linkedLifecycleStage: z.string().describe('ID do lifecycle stage: LEAD, MQL, PROSPECT, CUSTOMER ou OTHER'),
      estimatedDuration: z.string().optional(),
    })
  ),
  automationSuggestions: z.array(z.string()),
});

const BoardStrategySchema = z.object({
  goal: z.object({
    description: z.string(),
    kpi: z.string(),
    targetValue: z.string(),
  }),
  agentPersona: z.object({
    name: z.string(),
    role: z.string(),
    behavior: z.string(),
  }),
  entryTrigger: z.string(),
});

const RefineBoardSchema = z.object({
  message: z.string().describe('Resposta conversacional explicando mudanÃ§as'),
  board: BoardStructureSchema.nullable().describe('Board modificado ou null se apenas pergunta'),
});

const ObjectionResponseSchema = z.array(z.string()).describe('3 respostas diferentes para contornar objeÃ§Ã£o');

const ParsedActionSchema = z.object({
  title: z.string(),
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']),
  date: z.string().optional(),
  contactName: z.string().optional(),
  companyName: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const RewriteMessageDraftSchema = z.object({
  subject: z
    .string()
    .max(120)
    .optional()
    .describe('Assunto do email (somente para canal EMAIL).'),
  message: z
    .string()
    .max(1600)
    .describe('Mensagem final para enviar no canal escolhido.'),
});

function safeContextText(v: unknown, maxBytes = 80_000): string {
  if (v == null) return '';
  try {
    const text = typeof v === 'string' ? v : JSON.stringify(v);
    if (text.length <= maxBytes) return text;
    return text.slice(0, maxBytes) + '\n... [TRUNCADO]';
  } catch {
    return '';
  }
}

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

/**
 * Handler HTTP `POST` deste endpoint (Next.js Route Handler).
 *
 * @param {Request} req - Objeto da requisiÃ§Ã£o.
 * @returns {Promise<Response>} Retorna um valor do tipo `Promise<Response>`.
 */
export async function POST(req: Request) {
  // MitigaÃ§Ã£o CSRF: bloqueia POST cross-site em endpoint que usa auth via cookies.
  if (!isAllowedOrigin(req)) {
    return json<AIActionResponse>({ error: 'Forbidden' }, 403);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json<AIActionResponse>({ error: 'Unauthorized' }, 401);
  }

  const body = await req.json().catch(() => null);
  const action = body?.action as AIAction | undefined;
  const data = (body?.data ?? {}) as Record<string, unknown>;

  if (!action) {
    return json<AIActionResponse>({ error: "Invalid request format. Missing 'action'." }, 400);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    return json<AIActionResponse>({ error: 'Profile not found' }, 404);
  }

  const { data: orgSettings, error: orgError } = await supabase
    .from('organization_settings')
    .select('ai_enabled, ai_provider, ai_model, ai_google_key, ai_openai_key, ai_anthropic_key')
    .eq('organization_id', profile.organization_id)
    .single();

  const aiEnabled = typeof (orgSettings as any)?.ai_enabled === 'boolean' ? (orgSettings as any).ai_enabled : true;
  if (!aiEnabled) {
    return json<AIActionResponse>(
      { error: 'IA desativada pela organizaÃ§Ã£o. Um admin pode ativar em ConfiguraÃ§Ãµes â†’ Central de I.A.' },
      403
    );
  }

  // Feature flag per action (default: enabled)
  const featureKeyByAction: Partial<Record<AIAction, string>> = {
    analyzeLead: 'ai_deal_analyze',
    generateEmailDraft: 'ai_email_draft',
    generateObjectionResponse: 'ai_objection_responses',
    generateDailyBriefing: 'ai_daily_briefing',
    generateSalesScript: 'ai_sales_script',
    generateBoardStructure: 'ai_board_generate_structure',
    generateBoardStrategy: 'ai_board_generate_strategy',
    refineBoardWithAI: 'ai_board_refine',
    chatWithBoardAgent: 'ai_chat_agent',
    chatWithCRM: 'ai_chat_agent',
    rewriteMessageDraft: 'ai_email_draft',
  };

  const featureKey = featureKeyByAction[action];
  if (featureKey) {
    const enabled = await isAIFeatureEnabled(supabase as any, profile.organization_id as any, featureKey);
    if (!enabled) {
      return json<AIActionResponse>(
        { error: `FunÃ§Ã£o de IA desativada para esta aÃ§Ã£o (${action}).` },
        403
      );
    }
  }

  // Frontend expects "AI consent required" as a *payload* error.
  const provider: AIProvider = (orgSettings?.ai_provider ?? 'google') as AIProvider;
  const apiKey: string | null =
    provider === 'google'
      ? (orgSettings?.ai_google_key ?? null)
      : provider === 'openai'
        ? (orgSettings?.ai_openai_key ?? null)
        : (orgSettings?.ai_anthropic_key ?? null);

  if (orgError || !apiKey) {
    return json<AIActionResponse>({ error: 'AI consent required', consentType: 'AI_CONSENT' }, 200);
  }

  const modelId = orgSettings.ai_model || '';
  const model = getModel(provider, apiKey, modelId);

  try {
    switch (action) {
      case 'analyzeLead': {
        const { deal, stageLabel } = data as any;
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_deals_analyze');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          dealTitle: deal?.title || '',
          dealValue: deal?.value?.toLocaleString?.('pt-BR') ?? deal?.value ?? 0,
          stageLabel: stageLabel || deal?.status || '',
          probability: deal?.probability || 50,
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: AnalyzeLeadSchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateEmailDraft': {
        const { deal } = data as any;
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_deals_email_draft');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          contactName: deal?.contactName || 'Cliente',
          companyName: deal?.companyName || 'Empresa',
          dealTitle: deal?.title || '',
        });
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'rewriteMessageDraft': {
        const {
          channel,
          currentSubject,
          currentMessage,
          nextBestAction,
          cockpitSnapshot,
        } = data as any;

        const channelLabel = channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP';

        const snapshotText = safeContextText(cockpitSnapshot);
        const nbaText = safeContextText(nextBestAction);

        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: RewriteMessageDraftSchema,
          prompt: `VocÃª Ã© um vendedor sÃªnior e copywriter.
Sua tarefa Ã© REESCREVER (melhorar) uma mensagem para enviar ao cliente.

CANAL: ${channelLabel}

RASCUNHO ATUAL:
- subject (se houver): ${String(currentSubject ?? '')}
- message: ${String(currentMessage ?? '')}

PRÃ“XIMA AÃ‡ÃƒO (sugestÃ£o/NBA):
${nbaText || '[nÃ£o fornecida]'}

CONTEXTO COMPLETO (cockpitSnapshot):
${snapshotText || '[nÃ£o fornecido]'}

REGRAS:
1) PortuguÃªs do Brasil, natural e humano. Evite jargÃ£o e evite rÃ³tulos tipo "Contexto:"/"Sobre:".
2) Use o contexto para personalizar (nome, deal, etapa, prÃ³ximos passos), mas NÃƒO invente fatos.
3) Para WHATSAPP: curto, direto e MUITO legÃ­vel no WhatsApp. Use quebras de linha (parÃ¡grafos) e, quando houver opÃ§Ãµes, use lista com marcadores no formato "- item" (hÃ­fen + espaÃ§o). Evite parÃ¡grafos longos. 3â€“10 linhas.
4) Para EMAIL: devolva subject + body (message = body). Aplique boas prÃ¡ticas de email de vendas/CRM:
   - Assunto curto e especÃ­fico (<= 80), sem ALL CAPS e sem "RE:" falso.
   - Corpo SEMPRE bem escaneÃ¡vel: parÃ¡grafos curtos (1â€“2 frases), com linhas em branco entre blocos.
   - Estrutura sugerida (adapte ao contexto):
     a) SaudaÃ§Ã£o breve (use o nome se tiver certeza).
     b) 1 frase de contexto (por que estÃ¡ falando agora).
     c) 1â€“2 bullets com valor/objetivo ou prÃ³ximos passos (use "- ").
     d) CTA claro e simples (uma pergunta) e, se houver opÃ§Ãµes de agenda, liste em bullets ("- segunda 10h", "- terÃ§a 15h").
     e) Fechamento curto (ex.: "Obrigado!"), sem assinatura com dados pessoais.
   - Evite bloco Ãºnico de texto: NÃƒO devolva tudo em um parÃ¡grafo.
   - Tamanho: 6â€“16 linhas no total (incluindo linhas em branco).
5) NÃ£o inclua placeholders (tipo "[nome]") e nÃ£o inclua assinatura com dados pessoais.

Retorne APENAS no formato do schema (subject opcional, message obrigatÃ³rio).`,
        });

        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateRescueMessage': {
        const { deal, channel } = data as any;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Gere uma mensagem de resgate/follow-up para reativar um deal parado.
DEAL: ${deal?.title} (${deal?.contactName || ''})
CANAL: ${channel}
Responda em portuguÃªs do Brasil.`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateBoardStructure': {
        const { description, lifecycleStages } = data as any;
        const lifecycleList =
          Array.isArray(lifecycleStages) && lifecycleStages.length > 0
            ? lifecycleStages.map((s: any) => ({ id: s?.id || '', name: s?.name || String(s) }))
            : [
                { id: 'LEAD', name: 'Lead' },
                { id: 'MQL', name: 'MQL' },
                { id: 'PROSPECT', name: 'Oportunidade' },
                { id: 'CUSTOMER', name: 'Cliente' },
                { id: 'OTHER', name: 'Outros' },
              ];

        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_boards_generate_structure');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          description,
          lifecycleJson: JSON.stringify(lifecycleList),
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: BoardStructureSchema,
          prompt,
        });

        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateBoardStrategy': {
        const { boardData } = data as any;
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_boards_generate_strategy');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          boardName: boardData?.boardName || '',
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: BoardStrategySchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'refineBoardWithAI': {
        const { currentBoard, userInstruction, chatHistory } = data as any;
        const historyContext = chatHistory ? `\nHistÃ³rico:\n${JSON.stringify(chatHistory)}` : '';
        const boardContext = currentBoard
          ? `\nBoard atual (JSON):\n${JSON.stringify(currentBoard)}`
          : '';
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_boards_refine');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          userInstruction,
          boardContext,
          historyContext,
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: RefineBoardSchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateObjectionResponse': {
        const { deal, objection } = data as any;
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_deals_objection_responses');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          objection,
          dealTitle: deal?.title || '',
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: ObjectionResponseSchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'parseNaturalLanguageAction': {
        const { text } = data as any;
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: ParsedActionSchema,
          prompt: `Parse para CRM Action: "${text}".
Campos: title, type (CALL/MEETING/EMAIL/TASK), date, contactName, companyName, confidence.`,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'chatWithCRM': {
        const { message, context } = data as any;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Assistente CRM.
Contexto: ${JSON.stringify(context)}
UsuÃ¡rio: ${message}
Responda em portuguÃªs.`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateBirthdayMessage': {
        const { contactName, age } = data as any;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `ParabÃ©ns para ${contactName} (${age || ''} anos). Curto e profissional.`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateDailyBriefing': {
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_inbox_daily_briefing');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          dataJson: JSON.stringify(data),
        });
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'chatWithBoardAgent': {
        const { message, boardContext } = data as any;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Persona: ${boardContext?.agentName}. Contexto: ${JSON.stringify(boardContext)}. Msg: ${message}`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateSalesScript': {
        const { deal, scriptType, context } = data as any;
        const resolved = await getResolvedPrompt(supabase as any, profile.organization_id as any, 'task_inbox_sales_script');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          scriptType: scriptType || 'geral',
          dealTitle: deal?.title || '',
          context: context || '',
        });
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt,
        });
        return json<AIActionResponse>({ result: { script: result.text, scriptType, generatedFor: deal?.title } });
      }

      default: {
        const exhaustive: never = action;
        return json<AIActionResponse>({ error: `Unknown action: ${exhaustive}` }, 200);
      }
    }
  } catch (err: any) {
    console.error('[api/ai/actions] Error:', err);
    return json<AIActionResponse>({ error: err?.message || 'Internal Server Error' }, 200);
  }
}
