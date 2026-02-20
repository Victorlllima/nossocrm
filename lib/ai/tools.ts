import { tool } from 'ai';
import { z } from 'zod';
import { createStaticAdminClient } from '@/lib/supabase/staticAdminClient';
import type { CRMCallOptions } from '@/types/ai';

const crmTool = (config: any) => tool(config);

/**
 * Creates all CRM tools with context injection
 * Context is provided at runtime via the agent's callOptionsSchema
 * 
 * NOTE: Uses createStaticAdminClient (service role, no cookies) to bypass RLS
 * because async AI agent context doesn't have access to request cookies.
 */
export function createCRMTools(context: CRMCallOptions, userId: string) {
    // Initialize supabase admin client directly (no async, no cookies needed)
    const supabase = createStaticAdminClient();
    const organizationId = context.organizationId;

    // Em UI normal, aÃ§Ãµes sÃ£o gateadas por um card de Aprovar/Negar.
    // Em scripts/CI (sem UI), isso pode impedir a execuÃ§Ã£o real das tools.
    // Use AI_TOOL_APPROVAL_BYPASS=true para permitir execuÃ§Ã£o direta (somente dev/test).
    const bypassApproval = process.env.AI_TOOL_APPROVAL_BYPASS === 'true';

    const formatSupabaseFailure = (error: any) => {
        const msg = (error?.message || error?.error_description || String(error || '')).trim();
        const normalized = msg.toLowerCase();

        // Mensagens comuns quando a service role key estÃ¡ ausente/errada ou nÃ£o bate com a URL.
        const looksLikeAuth =
            normalized.includes('jwt') ||
            normalized.includes('invalid api key') ||
            normalized.includes('apikey') ||
            normalized.includes('permission denied') ||
            normalized.includes('unauthorized') ||
            normalized.includes('forbidden');

        const hint = looksLikeAuth
            ? ' Dica: verifique se `SUPABASE_SERVICE_ROLE_KEY` estÃ¡ configurada e corresponde ao mesmo projeto do `NEXT_PUBLIC_SUPABASE_URL`.'
            : '';

        return `Falha ao consultar o Supabase. ${msg || 'Erro desconhecido.'}${hint}`;
    };

    const ensureBoardBelongsToOrganization = async (boardId: string) => {
        const { data: board, error: boardError } = await supabase
            .from('boards')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('id', boardId)
            .maybeSingle();

        if (boardError) {
            return { ok: false as const, error: formatSupabaseFailure(boardError) };
        }

        if (!board) {
            return {
                ok: false as const,
                error:
                    'O board selecionado nÃ£o pertence Ã  sua organizaÃ§Ã£o no backend da IA. Se vocÃª acabou de trocar de organizaÃ§Ã£o/board, recarregue a pÃ¡gina. Se persistir, verifique se a IA estÃ¡ apontando para o mesmo projeto Supabase do app.'
            };
        }

        return { ok: true as const };
    };

    const ensureDealBelongsToOrganization = async (dealId: string) => {
        const { data: deal, error: dealError } = await supabase
            .from('deals')
            .select('id, title, board_id, stage_id, contact_id')
            .eq('organization_id', organizationId)
            .eq('id', dealId)
            .maybeSingle();

        if (dealError) {
            return { ok: false as const, error: formatSupabaseFailure(dealError) };
        }

        if (!deal) {
            return { ok: false as const, error: 'Deal nÃ£o encontrado nesta organizaÃ§Ã£o.' };
        }

        return { ok: true as const, deal };
    };

    const resolveStageIdForBoard = async (params: {
        boardId: string;
        stageId?: string;
        stageName?: string;
    }) => {
        if (params.stageId) return { ok: true as const, stageId: params.stageId };

        const stageName = (params.stageName || '').trim();
        if (!stageName) {
            return { ok: false as const, error: 'Especifique o estÃ¡gio destino.' };
        }

        // â€œprimeiro estÃ¡gioâ€ / â€œÃºltimo estÃ¡gioâ€ (atalhos Ãºteis)
        const lowered = stageName.toLowerCase();
        if (/(primeiro|in[Ã­i]cio|inicial)/.test(lowered)) {
            const { data: first, error } = await supabase
                .from('board_stages')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('board_id', params.boardId)
                .order('order', { ascending: true })
                .limit(1)
                .maybeSingle();
            if (error) return { ok: false as const, error: formatSupabaseFailure(error) };
            if (!first?.id) return { ok: false as const, error: 'Board nÃ£o tem estÃ¡gios configurados.' };
            return { ok: true as const, stageId: first.id };
        }

        if (/(u[Ãºu]ltimo|final)/.test(lowered)) {
            const { data: last, error } = await supabase
                .from('board_stages')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('board_id', params.boardId)
                .order('order', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) return { ok: false as const, error: formatSupabaseFailure(error) };
            if (!last?.id) return { ok: false as const, error: 'Board nÃ£o tem estÃ¡gios configurados.' };
            return { ok: true as const, stageId: last.id };
        }

        const { data: stages, error } = await supabase
            .from('board_stages')
            .select('id, name, label')
            .eq('organization_id', organizationId)
            .eq('board_id', params.boardId)
            .or(`name.ilike.%${stageName}%,label.ilike.%${stageName}%`)
            .limit(5);

        if (error) return { ok: false as const, error: formatSupabaseFailure(error) };
        if (!stages || stages.length === 0) {
            const { data: allStages } = await supabase
                .from('board_stages')
                .select('name, label')
                .eq('organization_id', organizationId)
                .eq('board_id', params.boardId);

            const stageNames = allStages?.map((s) => s.name || s.label).filter(Boolean).join(', ') || 'nenhum';
            return { ok: false as const, error: `EstÃ¡gio "${stageName}" nÃ£o encontrado. EstÃ¡gios disponÃ­veis: ${stageNames}` };
        }

        if (stages.length > 1) {
            const opts = stages.map((s) => s.name || s.label || s.id).join(', ');
            return { ok: false as const, error: `EstÃ¡gio "${stageName}" estÃ¡ ambÃ­guo. PossÃ­veis: ${opts}` };
        }

        return { ok: true as const, stageId: stages[0].id };
    };

    const tools = {
        // ============= ANÃLISE =============
        analyzePipeline: crmTool({
            description: 'Analisa o pipeline de vendas completo com mÃ©tricas e breakdown por estÃ¡gio',
            parameters: z.object({
                boardId: z.string().optional().describe('ID do board (usa contexto se nÃ£o fornecido)'),
            }),
            execute: async ({ boardId }) => {
                // supabase is already initialized
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] ðŸš€ analyzePipeline EXECUTED!', { targetBoardId });

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado. VÃ¡ para um board ou especifique qual.' };
                }

                const { data: deals } = await supabase
                    .from('deals')
                    .select('id, title, value, is_won, is_lost, stage:board_stages(name, label)')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId);

                const openDeals = deals?.filter(d => !d.is_won && !d.is_lost) || [];
                const wonDeals = deals?.filter(d => d.is_won) || [];
                const lostDeals = deals?.filter(d => d.is_lost) || [];

                const totalValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                const winRate = wonDeals.length + lostDeals.length > 0
                    ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100)
                    : 0;

                // Agrupar por estÃ¡gio
                const stageMap = new Map<string, { count: number; value: number }>();
                openDeals.forEach((deal: any) => {
                    const stageName = deal.stage?.name || deal.stage?.label || 'Sem estÃ¡gio';
                    const existing = stageMap.get(stageName) || { count: 0, value: 0 };
                    stageMap.set(stageName, {
                        count: existing.count + 1,
                        value: existing.value + (deal.value || 0)
                    });
                });

                return {
                    totalDeals: deals?.length || 0,
                    openDeals: openDeals.length,
                    wonDeals: wonDeals.length,
                    lostDeals: lostDeals.length,
                    winRate: `${winRate}%`,
                    pipelineValue: `R$ ${totalValue.toLocaleString('pt-BR')}`,
                    wonValue: `R$ ${wonValue.toLocaleString('pt-BR')}`,
                    stageBreakdown: Object.fromEntries(stageMap)
                };
            },
        }),

        getBoardMetrics: crmTool({
            description: 'Calcula mÃ©tricas e KPIs do board: Win Rate, Total Pipeline, contagem de deals',
            parameters: z.object({
                boardId: z.string().optional(),
            }),
            execute: async ({ boardId }) => {
                // supabase is already initialized
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] ðŸ“Š getBoardMetrics EXECUTED!');

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const { data: deals } = await supabase
                    .from('deals')
                    .select('id, value, is_won, is_lost, created_at')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId);

                const total = deals?.length || 0;
                const won = deals?.filter(d => d.is_won) || [];
                const lost = deals?.filter(d => d.is_lost) || [];
                const open = deals?.filter(d => !d.is_won && !d.is_lost) || [];

                const winRate = won.length + lost.length > 0
                    ? Math.round(won.length / (won.length + lost.length) * 100)
                    : 0;

                return {
                    totalDeals: total,
                    openDeals: open.length,
                    wonDeals: won.length,
                    lostDeals: lost.length,
                    winRate: `${winRate}%`,
                    pipelineValue: `R$ ${open.reduce((s, d) => s + (d.value || 0), 0).toLocaleString('pt-BR')}`,
                    closedValue: `R$ ${won.reduce((s, d) => s + (d.value || 0), 0).toLocaleString('pt-BR')}`
                };
            },
        }),

        // ============= BUSCA =============
        searchDeals: crmTool({
            description: 'Busca deals por tÃ­tulo',
            parameters: z.object({
                query: z.string().describe('Termo de busca'),
                limit: z.number().optional().default(5),
            }),
            execute: async ({ query, limit }) => {
                // supabase is already initialized
                const cleanedQuery = String(query)
                    .trim()
                    // remove aspas comuns no inÃ­cio/fim (modelo costuma mandar "Nike")
                    .replace(/^["'â€œâ€â€˜â€™]+/, '')
                    .replace(/["'â€œâ€â€˜â€™]+$/, '')
                    .trim();

                // Normalize pontuaÃ§Ã£o e remova palavras â€œdecorativasâ€ que o modelo costuma incluir
                // (ex.: "buscar deal Nike"), para evitar falso negativo.
                const normalizedQuery = cleanedQuery
                    // troca pontuaÃ§Ãµes por espaÃ§o
                    .replace(/[^\p{L}\p{N}\s.-]+/gu, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const strippedQuery = normalizedQuery
                    .replace(/\b(buscar|busque|procure|procurar|encontre|encontrar|mostrar|liste|listar|deal|deals|neg[oÃ³]cio|neg[oÃ³]cios|oportunidade|oportunidades|card|cards)\b/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const effectiveQuery = strippedQuery || normalizedQuery;

                console.log('[AI] ðŸ” searchDeals EXECUTED!', { query, cleanedQuery, effectiveQuery });

                if (!effectiveQuery) {
                    return { error: 'Informe um termo de busca.' };
                }

                let queryBuilder = supabase
                    .from('deals')
                    .select('id, title, value, is_won, is_lost, stage:board_stages(name, label), contact:contacts(name)')
                    .limit(limit);

                const terms = effectiveQuery
                    .split(' ')
                    .map((t) => t.trim())
                    .filter(Boolean);

                if (terms.length <= 1) {
                    queryBuilder = queryBuilder.ilike('title', `%${effectiveQuery}%`);
                } else {
                    // OR: title contÃ©m qualquer termo (mais robusto do que exigir a frase inteira)
                    // Ex.: "deal Nike" -> encontra "Nike"
                    queryBuilder = queryBuilder.or(
                        terms.map((t) => `title.ilike.%${t}%`).join(',')
                    );
                }

                if (context.boardId) {
                    // SeguranÃ§a: sÃ³ permite consultar por board_id se o board for do mesmo tenant.
                    const guard = await ensureBoardBelongsToOrganization(context.boardId);
                    if (!guard.ok) return { error: guard.error };

                    // Compat: inclui deals legados que ficaram com organization_id NULL.
                    // Como o board jÃ¡ foi validado no tenant, isso nÃ£o vaza dados.
                    queryBuilder = queryBuilder
                        .eq('board_id', context.boardId)
                        .or(`organization_id.eq.${organizationId},organization_id.is.null`);
                } else {
                    // Sem board no contexto: sempre filtra por organization_id.
                    queryBuilder = queryBuilder.eq('organization_id', organizationId);
                }

                const { data: deals, error: dealsError } = await queryBuilder;

                if (dealsError) {
                    return { error: formatSupabaseFailure(dealsError) };
                }

                return {
                    count: deals?.length || 0,
                    deals: deals?.map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                        stage: d.stage?.name || d.stage?.label || 'N/A',
                        contact: d.contact?.name || 'N/A',
                        status: d.is_won ? 'âœ… Ganho' : d.is_lost ? 'âŒ Perdido' : 'ðŸ”„ Aberto'
                    })) || []
                };
            },
        }),

        searchContacts: crmTool({
            description: 'Busca contatos por nome ou email',
            parameters: z.object({
                query: z.string().describe('Termo de busca'),
                limit: z.number().optional().default(5),
            }),
            execute: async ({ query, limit }) => {
                // supabase is already initialized
                console.log('[AI] ðŸ” searchContacts EXECUTED!', query);

                const { data: contacts } = await supabase
                    .from('contacts')
                    .select('id, name, email, phone, company_name')
                    .eq('organization_id', organizationId)
                    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                    .limit(limit);

                return {
                    count: contacts?.length || 0,
                    contacts: contacts?.map(c => ({
                        id: c.id,
                        name: c.name,
                        email: c.email || 'N/A',
                        phone: c.phone || 'N/A',
                        company: c.company_name || 'N/A'
                    })) || []
                };
            },
        }),

        listDealsByStage: crmTool({
            description: 'Lista todos os deals em um estÃ¡gio especÃ­fico do funil',
            parameters: z.object({
                stageName: z.string().optional().describe('Nome do estÃ¡gio (ex: Proposta, NegociaÃ§Ã£o)'),
                stageId: z.string().optional().describe('ID do estÃ¡gio'),
                boardId: z.string().optional(),
                limit: z.number().optional().default(10),
            }),
            execute: async ({ stageName, stageId, boardId, limit }) => {
                // supabase is already initialized
                const targetBoardId = boardId || context.boardId;

                console.log('[AI] ðŸ“‹ listDealsByStage EXECUTING:', {
                    stageName,
                    stageId,
                    boardId,
                    targetBoardId,
                    contextBoardId: context.boardId
                });

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                // SeguranÃ§a + compat: valida board no tenant e permite ler deals legados com organization_id NULL.
                const boardGuard = await ensureBoardBelongsToOrganization(targetBoardId);
                if (!boardGuard.ok) return { error: boardGuard.error };

                // UUID regex for validation (full or prefix)
                const isValidUuid = (str: string) =>
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const isUuidPrefix = (str: string) =>
                    /^[0-9a-f]{8}$/i.test(str) || /^[0-9a-f]{8}-[0-9a-f]{1,4}$/i.test(str);

                // Find stage by ID, partial ID, or name
                let finalStageId = stageId;
                let effectiveStageName = stageName;

                // If stageId looks like a stage NAME (not hex), treat it as stageName
                if (finalStageId && !isValidUuid(finalStageId) && !isUuidPrefix(finalStageId)) {
                    // This is a stage name, not a UUID
                    console.log('[AI] âš ï¸ stageId is a name, converting to stageName:', finalStageId);
                    effectiveStageName = finalStageId;
                    finalStageId = undefined;
                }

                // If stageId is a partial UUID, search by prefix
                if (finalStageId && !isValidUuid(finalStageId) && isUuidPrefix(finalStageId)) {
                    console.log('[AI] âš ï¸ Partial UUID, searching by prefix:', finalStageId);
                    const { data: stages } = await supabase
                        .from('board_stages')
                        .select('id, name')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .ilike('id', `${finalStageId}%`);

                    if (stages && stages.length > 0) {
                        finalStageId = stages[0].id;
                        console.log('[AI] âœ… Found stage by prefix:', stages[0].name, finalStageId);
                    } else {
                        finalStageId = undefined;
                    }
                }

                // If no valid stageId, search by name
                if (!finalStageId && effectiveStageName) {
                    const { data: stages, error: stageError } = await supabase
                        .from('board_stages')
                        .select('id, name, label')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .or(`name.ilike.%${effectiveStageName}%,label.ilike.%${effectiveStageName}%`);

                    console.log('[AI] ðŸ“‹ Stage search by name:', {
                        stageName: effectiveStageName,
                        foundStages: stages,
                        stageError
                    });

                    if (stages && stages.length > 0) {
                        finalStageId = stages[0].id;
                    } else {
                        const { data: allStages } = await supabase
                            .from('board_stages')
                            .select('name, label')
                            .eq('organization_id', organizationId)
                            .eq('board_id', targetBoardId);

                        const stageNames = allStages?.map(s => s.name || s.label).join(', ') || 'nenhum';
                        return { error: `EstÃ¡gio "${effectiveStageName}" nÃ£o encontrado. EstÃ¡gios disponÃ­veis: ${stageNames}` };
                    }
                }

                if (!finalStageId) {
                    return { error: 'EstÃ¡gio nÃ£o identificado. Informe o nome do estÃ¡gio (ex: "Proposta", "Descoberta").' };
                }

                console.log('[AI] ðŸ“‹ Querying deals with stageId:', finalStageId);

                const { data: deals, error: dealsError } = await supabase
                    .from('deals')
                    .select('id, title, value, updated_at, is_won, is_lost, contact:contacts(name)')
                    .eq('board_id', targetBoardId)
                    .eq('stage_id', finalStageId)
                    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
                    .order('value', { ascending: false })
                    // Busca mais do que o necessÃ¡rio e filtra client-side para tratar legacy NULL
                    .limit(Math.max(limit * 5, 50));

                if (dealsError) {
                    return { error: formatSupabaseFailure(dealsError) };
                }

                console.log('[AI] ðŸ“‹ Deals query result:', {
                    dealsCount: deals?.length,
                    deals,
                    dealsError
                });

                // Compat: alguns deals legados podem ter is_won/is_lost = NULL.
                // Nesse caso, consideramos como "aberto".
                const openDeals = (deals || []).filter((d: any) => !d.is_won && !d.is_lost);
                const finalDeals = openDeals.slice(0, limit);
                const totalValue = finalDeals.reduce((s: number, d: any) => s + (d.value || 0), 0) || 0;

                return {
                    count: finalDeals.length || 0,
                    totalValue: `R$ ${totalValue.toLocaleString('pt-BR')}`,
                    deals: finalDeals.map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                        contact: d.contact?.name || 'N/A'
                    })) || []
                };
            },
        }),
        listStagnantDeals: crmTool({
            description: 'Lista deals parados/estagnados hÃ¡ mais de X dias sem atualizaÃ§Ã£o',
            parameters: z.object({
                boardId: z.string().optional(),
                daysStagnant: z.number().int().positive().optional().default(7).describe('Dias sem atualizaÃ§Ã£o'),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ boardId, daysStagnant, limit }) => {
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] â° listStagnantDeals EXECUTED!');

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const boardGuard = await ensureBoardBelongsToOrganization(targetBoardId);
                if (!boardGuard.ok) return { error: boardGuard.error };

                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysStagnant);

                const { data: deals } = await supabase
                    .from('deals')
                    .select('id, title, value, updated_at, is_won, is_lost, contact:contacts(name)')
                    .eq('board_id', targetBoardId)
                    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
                    .lt('updated_at', cutoffDate.toISOString())
                    .order('updated_at', { ascending: true })
                    // Busca mais e filtra client-side para tratar legacy NULL
                    .limit(Math.max(limit * 5, 50));

                const openDeals = (deals || []).filter((d: any) => !d.is_won && !d.is_lost);
                const finalDeals = openDeals.slice(0, limit);

                return {
                    count: finalDeals.length || 0,
                    message: `${finalDeals.length || 0} deals parados hÃ¡ mais de ${daysStagnant} dias`,
                    deals: finalDeals.map((d: any) => {
                        const days = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24));
                        return {
                            id: d.id,
                            title: d.title,
                            diasParado: days,
                            value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                            contact: d.contact?.name || 'N/A'
                        };
                    }) || []
                };
            },
        }),

        listOverdueDeals: crmTool({
            description: 'Lista deals que possuem atividades atrasadas',
            parameters: z.object({
                boardId: z.string().optional(),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ boardId, limit }) => {
                const targetBoardId = boardId || context.boardId;

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const now = new Date().toISOString();

                const { data: overdueActivities } = await supabase
                    .from('activities')
                    .select('deal_id, date, title')
                    .eq('organization_id', organizationId)
                    .lt('date', now)
                    .eq('completed', false)
                    .order('date', { ascending: true });

                if (!overdueActivities || overdueActivities.length === 0) {
                    return { count: 0, message: 'Nenhuma atividade atrasada encontrada! ðŸŽ‰', deals: [] };
                }

                const dealIds = [...new Set(overdueActivities.map(a => a.deal_id).filter(Boolean))];

                const { data: deals } = await supabase
                    .from('deals')
                    .select('id, title, value, contact:contacts(name)')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .in('id', dealIds)
                    .limit(limit);

                return {
                    count: deals?.length || 0,
                    message: `âš ï¸ ${deals?.length || 0} deals com atividades atrasadas`,
                    deals: deals?.map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                        contact: d.contact?.name || 'N/A',
                        overdueCount: overdueActivities.filter(a => a.deal_id === d.id).length
                    })) || []
                };
            },
        }),

        getDealDetails: crmTool({
            description: 'Mostra os detalhes completos de um deal especÃ­fico',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se nÃ£o fornecido)'),
            }),
            execute: async ({ dealId }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] ðŸ”Ž getDealDetails EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: deal, error } = await supabase
                    .from('deals')
                    .select(`
                        *,
                        contact:contacts(name, email, phone),
                        stage:board_stages(name, label),
                        activities(id, type, title, completed, date)
                    `)
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .single();

                if (error || !deal) {
                    return { error: 'Deal nÃ£o encontrado.' };
                }

                const pendingActivities = deal.activities?.filter((a: any) => !a.completed) || [];

                return {
                    id: deal.id,
                    title: deal.title,
                    value: `R$ ${(deal.value || 0).toLocaleString('pt-BR')}`,
                    status: deal.is_won ? 'âœ… Ganho' : deal.is_lost ? 'âŒ Perdido' : 'ðŸ”„ Aberto',
                    stage: (deal.stage as any)?.name || (deal.stage as any)?.label || 'N/A',
                    priority: deal.priority || 'medium',
                    contact: (deal.contact as any)?.name || 'N/A',
                    contactEmail: (deal.contact as any)?.email || 'N/A',
                    pendingActivities: pendingActivities.length,
                    createdAt: deal.created_at
                };
            },
        }),

        // ============= AÃ‡Ã•ES (COM APROVAÃ‡ÃƒO) =============
        moveDeal: crmTool({
            description: 'Move um deal para outro estÃ¡gio do funil. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se nÃ£o fornecido)'),
                stageName: z.string().optional().describe('Nome do estÃ¡gio destino'),
                stageId: z.string().optional().describe('ID do estÃ¡gio destino'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, stageName, stageId }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] ðŸ”„ moveDeal EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: deal } = await supabase
                    .from('deals')
                    .select('board_id, title')
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .single();

                if (!deal) {
                    return { error: 'Deal nÃ£o encontrado.' };
                }

                let targetStageId = stageId;
                if (!targetStageId && stageName) {
                    const { data: stages } = await supabase
                        .from('board_stages')
                        .select('id, name, label')
                        .eq('organization_id', organizationId)
                        .eq('board_id', deal.board_id)
                        .or(`name.ilike.%${stageName}%,label.ilike.%${stageName}%`);

                    if (stages && stages.length > 0) {
                        targetStageId = stages[0].id;
                    } else {
                        return { error: `EstÃ¡gio "${stageName}" nÃ£o encontrado.` };
                    }
                }

                if (!targetStageId) {
                    return { error: 'Especifique o estÃ¡gio destino.' };
                }

                const { error } = await supabase
                    .from('deals')
                    .update({
                        stage_id: targetStageId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId);

                if (error) {
                    return { success: false, error: error.message };
                }

                return { success: true, message: `Deal "${deal.title}" movido com sucesso!` };
            },
        }),

        createDeal: crmTool({
            description: 'Cria um novo deal no board atual (ou informado). Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                title: z.string().min(1).describe('TÃ­tulo do deal'),
                value: z.number().optional().default(0).describe('Valor do deal em reais'),
                contactName: z.string().optional().describe('Nome do contato'),
                boardId: z.string().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, value, contactName, boardId }) => {
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] âž• createDeal EXECUTED!', title);

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const { data: stages } = await supabase
                    .from('board_stages')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .order('order', { ascending: true })
                    .limit(1);

                const firstStageId = stages?.[0]?.id;
                if (!firstStageId) {
                    return { error: 'Board nÃ£o tem estÃ¡gios configurados.' };
                }

                let contactId: string | null = null;
                if (contactName) {
                    const { data: existing } = await supabase
                        .from('contacts')
                        .select('id')
                        .eq('organization_id', organizationId)
                        .ilike('name', contactName)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        contactId = existing[0].id;
                    } else {
                        const { data: newContact } = await supabase
                            .from('contacts')
                            .insert({
                                organization_id: organizationId,
                                name: contactName,
                                owner_id: userId,
                            })
                            .select('id')
                            .single();

                        contactId = newContact?.id ?? null;
                    }
                }

                const { data: deal, error } = await supabase
                    .from('deals')
                    .insert({
                        organization_id: organizationId,
                        board_id: targetBoardId,
                        title,
                        value,
                        contact_id: contactId,
                        stage_id: firstStageId,
                        priority: 'medium',
                        is_won: false,
                        is_lost: false,
                        owner_id: userId,
                    })
                    .select('id, title, value')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message ?? 'Falha ao criar deal' };
                }

                return {
                    success: true,
                    deal: {
                        id: deal.id,
                        title: deal.title,
                        value: `R$ ${(deal.value || 0).toLocaleString('pt-BR')}`
                    },
                    message: `Deal "${title}" criado com sucesso!`
                };
            },
        }),

        updateDeal: crmTool({
            description: 'Atualiza campos de um deal existente. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se nÃ£o fornecido)'),
                title: z.string().optional().describe('Novo tÃ­tulo'),
                value: z.number().optional().describe('Novo valor'),
                priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, title, value, priority }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] âœï¸ updateDeal EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (title) updateData.title = title;
                if (value !== undefined) updateData.value = value;
                if (priority) updateData.priority = priority;

                const { error } = await supabase
                    .from('deals')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId);

                if (error) {
                    return { success: false, error: error.message };
                }

                return { success: true, message: 'Deal atualizado com sucesso!' };
            },
        }),

        markDealAsWon: crmTool({
            description: 'Marca um deal como GANHO/fechado com sucesso! ðŸŽ‰ Pode encontrar o deal por ID, tÃ­tulo, ou estÃ¡gio. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (opcional se fornecer outros identificadores)'),
                dealTitle: z.string().optional().describe('TÃ­tulo/nome do deal para buscar'),
                stageName: z.string().optional().describe('Nome do estÃ¡gio onde o deal estÃ¡ (ex: "Proposta")'),
                wonValue: z.number().optional().describe('Valor final do fechamento'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, dealTitle, stageName, wonValue }) => {
                // supabase is already initialized
                let targetDealId = dealId || context.dealId;
                const targetBoardId = context.boardId;

                console.log('[AI] ðŸŽ‰ markDealAsWon EXECUTING:', { dealId, dealTitle, stageName, targetBoardId });

                // Smart lookup: find deal by title or stage if no dealId
                if (!targetDealId && targetBoardId) {
                    let query = supabase
                        .from('deals')
                        .select('id, title, value, is_won, is_lost, stage:board_stages(name)')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId);

                    // Find by title
                    if (dealTitle) {
                        query = query.ilike('title', `%${dealTitle}%`);
                    }

                    const { data: foundDeals } = await query.limit(20);

                    // Compat: deals legados podem ter is_won/is_lost = NULL.
                    // Consideramos como "aberto" na busca.
                    const openFoundDeals = (foundDeals || []).filter((d: any) => !d.is_won && !d.is_lost);

                    console.log('[AI] ðŸ” Found deals:', {
                        foundDealsCount: foundDeals?.length,
                        openFoundDealsCount: openFoundDeals.length,
                        openFoundDeals
                    });

                    // If looking for stage, filter by stage name
                    if (stageName && openFoundDeals) {
                        const filtered = openFoundDeals.filter((d: any) =>
                            d.stage?.name?.toLowerCase().includes(stageName.toLowerCase())
                        );
                        if (filtered.length === 1) {
                            targetDealId = filtered[0].id;
                        } else if (filtered.length > 1) {
                            return {
                                error: `Encontrei ${filtered.length} deals em "${stageName}". Especifique qual: ${filtered.map((d: any) => d.title).join(', ')}`
                            };
                        }
                    } else if (openFoundDeals.length === 1) {
                        targetDealId = openFoundDeals[0].id;
                    } else if (dealTitle && openFoundDeals.length > 0) {
                        // Multiple matches by title
                        return {
                            error: `Encontrei ${openFoundDeals.length} deals com "${dealTitle}". Especifique qual: ${openFoundDeals.map((d: any) => d.title).join(', ')}`
                        };
                    }
                }

                if (!targetDealId) {
                    return { error: 'NÃ£o consegui identificar o deal. ForneÃ§a o ID, tÃ­tulo ou nome do estÃ¡gio.' };
                }

                // Se existir um estÃ¡gio de "Ganho" no board, tambÃ©m mova o card para ele.
                // Isso evita a sensaÃ§Ã£o de "nÃ£o moveu" quando a UI do kanban Ã© baseada em stage_id.
                let wonStageId: string | null = null;
                const wonStageNameFromContext = context.wonStage || 'Ganho';

                if (targetBoardId && wonStageNameFromContext) {
                    const { data: wonStages } = await supabase
                        .from('board_stages')
                        .select('id, name, label')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .or(`name.ilike.%${wonStageNameFromContext}%,label.ilike.%${wonStageNameFromContext}%`)
                        .limit(1);

                    if (wonStages && wonStages.length > 0) {
                        wonStageId = wonStages[0].id;
                    }
                }

                const updateData: any = {
                    is_won: true,
                    is_lost: false,
                    closed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                if (wonValue !== undefined) updateData.value = wonValue;
                if (wonStageId) updateData.stage_id = wonStageId;

                const { data: deal, error } = await supabase
                    .from('deals')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .select('title, value')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message || 'Deal nÃ£o encontrado' };
                }

                return {
                    success: true,
                    message: `ðŸŽ‰ ParabÃ©ns! Deal "${deal.title}" marcado como GANHO!`,
                    value: `R$ ${(deal.value || 0).toLocaleString('pt-BR')}`
                };
            },
        }),

        markDealAsLost: crmTool({
            description: 'Marca um deal como PERDIDO. Requer motivo da perda. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal'),
                reason: z.string().describe('Motivo da perda (ex: PreÃ§o, Concorrente, Timing)'),
            }),
            needsApproval: !bypassApproval, // âœ… Requer aprovaÃ§Ã£o (bypassÃ¡vel em dev/test)
            execute: async ({ dealId, reason }) => {
                // supabase is already initialized
                const targetDealId = dealId || context.dealId;
                console.log('[AI] âŒ markDealAsLost EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: deal, error } = await supabase
                    .from('deals')
                    .update({
                        is_won: false,
                        is_lost: true,
                        loss_reason: reason,
                        closed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .select('title')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message || 'Deal nÃ£o encontrado' };
                }

                return {
                    success: true,
                    message: `Deal "${deal.title}" marcado como perdido. Motivo: ${reason}`
                };
            },
        }),

        assignDeal: crmTool({
            description: 'Reatribui um deal para outro vendedor/responsÃ¡vel. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal'),
                newOwnerId: z.string().describe('ID do novo responsÃ¡vel (UUID)'),
            }),
            needsApproval: !bypassApproval, // âœ… Requer aprovaÃ§Ã£o (bypassÃ¡vel em dev/test)
            execute: async ({ dealId, newOwnerId }) => {
                // supabase is already initialized
                const targetDealId = dealId || context.dealId;
                console.log('[AI] ðŸ‘¤ assignDeal EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: ownerProfile } = await supabase
                    .from('profiles')
                    .select('first_name, nickname')
                    .eq('organization_id', organizationId)
                    .eq('id', newOwnerId)
                    .single();

                const ownerName = ownerProfile?.nickname || ownerProfile?.first_name || 'Novo responsÃ¡vel';

                const { data: deal, error } = await supabase
                    .from('deals')
                    .update({
                        owner_id: newOwnerId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .select('title')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message || 'Deal nÃ£o encontrado' };
                }

                return {
                    success: true,
                    message: `Deal "${deal.title}" reatribuÃ­do para ${ownerName}`
                };
            },
        }),

        createTask: crmTool({
            description: 'Cria uma nova tarefa ou atividade para acompanhamento. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                title: z.string().describe('TÃ­tulo da tarefa'),
                description: z.string().optional(),
                dueDate: z.string().optional().describe('Data de vencimento ISO'),
                dealId: z.string().optional(),
                type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']).optional().default('TASK'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, description, dueDate, dealId, type }) => {
                // supabase is already initialized
                const targetDealId = dealId || context.dealId;
                console.log('[AI] âœï¸ createTask EXECUTED!', title);

                const date = dueDate || new Date().toISOString();

                const { data, error } = await supabase
                    .from('activities')
                    .insert({
                        organization_id: organizationId,
                        title,
                        description,
                        date,
                        deal_id: targetDealId,
                        type,
                        owner_id: userId,
                        completed: false,
                    })
                    .select()
                    .single();

                if (error) {
                    return { success: false, error: error.message };
                }

                return {
                    success: true,
                    activity: { id: data.id, title: data.title, type: data.type },
                    message: `Atividade "${title}" criada com sucesso!`
                };
            },
        }),

        moveDealsBulk: crmTool({
            description:
                'Move vÃ¡rios deals de uma vez para outro estÃ¡gio. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealIds: z.array(z.string()).min(1).describe('IDs dos deals a mover'),
                boardId: z.string().optional().describe('Board alvo (usa contexto se nÃ£o fornecido)'),
                stageName: z.string().optional().describe('Nome do estÃ¡gio destino (ex: "Contatado")'),
                stageId: z.string().optional().describe('ID do estÃ¡gio destino'),
                allowPartial: z.boolean().optional().default(true).describe('Se true, ignora IDs que nÃ£o pertencem ao tenant e move o restante'),
                maxDeals: z.number().int().positive().optional().default(50).describe('Guardrail: mÃ¡ximo de deals por aÃ§Ã£o'),
                createFollowUpTask: z.boolean().optional().default(false).describe('Se true, cria 1 tarefa por deal apÃ³s mover (guardrails aplicados)'),
                followUpTitle: z.string().optional().describe('TÃ­tulo da tarefa de follow-up'),
                followUpDueInDays: z.number().int().positive().optional().default(2),
                followUpType: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']).optional().default('TASK'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealIds, boardId, stageName, stageId, allowPartial, maxDeals, createFollowUpTask, followUpTitle, followUpDueInDays, followUpType }) => {
                const unique = Array.from(new Set((dealIds || []).filter(Boolean)));
                if (unique.length === 0) return { error: 'Informe pelo menos 1 deal.' };
                if (unique.length > maxDeals) {
                    return { error: `Muitos deals (${unique.length}). Por seguranÃ§a, o mÃ¡ximo por aÃ§Ã£o Ã© ${maxDeals}. Filtre ou faÃ§a em lotes.` };
                }

                const targetBoardId = boardId || context.boardId;
                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado. VÃ¡ para um board ou informe qual.' };
                }

                const boardGuard = await ensureBoardBelongsToOrganization(targetBoardId);
                if (!boardGuard.ok) return { error: boardGuard.error };

                // 1) Carrega deals do tenant e do board (sem vazar outros boards/tenants)
                const { data: deals, error: dealsError } = await supabase
                    .from('deals')
                    .select('id, title, board_id')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .in('id', unique);

                if (dealsError) return { error: formatSupabaseFailure(dealsError) };

                const foundIds = new Set((deals || []).map((d: any) => d.id));
                const missingIds = unique.filter((id) => !foundIds.has(id));

                if (missingIds.length > 0 && !allowPartial) {
                    return { error: `Alguns deals nÃ£o foram encontrados neste board/organizaÃ§Ã£o (${missingIds.length}).` };
                }

                const stageRes = await resolveStageIdForBoard({ boardId: targetBoardId, stageId, stageName });
                if (!stageRes.ok) return { error: stageRes.error };

                const idsToMove = (deals || []).map((d: any) => d.id);
                if (idsToMove.length === 0) {
                    return { error: 'Nenhum deal vÃ¡lido encontrado para mover (cheque board/organizaÃ§Ã£o).' };
                }

                // 2) Atualiza em lote
                const { error: updError } = await supabase
                    .from('deals')
                    .update({ stage_id: stageRes.stageId, updated_at: new Date().toISOString() })
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .in('id', idsToMove);

                if (updError) return { error: formatSupabaseFailure(updError) };

                // 3) â€œAutomaÃ§Ã£o simplesâ€: cria 1 tarefa por deal (com guardrail extra)
                let followUpCreated = 0;
                if (createFollowUpTask) {
                    const maxTasks = Math.min(idsToMove.length, 20);
                    const due = new Date();
                    due.setDate(due.getDate() + (followUpDueInDays || 2));

                    const title = (followUpTitle || 'Follow-up apÃ³s mudanÃ§a de estÃ¡gio').trim();
                    const inserts = idsToMove.slice(0, maxTasks).map((id) => ({
                        organization_id: organizationId,
                        title,
                        description: null,
                        date: due.toISOString(),
                        deal_id: id,
                        type: followUpType,
                        owner_id: userId,
                        completed: false,
                    }));

                    const { error: actError } = await supabase.from('activities').insert(inserts);
                    if (!actError) {
                        followUpCreated = inserts.length;
                    }
                }

                return {
                    success: true,
                    movedCount: idsToMove.length,
                    skippedCount: missingIds.length,
                    followUpCreated,
                    deals: (deals || []).map((d: any) => ({ id: d.id, title: d.title })),
                    message:
                        `Movi ${idsToMove.length} deal(s) com sucesso.` +
                        (missingIds.length ? ` (${missingIds.length} ignorado(s) por nÃ£o pertencerem ao board/organizaÃ§Ã£o.)` : '') +
                        (followUpCreated ? ` Criei ${followUpCreated} tarefa(s) de follow-up.` : ''),
                };
            },
        }),

        // =================== ATIVIDADES (P0) ===================
        listActivities: crmTool({
            description: 'Lista atividades (tarefas/ligaÃ§Ãµes/reuniÃµes) filtrando por deal/contato/board e status.',
            parameters: z.object({
                boardId: z.string().optional(),
                dealId: z.string().optional(),
                contactId: z.string().optional(),
                completed: z.boolean().optional(),
                fromDate: z.string().optional().describe('ISO'),
                toDate: z.string().optional().describe('ISO'),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ boardId, dealId, contactId, completed, fromDate, toDate, limit }) => {
                const targetBoardId = boardId || context.boardId;

                if (targetBoardId) {
                    const guard = await ensureBoardBelongsToOrganization(targetBoardId);
                    if (!guard.ok) return { error: guard.error };
                }

                let q = supabase
                    .from('activities')
                    .select('id, title, description, type, date, completed, deal_id, contact_id, deals(title, board_id), contact:contacts(name)')
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
                    .order('date', { ascending: true })
                    .limit(limit);

                if (dealId) q = q.eq('deal_id', dealId);
                if (contactId) q = q.eq('contact_id', contactId);
                if (completed !== undefined) q = q.eq('completed', completed);
                if (fromDate) q = q.gte('date', fromDate);
                if (toDate) q = q.lte('date', toDate);
                // PostgREST: filtro em tabela relacionada funciona melhor com join explÃ­cito.
                if (targetBoardId) {
                    q = supabase
                        .from('activities')
                        .select('id, title, description, type, date, completed, deal_id, contact_id, deals!inner(title, board_id), contact:contacts(name)')
                        .eq('organization_id', organizationId)
                        .is('deleted_at', null)
                        .order('date', { ascending: true })
                        .limit(limit)
                        .eq('deals.board_id', targetBoardId);

                    if (dealId) q = q.eq('deal_id', dealId);
                    if (contactId) q = q.eq('contact_id', contactId);
                    if (completed !== undefined) q = q.eq('completed', completed);
                    if (fromDate) q = q.gte('date', fromDate);
                    if (toDate) q = q.lte('date', toDate);
                }

                const { data, error } = await q;
                if (error) return { error: formatSupabaseFailure(error) };

                return {
                    count: data?.length || 0,
                    activities:
                        (data || []).map((a: any) => ({
                            id: a.id,
                            title: a.title,
                            type: a.type,
                            date: a.date,
                            completed: !!a.completed,
                            dealTitle: a.deals?.title || null,
                            contactName: a.contact?.name || null,
                        })) || [],
                };
            },
        }),

        completeActivity: crmTool({
            description: 'Marca uma atividade como concluÃ­da. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                activityId: z.string(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ activityId }) => {
                const { data, error } = await supabase
                    .from('activities')
                    .update({ completed: true })
                    .eq('organization_id', organizationId)
                    .eq('id', activityId)
                    .select('id, title')
                    .maybeSingle();

                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Atividade nÃ£o encontrada nesta organizaÃ§Ã£o.' };
                return { success: true, message: `Atividade "${data.title}" marcada como concluÃ­da.` };
            },
        }),

        rescheduleActivity: crmTool({
            description: 'Reagenda uma atividade (altera a data). Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                activityId: z.string(),
                newDate: z.string().describe('Nova data/hora (ISO)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ activityId, newDate }) => {
                const { data, error } = await supabase
                    .from('activities')
                    .update({ date: newDate })
                    .eq('organization_id', organizationId)
                    .eq('id', activityId)
                    .select('id, title, date')
                    .maybeSingle();

                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Atividade nÃ£o encontrada nesta organizaÃ§Ã£o.' };
                return { success: true, message: `Atividade "${data.title}" reagendada.`, date: data.date };
            },
        }),

        logActivity: crmTool({
            description: 'Registra uma interaÃ§Ã£o (ligaÃ§Ã£o/email/reuniÃ£o) e jÃ¡ marca como concluÃ­da. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                dealId: z.string().optional(),
                contactId: z.string().optional(),
                type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']).optional().default('CALL'),
                date: z.string().optional().describe('ISO (padrÃ£o: agora)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, description, dealId, contactId, type, date }) => {
                const payload = {
                    organization_id: organizationId,
                    title,
                    description: description || null,
                    type,
                    date: date || new Date().toISOString(),
                    deal_id: dealId || context.dealId || null,
                    contact_id: contactId || null,
                    owner_id: userId,
                    completed: true,
                };

                const { data, error } = await supabase
                    .from('activities')
                    .insert(payload)
                    .select('id, title, type, date')
                    .single();

                if (error) return { error: formatSupabaseFailure(error) };
                return { success: true, activity: data, message: `Registro criado: "${data.title}".` };
            },
        }),

        // =================== DEAL NOTES (P0) ===================
        addDealNote: crmTool({
            description: 'Adiciona uma nota a um deal. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se nÃ£o fornecido)'),
                content: z.string().min(1).describe('ConteÃºdo da nota'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, content }) => {
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) return { error: 'Nenhum deal especificado.' };

                const guard = await ensureDealBelongsToOrganization(targetDealId);
                if (!guard.ok) return { error: guard.error };

                const { data, error } = await supabase
                    .from('deal_notes')
                    .insert({ deal_id: targetDealId, content, created_by: userId })
                    .select('id, content, created_at')
                    .single();

                if (error) return { error: formatSupabaseFailure(error) };
                return { success: true, note: data, message: `Nota adicionada no deal "${guard.deal.title}".` };
            },
        }),

        listDealNotes: crmTool({
            description: 'Lista as Ãºltimas notas de um deal.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se nÃ£o fornecido)'),
                limit: z.number().int().positive().optional().default(5),
            }),
            execute: async ({ dealId, limit }) => {
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) return { error: 'Nenhum deal especificado.' };

                const guard = await ensureDealBelongsToOrganization(targetDealId);
                if (!guard.ok) return { error: guard.error };

                const { data, error } = await supabase
                    .from('deal_notes')
                    .select('id, content, created_at, created_by')
                    .eq('deal_id', targetDealId)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) return { error: formatSupabaseFailure(error) };
                return {
                    count: data?.length || 0,
                    dealTitle: guard.deal.title,
                    notes: (data || []).map((n: any) => ({ id: n.id, content: n.content, createdAt: n.created_at, createdBy: n.created_by })),
                };
            },
        }),

        // =================== CONTATOS (P1) ===================
        createContact: crmTool({
            description: 'Cria um novo contato. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                name: z.string().min(1),
                email: z.string().email().optional(),
                phone: z.string().optional(),
                role: z.string().optional(),
                companyName: z.string().optional(),
                notes: z.string().optional(),
                status: z.string().optional().default('ACTIVE'),
                stage: z.string().optional().default('LEAD'),
                source: z.string().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ name, email, phone, role, companyName, notes, status, stage, source }) => {
                const { data, error } = await supabase
                    .from('contacts')
                    .insert({
                        organization_id: organizationId,
                        name,
                        email: email || null,
                        phone: phone || null,
                        role: role || null,
                        company_name: companyName || null,
                        notes: notes || null,
                        status,
                        stage,
                        source: source || null,
                        owner_id: userId,
                        updated_at: new Date().toISOString(),
                    })
                    .select('id, name, email, phone, company_name')
                    .single();
                if (error) return { error: formatSupabaseFailure(error) };
                return { success: true, contact: data, message: `Contato "${data.name}" criado.` };
            },
        }),

        updateContact: crmTool({
            description: 'Atualiza campos de um contato. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                contactId: z.string(),
                name: z.string().optional(),
                email: z.string().email().optional(),
                phone: z.string().optional(),
                role: z.string().optional(),
                companyName: z.string().optional(),
                notes: z.string().optional(),
                status: z.string().optional(),
                stage: z.string().optional(),
                source: z.string().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ contactId, ...patch }) => {
                const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (patch.name !== undefined) updateData.name = patch.name;
                if (patch.email !== undefined) updateData.email = patch.email;
                if (patch.phone !== undefined) updateData.phone = patch.phone;
                if (patch.role !== undefined) updateData.role = patch.role;
                if (patch.companyName !== undefined) updateData.company_name = patch.companyName;
                if (patch.notes !== undefined) updateData.notes = patch.notes;
                if (patch.status !== undefined) updateData.status = patch.status;
                if (patch.stage !== undefined) updateData.stage = patch.stage;
                if (patch.source !== undefined) updateData.source = patch.source;

                const { data, error } = await supabase
                    .from('contacts')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .select('id, name, email, phone, company_name')
                    .maybeSingle();
                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Contato nÃ£o encontrado nesta organizaÃ§Ã£o.' };
                return { success: true, contact: data, message: `Contato "${data.name}" atualizado.` };
            },
        }),

        getContactDetails: crmTool({
            description: 'Mostra detalhes de um contato.',
            parameters: z.object({
                contactId: z.string(),
            }),
            execute: async ({ contactId }) => {
                const { data, error } = await supabase
                    .from('contacts')
                    .select('id, name, email, phone, role, company_name, notes, status, stage, source, created_at, updated_at')
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .maybeSingle();
                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Contato nÃ£o encontrado nesta organizaÃ§Ã£o.' };
                return data;
            },
        }),

        linkDealToContact: crmTool({
            description: 'Associa um deal a um contato (define deal.contact_id). Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se nÃ£o fornecido)'),
                contactId: z.string().describe('ID do contato'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, contactId }) => {
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) return { error: 'Nenhum deal especificado.' };

                const dealGuard = await ensureDealBelongsToOrganization(targetDealId);
                if (!dealGuard.ok) return { error: dealGuard.error };

                const { data: contact, error: contactError } = await supabase
                    .from('contacts')
                    .select('id, name')
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .maybeSingle();
                if (contactError) return { error: formatSupabaseFailure(contactError) };
                if (!contact) return { error: 'Contato nÃ£o encontrado nesta organizaÃ§Ã£o.' };

                const { error } = await supabase
                    .from('deals')
                    .update({ contact_id: contactId, updated_at: new Date().toISOString() })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId);
                if (error) return { error: formatSupabaseFailure(error) };

                return { success: true, message: `Deal "${dealGuard.deal.title}" associado ao contato "${contact.name}".` };
            },
        }),

        // =================== ESTÃGIOS (P2) ===================
        listStages: crmTool({
            description: 'Lista estÃ¡gios de um board (colunas).',
            parameters: z.object({
                boardId: z.string().optional(),
            }),
            execute: async ({ boardId }) => {
                const targetBoardId = boardId || context.boardId;
                if (!targetBoardId) return { error: 'Nenhum board selecionado.' };
                const guard = await ensureBoardBelongsToOrganization(targetBoardId);
                if (!guard.ok) return { error: guard.error };

                const { data, error } = await supabase
                    .from('board_stages')
                    .select('id, name, label, color, order, is_default')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .order('order', { ascending: true });

                if (error) return { error: formatSupabaseFailure(error) };
                return { count: data?.length || 0, stages: data || [] };
            },
        }),

        updateStage: crmTool({
            description: 'Atualiza um estÃ¡gio (nome/label/cor/ordem). Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                stageId: z.string(),
                name: z.string().optional(),
                label: z.string().optional(),
                color: z.string().optional(),
                order: z.number().int().optional(),
                isDefault: z.boolean().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ stageId, name, label, color, order, isDefault }) => {
                const updateData: Record<string, unknown> = {};
                if (name !== undefined) updateData.name = name;
                if (label !== undefined) updateData.label = label;
                if (color !== undefined) updateData.color = color;
                if (order !== undefined) updateData.order = order;
                if (isDefault !== undefined) updateData.is_default = isDefault;

                const { data, error } = await supabase
                    .from('board_stages')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', stageId)
                    .select('id, name, label, color, order, is_default')
                    .maybeSingle();

                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'EstÃ¡gio nÃ£o encontrado nesta organizaÃ§Ã£o.' };
                return { success: true, stage: data, message: `EstÃ¡gio atualizado: ${data.name}` };
            },
        }),

        reorderStages: crmTool({
            description: 'Reordena os estÃ¡gios de um board. Requer aprovaÃ§Ã£o no card (Aprovar/Negar) â€” nÃ£o peÃ§a confirmaÃ§Ã£o em texto.',
            parameters: z.object({
                boardId: z.string().optional(),
                orderedStageIds: z.array(z.string()).min(2),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ boardId, orderedStageIds }) => {
                const targetBoardId = boardId || context.boardId;
                if (!targetBoardId) return { error: 'Nenhum board selecionado.' };
                const guard = await ensureBoardBelongsToOrganization(targetBoardId);
                if (!guard.ok) return { error: guard.error };

                // valida que os IDs pertencem ao board+org
                const { data: stages, error: stError } = await supabase
                    .from('board_stages')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .in('id', orderedStageIds);

                if (stError) return { error: formatSupabaseFailure(stError) };
                const found = new Set((stages || []).map((s: any) => s.id));
                const missing = orderedStageIds.filter((id) => !found.has(id));
                if (missing.length) return { error: 'Alguns estÃ¡gios nÃ£o pertencem a este board/organizaÃ§Ã£o.' };

                // atualiza em sÃ©rie (n pequeno). Se crescer, migrar para RPC.
                for (let i = 0; i < orderedStageIds.length; i++) {
                    const id = orderedStageIds[i];
                    const { error } = await supabase
                        .from('board_stages')
                        .update({ order: i })
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .eq('id', id);
                    if (error) return { error: formatSupabaseFailure(error) };
                }

                return { success: true, message: `Reordenei ${orderedStageIds.length} estÃ¡gio(s).` };
            },
        }),
    } as Record<string, any>;

    // Debug/diagnÃ³stico (scripts): registra chamadas de tools, independentemente do formato do stream.
    // IMPORTANTE: desabilitado por padrÃ£o.
    if (String(process.env.AI_TOOL_CALLS_DEBUG || '').toLowerCase() === 'true') {
        const g = globalThis as any;
        if (!Array.isArray(g.__AI_TOOL_CALLS__)) g.__AI_TOOL_CALLS__ = [];

        for (const [name, t] of Object.entries(tools)) {
            const original = (t as any)?.execute;
            if (typeof original !== 'function') continue;

            (t as any).execute = async (args: any) => {
                try {
                    g.__AI_TOOL_CALLS__.push(name);
                } catch {
                    // ignore
                }
                return await original(args);
            };
        }
    }

    return tools;
}
