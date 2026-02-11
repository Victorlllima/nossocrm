import { generateText, convertToCoreMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { CRMCallOptionsSchema, type CRMCallOptions } from '@/types/ai';
import { createCRMTools } from './tools';
import { formatPriorityPtBr } from '@/lib/utils/priority';

type AIProvider = 'google' | 'openai' | 'anthropic';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampText(v: unknown, max = 240): string | undefined {
    if (typeof v !== 'string') return undefined;
    const s = v.trim();
    if (!s) return undefined;
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
}

function formatCockpitSnapshotForPrompt(snapshot: any): string[] {
    if (!snapshot || typeof snapshot !== 'object') return [];

    const lines: string[] = [];

    const deal = snapshot.deal;
    if (deal && typeof deal === 'object') {
        const title = clampText(deal.title, 120) || clampText(deal.name, 120);
        const value = typeof deal.value === 'number' ? deal.value : undefined;
        const probability = typeof deal.probability === 'number' ? deal.probability : undefined;
        const priority = clampText(deal.priority, 30);
        const status = clampText(deal.status, 80);
        lines.push(`🧾 Deal (cockpit): ${title ?? '(sem título)'}${value != null ? ` — R$ ${value.toLocaleString('pt-BR')}` : ''}`);
        if (probability != null) lines.push(`   - Probabilidade: ${probability}%`);
        if (priority) lines.push(`   - Prioridade: ${formatPriorityPtBr(priority)}`);
        if (status) lines.push(`   - Status/Stage ID: ${status}`);
        const lossReason = clampText(deal.lossReason, 200);
        if (lossReason) lines.push(`   - Motivo perda: ${lossReason}`);
    }

    const stage = snapshot.stage;
    if (stage && typeof stage === 'object') {
        const label = clampText(stage.label, 80);
        if (label) lines.push(`🏷️ Estágio atual (label): ${label}`);
    }

    const contact = snapshot.contact;
    if (contact && typeof contact === 'object') {
        const name = clampText(contact.name, 80);
        const role = clampText(contact.role, 80);
        const email = clampText(contact.email, 120);
        const phone = clampText(contact.phone, 60);
        lines.push(`👤 Contato (cockpit): ${name ?? '(sem nome)'}${role ? ` — ${role}` : ''}`);
        if (email) lines.push(`   - Email: ${email}`);
        if (phone) lines.push(`   - Telefone: ${phone}`);
        const notes = clampText(contact.notes, 220);
        if (notes) lines.push(`   - Notas do contato: ${notes}`);
    }

    const signals = snapshot.cockpitSignals;
    if (signals && typeof signals === 'object') {
        if (typeof signals.daysInStage === 'number') {
            lines.push(`⏱️ Dias no estágio: ${signals.daysInStage}`);
        }

        const nba = signals.nextBestAction;
        if (nba && typeof nba === 'object') {
            const action = clampText(nba.action, 120);
            const reason = clampText(nba.reason, 160);
            if (action) lines.push(`👉 Próxima melhor ação (cockpit): ${action}${reason ? ` — ${reason}` : ''}`);
        }

        const ai = signals.aiAnalysis;
        if (ai && typeof ai === 'object') {
            const action = clampText(ai.action, 120);
            const reason = clampText(ai.reason, 180);
            if (action) lines.push(`🤖 Sinal da IA (cockpit): ${action}${reason ? ` — ${reason}` : ''}`);
        }
    }

    const lists = snapshot.lists;
    if (lists && typeof lists === 'object') {
        const activitiesTotal = lists.activities?.total;
        if (typeof activitiesTotal === 'number') {
            const preview = Array.isArray(lists.activities?.preview) ? lists.activities.preview.slice(0, 6) : [];
            lines.push(`🗂️ Atividades no cockpit: ${activitiesTotal}`);
            for (const a of preview) {
                const t = clampText(a?.type, 30);
                const title = clampText(a?.title, 120);
                const date = clampText(a?.date, 40);
                if (t || title) lines.push(`   - ${date ? `[${date}] ` : ''}${t ? `${t}: ` : ''}${title ?? ''}`.trim());
            }
        }

        const notesTotal = lists.notes?.total;
        if (typeof notesTotal === 'number') {
            lines.push(`📝 Notas no cockpit: ${notesTotal}`);
        }

        const filesTotal = lists.files?.total;
        if (typeof filesTotal === 'number') {
            lines.push(`📎 Arquivos no cockpit: ${filesTotal}`);
        }

        const scriptsTotal = lists.scripts?.total;
        if (typeof scriptsTotal === 'number') {
            const preview = Array.isArray(lists.scripts?.preview) ? lists.scripts.preview.slice(0, 6) : [];
            lines.push(`💬 Scripts no cockpit: ${scriptsTotal}`);
            for (const s of preview) {
                const title = clampText(s?.title, 80);
                const cat = clampText(s?.category, 30);
                if (title) lines.push(`   - ${cat ? `(${cat}) ` : ''}${title}`);
            }
        }
    }

    return lines;
}

function buildContextPrompt(options: CRMCallOptions): string {
    const parts: string[] = [];

    if (options.boardId) {
        parts.push(`📋 Board ID: ${options.boardId}`);
        if (options.boardName) parts.push(`   Nome: ${options.boardName}`);
    }

    if (options.dealId) {
        parts.push(`💼 Deal ID: ${options.dealId}`);
    }

    if (options.contactId) {
        parts.push(`👤 Contato ID: ${options.contactId}`);
    }

    if (options.stages && options.stages.length > 0) {
        const stageList = options.stages.map(s => `${s.name} (${s.id})`).join(', ');
        parts.push(`🎯 Estágios: ${stageList}`);
    }

    if (options.dealCount !== undefined) {
        parts.push(`📊 Métricas:`);
        parts.push(`   - Deals: ${options.dealCount}`);
        if (options.pipelineValue) parts.push(`   - Pipeline: R$ ${options.pipelineValue.toLocaleString('pt-BR')}`);
        if (options.stagnantDeals) parts.push(`   - Parados: ${options.stagnantDeals}`);
        if (options.overdueDeals) parts.push(`   - Atrasados: ${options.overdueDeals}`);
    }

    if (options.wonStage) parts.push(`✅ Estágio Ganho: ${options.wonStage}`);
    if (options.lostStage) parts.push(`❌ Estágio Perdido: ${options.lostStage}`);

    if (options.userName) {
        parts.push(`👋 Usuário: ${options.userName}`);
    }

    if ((options as any).cockpitSnapshot) {
        const lines = formatCockpitSnapshotForPrompt((options as any).cockpitSnapshot);
        if (lines.length > 0) {
            parts.push('');
            parts.push('====== CONTEXTO DO COCKPIT ======');
            parts.push(...lines);
        }
    }

    return parts.length > 0
        ? `\n\n====== CONTEXTO DO USUÁRIO ======\n${parts.join('\n')}`
        : '';
}

const BASE_INSTRUCTIONS = `Você é o NossoCRM Pilot, um assistente de vendas inteligente. 🚀

PERSONALIDADE:
- Seja proativo, amigável e analítico
- Use emojis com moderação (máximo 2 por resposta)
- Respostas naturais (evite listas robóticas)
- Máximo 2 parágrafos por resposta

REGRAS:
- Sempre explique os resultados das ferramentas
- Se der erro, informe de forma amigável
- Use o boardId do contexto automaticamente quando disponível
- APRESENTAÇÃO: NÃO mostre IDs/UUIDs; NÃO cite nomes de ferramentas.`;

export async function createCRMAgent(
    context: CRMCallOptions,
    userId: string,
    apiKey: string,
    modelId: string = 'gemini-1.5-flash',
    provider: AIProvider = 'google'
) {
    const model = (() => {
        switch (provider) {
            case 'google': {
                const google = createGoogleGenerativeAI({ apiKey });
                return google(modelId);
            }
            case 'openai': {
                const openai = createOpenAI({ apiKey });
                return openai(modelId);
            }
            case 'anthropic': {
                const anthropic = createAnthropic({ apiKey });
                return anthropic(modelId);
            }
            default: {
                const google = createGoogleGenerativeAI({ apiKey });
                return google(modelId);
            }
        }
    })() as any;

    const tools = createCRMTools(context, userId);

    return {
        model,
        tools,
        instructions: BASE_INSTRUCTIONS + buildContextPrompt(context),
    };
}
