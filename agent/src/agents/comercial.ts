import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { loadHistory, saveMessage } from '../services/history.js';
import { buildSystemPrompt, getTemporalContext } from '../prompts/system.js';
import { consultarBaseImoveis } from '../tools/imoveis.js';
import { criarOuAtualizarLead, buscarLead } from '../tools/crm.js';
import { acionarHumano } from '../tools/humano.js';

export interface AgentInput {
  sessionId: string;
  whatsappId: string;
  leadNome: string;
  message: string;
}

export async function runComercialAgent(input: AgentInput): Promise<string> {
  const { sessionId, whatsappId, leadNome, message } = input;

  // Carregar histórico (janela de 10 mensagens para o modelo)
  const history = await loadHistory(sessionId);

  const temporal = getTemporalContext();

  const systemPrompt = buildSystemPrompt({
    leadNome: leadNome || 'visitante',
    saudacao: temporal.saudacao,
    diaSemana: temporal.diaSemana,
    horaAtual: temporal.horaAtual,
    dataCompleta: temporal.dataCompleta,
    statusAgente: 'DISPONÍVEL 24/7',
  });

  // Injeta contexto no whatsappId e sessionId para as tools via closure
  // Workaround para passar contexto sem alterar a interface do Vercel AI SDK
  const toolContext = { whatsappId, sessionId };

  const toolsWithContext = {
    consultarBaseImoveis: patchToolContext(consultarBaseImoveis, toolContext),
    criarOuAtualizarLead: patchToolContext(criarOuAtualizarLead, toolContext),
    buscarLead,
    acionarHumano: patchToolContext(acionarHumano, toolContext),
  };

  // Salva ANTES de chamar o agente — histórico já carregado não inclui esta mensagem
  await saveMessage(sessionId, 'user', message);

  // Monta o array de mensagens: histórico anterior + mensagem atual
  const messagesForLLM = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  console.log(`[agent] sessionId=${sessionId} historyLen=${history.length} msg="${message.slice(0,60)}"`);

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: messagesForLLM,
      tools: toolsWithContext,
      maxSteps: 10,
      temperature: 0.2,
      maxTokens: 3000,
    });

    // Salvar resposta do assistente
    await saveMessage(sessionId, 'assistant', text);

    return text;
  } catch (err) {
    console.error('[agent] Erro no generateText:', err);
    return 'Desculpe, estou com dificuldades técnicas no momento. O Max entrará em contato em breve.';
  }
}

// Injeta contexto no toolCallId para que as tools possam acessar whatsappId e sessionId
function patchToolContext<T extends { execute: Function }>(
  originalTool: T,
  ctx: { whatsappId: string; sessionId: string }
): T {
  return {
    ...originalTool,
    execute: async (params: unknown, options: { toolCallId?: string }) => {
      const patchedOptions = {
        ...options,
        toolCallId: Object.assign(options?.toolCallId ?? '', ctx),
      };
      return originalTool.execute(params, patchedOptions);
    },
  };
}
