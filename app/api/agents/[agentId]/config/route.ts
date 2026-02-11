/**
 * Agent Config API
 *
 * GET - Retorna configuração do agente
 * PUT - Atualiza configuração
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { invalidateAgentCache } from '@/lib/ai/agents';

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createStaticAdminClient();

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', params.agentId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Mapear snake_case para camelCase
    return NextResponse.json({
      id: data.id,
      name: data.name,
      agentName: data.agent_name,
      communicationStyle: data.communication_style,
      customSystemPrompt: data.custom_system_prompt,
      useEmojis: data.use_emojis,
      signWithName: data.sign_with_name,
      restrictTopics: data.restrict_topics,
      splitLongMessages: data.split_long_messages,
      allowReminders: data.allow_reminders,
      allowHumanTransfer: data.allow_human_transfer,
      humanTransferWebhook: data.human_transfer_webhook,
      timezone: data.timezone,
      responseDelayMs: data.response_delay_ms,
      maxInteractionsPerSession: data.max_interactions_per_session,
      typingIndicator: data.typing_indicator,
      autoMarkRead: data.auto_mark_read,
      audioProcessing: data.audio_processing,
      activationTrigger: data.activation_trigger,
      terminationTrigger: data.termination_trigger,
      acceptGroupMessages: data.accept_group_messages,
      respondToPrivateChats: data.respond_to_private_chats,
      callHandling: data.call_handling,
      modelProvider: data.model_provider,
      modelName: data.model_name,
      temperature: data.temperature,
      maxTokens: data.max_tokens,
      enabled: data.enabled,
    });
  } catch (error: any) {
    console.error('[Config GET]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createStaticAdminClient();
    const body = await req.json();

    // Mapear camelCase para snake_case
    const update = {
      name: body.name,
      agent_name: body.agentName,
      communication_style: body.communicationStyle,
      custom_system_prompt: body.customSystemPrompt,
      use_emojis: body.useEmojis,
      sign_with_name: body.signWithName,
      restrict_topics: body.restrictTopics,
      split_long_messages: body.splitLongMessages,
      allow_reminders: body.allowReminders,
      allow_human_transfer: body.allowHumanTransfer,
      human_transfer_webhook: body.humanTransferWebhook,
      timezone: body.timezone,
      response_delay_ms: body.responseDelayMs,
      max_interactions_per_session: body.maxInteractionsPerSession,
      typing_indicator: body.typingIndicator,
      auto_mark_read: body.autoMarkRead,
      audio_processing: body.audioProcessing,
      activation_trigger: body.activationTrigger,
      termination_trigger: body.terminationTrigger,
      accept_group_messages: body.acceptGroupMessages,
      respond_to_private_chats: body.respondToPrivateChats,
      call_handling: body.callHandling,
      model_provider: body.modelProvider,
      model_name: body.modelName,
      temperature: body.temperature,
      max_tokens: body.maxTokens,
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('agents')
      .update(update)
      .eq('id', params.agentId);

    if (error) throw error;

    // Invalidar cache
    invalidateAgentCache(params.agentId);

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('[Config PUT]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
