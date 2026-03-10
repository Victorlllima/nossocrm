/**
 * Agent Resource API
 *
 * DELETE - Deleta agente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { clearAllConfigCache } from '@/lib/ai/agents';

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ agentId: string }> }
) {
  try {
    const params = await ctx.params;
    const supabase = createStaticAdminClient();

    // Deletar agente (cascata deleta conversas e mensagens)
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', params.agentId);

    if (error) throw error;

    // Limpar cache
    clearAllConfigCache();

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('[Agent DELETE]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
