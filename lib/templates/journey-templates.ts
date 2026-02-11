import { JourneyDefinition } from '@/types';
import { BOARD_TEMPLATES } from '@/lib/templates/board-templates';

export const OFFICIAL_JOURNEYS: Record<
  string,
  JourneyDefinition & { id: string; description: string; icon: string }
> = {
  INFOPRODUCER: {
    id: 'INFOPRODUCER',
    schemaVersion: '1.0',
    name: 'Infoprodutor (Completo)',
    description:
      'Playbook alinhado ao mercado para infoprodutos: CaptaÃ§Ã£o, Vendas, Onboarding do aluno, CS (SaÃºde) e Upsell (ExpansÃ£o).',
    icon: 'ðŸŽ“',
    boards: [
      {
        slug: 'sdr',
        name: '1. CaptaÃ§Ã£o / Leads',
        columns: [
          { name: 'Novos Leads', color: 'bg-blue-500', linkedLifecycleStage: 'LEAD' },
          { name: 'Contatado', color: 'bg-yellow-500', linkedLifecycleStage: 'LEAD' },
          { name: 'Qualificando', color: 'bg-purple-500', linkedLifecycleStage: 'LEAD' },
          { name: 'Qualificado (MQL)', color: 'bg-green-500', linkedLifecycleStage: 'MQL' },
        ],
        strategy: {
          agentPersona: {
            name: 'Closer de DM',
            role: 'CaptaÃ§Ã£o e QualificaÃ§Ã£o',
            behavior:
              'Seja rÃ¡pido e prÃ¡tico. Identifique intenÃ§Ã£o, timing e fit. Direcione para a oferta certa e elimine fricÃ§Ã£o para avanÃ§ar.',
          },
          goal: {
            description: 'Aumentar MQLs qualificados a partir de leads.',
            kpi: 'MQLs',
            targetValue: '100',
            type: 'number',
          },
          entryTrigger: 'Leads vindos de ads, orgÃ¢nico, direct, WhatsApp ou pÃ¡gina de captura.',
        },
      },
      {
        slug: 'sales',
        name: '2. Vendas (Oferta / Turma)',
        columns: [
          { name: 'Descoberta', color: 'bg-blue-500', linkedLifecycleStage: 'MQL' },
          { name: 'Proposta', color: 'bg-purple-500', linkedLifecycleStage: 'PROSPECT' },
          { name: 'NegociaÃ§Ã£o', color: 'bg-orange-500', linkedLifecycleStage: 'PROSPECT' },
          { name: 'Matriculado (Ganho)', color: 'bg-green-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'NÃ£o comprou (Perdido)', color: 'bg-red-500', linkedLifecycleStage: 'OTHER' },
        ],
        strategy: {
          agentPersona: {
            name: 'Closer',
            role: 'Fechamento',
            behavior:
              'Venda consultiva e objetiva. Foque em clareza da transformaÃ§Ã£o, prova, urgÃªncia e remoÃ§Ã£o de objeÃ§Ãµes. Sem enrolaÃ§Ã£o.',
          },
          goal: {
            description: 'Maximizar conversÃ£o de MQL â†’ Matriculado.',
            kpi: 'ConversÃ£o',
            targetValue: '25',
            type: 'percentage',
          },
          entryTrigger: 'Leads qualificados que demonstraram intenÃ§Ã£o de compra.',
        },
      },
      {
        slug: 'onboarding',
        name: '3. Onboarding do Aluno (AtivaÃ§Ã£o)',
        columns: [
          { name: 'Boas-vindas', color: 'bg-blue-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Setup (Acessos)', color: 'bg-purple-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Primeira Entrega', color: 'bg-yellow-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Primeiro Resultado (Ganho)', color: 'bg-green-500', linkedLifecycleStage: 'CUSTOMER' },
        ],
        strategy: {
          agentPersona: {
            name: 'CS Educacional',
            role: 'AtivaÃ§Ã£o e RetenÃ§Ã£o Inicial',
            behavior:
              'Seja didÃ¡tico e acolhedor. Garanta que o aluno complete o setup e tenha o primeiro resultado rÃ¡pido. Reduza abandono e reembolso.',
          },
          goal: {
            description: 'Garantir ativaÃ§Ã£o rÃ¡pida (primeiro resultado) e reduzir abandono.',
            kpi: 'AtivaÃ§Ã£o',
            targetValue: '70',
            type: 'percentage',
          },
          entryTrigger: 'Alunos matriculados na oferta/turma.',
        },
      },
      {
        slug: 'cs',
        name: '4. CS (SaÃºde do Aluno)',
        columns: BOARD_TEMPLATES.CS.stages.map(s => ({
          name: s.label,
          color: s.color,
          linkedLifecycleStage: s.linkedLifecycleStage,
        })),
        strategy: {
          agentPersona: BOARD_TEMPLATES.CS.agentPersona,
          goal: BOARD_TEMPLATES.CS.goal,
          entryTrigger: BOARD_TEMPLATES.CS.entryTrigger,
        },
      },
      {
        slug: 'expansion',
        name: '5. Upsell (ExpansÃ£o)',
        columns: [
          { name: 'Identificado', color: 'bg-blue-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Qualificando', color: 'bg-yellow-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Proposta', color: 'bg-purple-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'NegociaÃ§Ã£o', color: 'bg-orange-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Upsell Fechado (Ganho)', color: 'bg-green-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Perdido', color: 'bg-red-500', linkedLifecycleStage: 'OTHER' },
        ],
        strategy: {
          agentPersona: {
            name: 'Closer de Upsell',
            role: 'ExpansÃ£o / Upgrade',
            behavior:
              'OfereÃ§a o prÃ³ximo passo certo (mentoria, high ticket, upgrade). Baseie-se em sinais de engajamento e resultados obtidos.',
          },
          goal: {
            description: 'Gerar receita de expansÃ£o (LTV).',
            kpi: 'Expansion MRR',
            targetValue: '15000',
            type: 'currency',
          },
          entryTrigger: 'Alunos saudÃ¡veis com sinais de evoluÃ§Ã£o e pedido de â€œprÃ³ximo passoâ€.',
        },
      },
    ],
  },
  B2B_MACHINE: {
    id: 'B2B_MACHINE',
    schemaVersion: '1.0',
    name: 'MÃ¡quina de Vendas B2B (Completa)',
    description:
      'O setup ideal para empresas SaaS. Inclui PrÃ©-vendas (SDR), Vendas (Closer), Onboarding, CS (SaÃºde) e ExpansÃ£o (Upsell).',
    icon: 'ðŸ­',
    boards: [
      {
        slug: 'sdr',
        name: '1. PrÃ©-vendas (SDR)',
        columns: BOARD_TEMPLATES.PRE_SALES.stages.map(s => ({
          name: s.label,
          color: s.color,
          linkedLifecycleStage: s.linkedLifecycleStage,
        })),
        strategy: {
          agentPersona: BOARD_TEMPLATES.PRE_SALES.agentPersona,
          goal: BOARD_TEMPLATES.PRE_SALES.goal,
          entryTrigger: BOARD_TEMPLATES.PRE_SALES.entryTrigger,
        },
      },
      {
        slug: 'sales',
        name: '2. Pipeline de Vendas',
        columns: BOARD_TEMPLATES.SALES.stages.map(s => ({
          name: s.label,
          color: s.color,
          linkedLifecycleStage: s.linkedLifecycleStage,
        })),
        strategy: {
          agentPersona: BOARD_TEMPLATES.SALES.agentPersona,
          goal: BOARD_TEMPLATES.SALES.goal,
          entryTrigger: BOARD_TEMPLATES.SALES.entryTrigger,
        },
      },
      {
        slug: 'onboarding',
        name: '3. Onboarding',
        columns: BOARD_TEMPLATES.ONBOARDING.stages.map(s => ({
          name: s.label,
          color: s.color,
          linkedLifecycleStage: s.linkedLifecycleStage,
        })),
        strategy: {
          agentPersona: BOARD_TEMPLATES.ONBOARDING.agentPersona,
          goal: BOARD_TEMPLATES.ONBOARDING.goal,
          entryTrigger: BOARD_TEMPLATES.ONBOARDING.entryTrigger,
        },
      },
      {
        slug: 'cs',
        name: '4. CS (SaÃºde da Conta)',
        columns: BOARD_TEMPLATES.CS.stages.map(s => ({
          name: s.label,
          color: s.color,
          linkedLifecycleStage: s.linkedLifecycleStage,
        })),
        strategy: {
          agentPersona: BOARD_TEMPLATES.CS.agentPersona,
          goal: BOARD_TEMPLATES.CS.goal,
          entryTrigger: BOARD_TEMPLATES.CS.entryTrigger,
        },
      },
      {
        slug: 'expansion',
        name: '5. ExpansÃ£o (Upsell)',
        columns: [
          { name: 'Identificado', color: 'bg-blue-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Qualificando', color: 'bg-yellow-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Proposta', color: 'bg-purple-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'NegociaÃ§Ã£o', color: 'bg-orange-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Upsell Fechado', color: 'bg-green-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Perdido', color: 'bg-red-500', linkedLifecycleStage: 'OTHER' },
        ],
        strategy: {
          agentPersona: {
            name: 'Expansion AM',
            role: 'ExpansÃ£o / Upsell',
            behavior:
              'Trate expansÃ£o como venda consultiva para clientes ativos. Valide uso/valor, descubra novas dores e construa business case. Seja objetivo e pragmÃ¡tico.',
          },
          goal: {
            description: 'Gerar receita de expansÃ£o com previsibilidade.',
            kpi: 'Expansion MRR',
            targetValue: '15000',
            type: 'currency',
          },
          entryTrigger: 'Clientes saudÃ¡veis com sinais de expansÃ£o (uso alto, novas squads, request de features).',
        },
      },
    ],
  },
  SIMPLE_SALES: {
    id: 'SIMPLE_SALES',
    schemaVersion: '1.0',
    name: 'Funil de Vendas Simples',
    description: 'Perfeito para comeÃ§ar. Um Ãºnico board focado em fechar negÃ³cios rapidamente.',
    icon: 'âš¡',
    boards: [
      {
        slug: 'sales-simple',
        name: 'Pipeline de Vendas',
        // UX: simplest possible sales pipeline (popular labels).
        columns: [
          { name: 'Novo', color: 'bg-blue-500', linkedLifecycleStage: 'MQL' },
          { name: 'Em conversa', color: 'bg-yellow-500', linkedLifecycleStage: 'PROSPECT' },
          { name: 'Proposta', color: 'bg-purple-500', linkedLifecycleStage: 'PROSPECT' },
          { name: 'Ganho', color: 'bg-green-500', linkedLifecycleStage: 'CUSTOMER' },
          { name: 'Perdido', color: 'bg-red-500', linkedLifecycleStage: 'OTHER' },
        ],
        strategy: {
          agentPersona: BOARD_TEMPLATES.SALES.agentPersona,
          goal: BOARD_TEMPLATES.SALES.goal,
          entryTrigger: BOARD_TEMPLATES.SALES.entryTrigger,
        },
      },
    ],
  },
};
