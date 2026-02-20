// Route Handler for AI Chat - /api/ai/chat
// Refactored for AI SDK v3 Safe Mode

import { streamText, convertToCoreMessages } from 'ai';
import { createCRMAgent } from '@/lib/ai/crmAgent';
import { createClient } from '@/lib/supabase/server';
import type { CRMCallOptions } from '@/types/ai';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { isAIFeatureEnabled } from '@/lib/ai/features/server';

export const maxDuration = 60;

type AIProvider = 'google' | 'openai' | 'anthropic';

function asOptionalString(v: unknown): string | undefined {
    return typeof v === 'string' ? v : undefined;
}

function asOptionalNumber(v: unknown): number | undefined {
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function asOptionalStages(v: unknown): Array<{ id: string; name: string }> | undefined {
    if (!Array.isArray(v)) return undefined;
    const stages: Array<{ id: string; name: string }> = [];
    for (const item of v) {
        const maybe = item as any;
        if (typeof maybe?.id === 'string' && typeof maybe?.name === 'string') {
            stages.push({ id: maybe.id, name: maybe.name });
        }
    }
    return stages.length ? stages : undefined;
}

export async function POST(req: Request) {
    if (!isAllowedOrigin(req)) {
        return new Response('Forbidden', { status: 403 });
    }

    const supabase = await createClient();
    const body = await req.json().catch(() => null);
    const messages = body?.messages ?? [];
    const rawContext = (body?.context ?? {}) as Record<string, unknown>;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, first_name, nickname, role')
        .eq('id', user.id)
        .single();

    let organizationId = profile?.organization_id ?? null;
    if (!organizationId) {
        const boardId = typeof rawContext?.boardId === 'string' ? rawContext.boardId : null;
        if (boardId) {
            const { data: board } = await supabase
                .from('boards')
                .select('organization_id')
                .eq('id', boardId)
                .maybeSingle();
            if (board?.organization_id) organizationId = board.organization_id;
        }
    }

    if (!organizationId) return new Response('Profile sem organização.', { status: 409 });

    const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('ai_enabled, ai_provider, ai_model, ai_google_key, ai_openai_key, ai_anthropic_key')
        .eq('organization_id', organizationId)
        .maybeSingle();

    const provider = (orgSettings?.ai_provider ?? 'google') as AIProvider;
    const modelId = orgSettings?.ai_model ?? (provider === 'google' ? 'gemini-1.5-flash' : 'gpt-4o');

    const apiKey = provider === 'google' ? orgSettings?.ai_google_key : provider === 'openai' ? orgSettings?.ai_openai_key : orgSettings?.ai_anthropic_key;

    if (!apiKey) return new Response(`API key não configurada para ${provider}.`, { status: 400 });

    const context: CRMCallOptions = {
        organizationId,
        boardId: asOptionalString(rawContext.boardId),
        dealId: asOptionalString(rawContext.dealId),
        contactId: asOptionalString(rawContext.contactId),
        boardName: asOptionalString(rawContext.boardName),
        stages: asOptionalStages(rawContext.stages),
        userId: user.id,
        userName: profile?.nickname || profile?.first_name || user.email,
    };

    const agentConfig = await createCRMAgent(context, user.id, apiKey, modelId, provider);

    const result = await streamText({
        model: agentConfig.model,
        system: agentConfig.instructions,
        messages: convertToCoreMessages(messages),
        tools: agentConfig.tools as any,
        maxSteps: 5,
    });

    return result.toAIStreamResponse();
}
