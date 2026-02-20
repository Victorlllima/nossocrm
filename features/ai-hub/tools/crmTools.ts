import { tool } from 'ai';
import { z } from 'zod';

// ============================================
// TOOLS DE LEITURA (Consulta de dados)
// ============================================

export const searchDeals = tool({
  description: 'Busca deals/oportunidades no CRM por tÃ­tulo, status, valor ou tags',
  parameters: z.object({
    query: z.string().optional().describe('Texto para buscar no tÃ­tulo do deal'),
    status: z.string().optional().describe('Status do deal (ex: LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST)'),
    minValue: z.number().optional().describe('Valor mÃ­nimo do deal'),
    maxValue: z.number().optional().describe('Valor mÃ¡ximo do deal'),
    limit: z.number().default(10).describe('NÃºmero mÃ¡ximo de resultados'),
  }),
});

export const getContact = tool({
  description: 'Busca informaÃ§Ãµes de um contato especÃ­fico por nome ou email',
  parameters: z.object({
    query: z.string().describe('Nome ou email do contato para buscar'),
  }),
});

export const getActivitiesToday = tool({
  description: 'Retorna as atividades de hoje (reuniÃµes, ligaÃ§Ãµes, tarefas)',
  parameters: z.object({
    includeCompleted: z.boolean().default(false).describe('Incluir atividades jÃ¡ concluÃ­das'),
  }),
});

export const getOverdueActivities = tool({
  description: 'Retorna atividades atrasadas que precisam de atenÃ§Ã£o',
  parameters: z.object({
    limit: z.number().default(5).describe('NÃºmero mÃ¡ximo de resultados'),
  }),
});

export const getPipelineStats = tool({
  description: 'Retorna estatÃ­sticas do pipeline: total de deals, valor total, taxa de conversÃ£o',
  parameters: z.object({}),
});

export const getDealDetails = tool({
  description: 'Retorna detalhes completos de um deal especÃ­fico',
  parameters: z.object({
    dealId: z.string().describe('ID do deal'),
  }),
});

// ============================================
// TOOLS DE ESCRITA (AÃ§Ãµes no CRM)
// ============================================

export const createActivity = tool({
  description: 'Cria uma nova atividade (reuniÃ£o, ligaÃ§Ã£o, tarefa, email)',
  parameters: z.object({
    title: z.string().describe('TÃ­tulo da atividade'),
    type: z.enum(['MEETING', 'CALL', 'TASK', 'EMAIL']).describe('Tipo da atividade'),
    date: z.string().describe('Data e hora no formato ISO (ex: 2025-12-01T14:00:00)'),
    description: z.string().optional().describe('DescriÃ§Ã£o ou notas'),
    contactName: z.string().optional().describe('Nome do contato relacionado'),
    dealTitle: z.string().optional().describe('TÃ­tulo do deal relacionado'),
  }),
});

export const completeActivity = tool({
  description: 'Marca uma atividade como concluÃ­da',
  parameters: z.object({
    activityId: z.string().describe('ID da atividade'),
  }),
});

export const moveDeal = tool({
  description: 'Move um deal para outro estÃ¡gio do pipeline',
  parameters: z.object({
    dealId: z.string().describe('ID do deal'),
    newStatus: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'])
      .describe('Novo status/estÃ¡gio do deal'),
  }),
});

export const updateDealValue = tool({
  description: 'Atualiza o valor de um deal',
  parameters: z.object({
    dealId: z.string().describe('ID do deal'),
    newValue: z.number().describe('Novo valor do deal'),
  }),
});

export const createDeal = tool({
  description: 'Cria um novo deal/oportunidade no pipeline',
  parameters: z.object({
    title: z.string().describe('TÃ­tulo do deal'),
    value: z.number().describe('Valor estimado'),
    contactName: z.string().optional().describe('Nome do contato principal'),
    companyName: z.string().optional().describe('Nome da empresa'),
    description: z.string().optional().describe('DescriÃ§Ã£o do deal'),
  }),
});

// ============================================
// TOOLS DE ANÃLISE (Insights)
// ============================================

export const analyzeStagnantDeals = tool({
  description: 'Analisa deals que estÃ£o parados hÃ¡ muito tempo e precisam de atenÃ§Ã£o',
  parameters: z.object({
    daysStagnant: z.number().default(7).describe('NÃºmero de dias sem atualizaÃ§Ã£o'),
  }),
});

export const suggestNextAction = tool({
  description: 'Sugere a prÃ³xima melhor aÃ§Ã£o para um deal especÃ­fico',
  parameters: z.object({
    dealId: z.string().describe('ID do deal para analisar'),
  }),
});

// Exporta todos os tools agrupados
export const crmTools = {
  // Leitura
  searchDeals,
  getContact,
  getActivitiesToday,
  getOverdueActivities,
  getPipelineStats,
  getDealDetails,
  // Escrita
  createActivity,
  completeActivity,
  moveDeal,
  updateDealValue,
  createDeal,
  // AnÃ¡lise
  analyzeStagnantDeals,
  suggestNextAction,
};
