/**
 * Prompt Builder
 *
 * Constrói system prompt dinâmico baseado na configuração do agente
 */

import { AgentConfig } from './agent-config-loader';

export function buildSystemPrompt(
  config: AgentConfig,
  leadName: string,
  leadPhone: string,
  additionalContext: string = ''
): string {
  const communicationGuide = getCommunicationGuide(config.communicationStyle);
  const signature = config.signWithName ? `\n\nAssine suas respostas com: "${config.agentName}"` : '';
  const emojisGuide = config.useEmojis ? '\nUse emojis estrategicamente para tornar a resposta mais amigável.' : '';
  const topicRestriction = config.restrictTopics ? '\n⚠️ RESTRIÇÃO: Responda APENAS sobre os tópicos permitidos pelo agente. Se perguntarem sobre outros assuntos, desvie gentilmente.' : '';
  const reminders = config.allowReminders ? '\nVocê pode oferecer ao usuário a opção de registrar lembretes (ex: "Quer que eu anote um lembrete disso?").' : '';

  const basePrompt = `# Instruções de Sistema - Agente: ${config.agentName}

## Identidade
Você é o agente de suporte "${config.agentName}", assistindo ${leadName} (${leadPhone}).

## Estilo de Comunicação
${communicationGuide}

## Comportamento
- Responda APENAS o que foi perguntado
- Não elabore desnecessariamente
- Seja conciso e direto
- Máximo ${config.maxTokens} caracteres por resposta
${emojisGuide}${signature}${topicRestriction}${reminders}

## Contexto do Lead
- Nome: ${leadName}
- Telefone: ${leadPhone}
${additionalContext ? `\n## Contexto Adicional\n${additionalContext}` : ''}

## ⚠️ INSTRUÇÃO CRÍTICA
RESPONDA APENAS O PERGUNTADO. Não crie conteúdo adicional. Se perguntarem "Qual é o preço?", responda apenas o preço. Se perguntarem "Tem piscina?", responda sim/não + detalhe breve.`;

  // Usar custom prompt se fornecido
  if (config.customSystemPrompt) {
    return `${config.customSystemPrompt}\n\n---\n\n${basePrompt}`;
  }

  return basePrompt;
}

function getCommunicationGuide(style: 'formal' | 'casual' | 'normal'): string {
  switch (style) {
    case 'formal':
      return `Use linguagem formal e profissional.
- Trate o cliente com respeito e formalidade
- Use "você" e "senhor/senhora" quando apropriado
- Evite contrações e gírias
- Mantenha tom corporativo`;

    case 'casual':
      return `Use linguagem amigável e descontraída.
- Seja conversível e amigável
- Use contrações naturais ("tá bom", "beleza")
- Pode usar gírias leves
- Mantenha tom de amizade`;

    case 'normal':
    default:
      return `Use linguagem clara e natural.
- Seja profissional mas acessível
- Use tom conversível mas respeitoso
- Equilíbrio entre formalidade e amizade
- Claro e direto`;
  }
}

/**
 * Formata a resposta do modelo baseado em config
 */
export function formatResponse(responseText: string, config: AgentConfig): string {
  let formatted = responseText;

  // Truncar se exceder maxTokens
  if (formatted.length > config.maxTokens) {
    const truncated = formatted.substring(0, config.maxTokens);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > config.maxTokens * 0.8) {
      formatted = truncated.substring(0, lastPeriod + 1);
    } else {
      formatted = truncated + '...';
    }
  }

  // Adicionar assinatura se configurado
  if (config.signWithName) {
    formatted = `${formatted}\n\n${config.agentName}`;
  }

  return formatted.trim();
}

/**
 * Cria mensagem para transferência para humano
 */
export function createHumanTransferMessage(config: AgentConfig, leadName: string): string {
  return `${leadName}, vou transferir você para um agente humano que poderá ajudar melhor. Um momento...`;
}

/**
 * Cria mensagem de encerramento
 */
export function createTerminationMessage(config: AgentConfig): string {
  return `Obrigado por usar nosso suporte. Até a próxima!`;
}
