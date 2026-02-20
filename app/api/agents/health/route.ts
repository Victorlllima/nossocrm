/**
 * Health Check Endpoint
 *
 * Monitora status do sistema de agentes
 * Útil para alertas e monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllAccumulators, getCacheInfo } from '@/lib/ai/agents';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Informações do buffer
    const accumulators = getAllAccumulators();
    const bufferInfo = {
      activeBuffers: accumulators.size,
      details: Array.from(accumulators.entries()).map(([key, entry]) => ({
        key,
        messageCount: entry.messages.length,
        isProcessing: entry.isProcessing,
        ageSeconds: Math.round((Date.now() - entry.lastMessageAt) / 1000),
      })),
    };

    // Informações de cache
    const cacheInfo = getCacheInfo();

    // Status geral
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      buffer: bufferInfo,
      cache: cacheInfo,
      uptime: process.uptime(),
    };

    return NextResponse.json(health);

  } catch (error: any) {
    console.error('[Health] Erro:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
