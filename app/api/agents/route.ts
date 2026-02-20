/**
 * Agents API - CRUD
 *
 * GET - Lista agentes
 * POST - Cria novo agente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStaticAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createStaticAdminClient();

    // TODO: Obter organizationId do usuário autenticado
    // Por enquanto, apenas retorna todos (em produção, filtrar por org)

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Agents GET]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createStaticAdminClient();
    const body = await req.json();

    // TODO: Obter organizationId e userId do request autenticado
    const organizationId = body.organization_id || 'todo';
    const userId = body.created_by || 'todo';

    const agent = {
      organization_id: organizationId,
      name: body.name,
      agent_name: body.agent_name || 'Agent',
      communication_style: body.communication_style || 'normal',
      custom_system_prompt: body.custom_system_prompt || '',
      use_emojis: body.use_emojis || false,
      sign_with_name: body.sign_with_name || false,
      restrict_topics: body.restrict_topics || false,
      split_long_messages: body.split_long_messages !== false,
      allow_reminders: body.allow_reminders || false,
      allow_human_transfer: body.allow_human_transfer !== false,
      human_transfer_webhook: body.human_transfer_webhook || null,
      timezone: body.timezone || 'America/Recife',
      response_delay_ms: body.response_delay_ms || 0,
      max_interactions_per_session: body.max_interactions_per_session || null,
      typing_indicator: body.typing_indicator !== false,
      auto_mark_read: body.auto_mark_read || false,
      audio_processing: body.audio_processing || 'ignore',
      activation_trigger: body.activation_trigger || 'always',
      termination_trigger: body.termination_trigger || 'timeout',
      accept_group_messages: body.accept_group_messages || false,
      respond_to_private_chats: body.respond_to_private_chats !== false,
      call_handling: body.call_handling || 'ignore',
      model_provider: body.model_provider || 'openai',
      model_name: body.model_name || 'gpt-4o-mini',
      temperature: body.temperature || 0.3,
      max_tokens: body.max_tokens || 500,
      enabled: body.enabled !== false,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('agents')
      .insert(agent)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[Agents POST]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
