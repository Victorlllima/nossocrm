/**
 * Agent Conversations Page
 *
 * Histórico de conversas com leads
 * Permite replay, análise e exportação
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Download } from 'lucide-react';

interface Conversation {
  id: string;
  phone: string;
  leadName: string;
  status: 'active' | 'completed' | 'transferred';
  interactionCount: number;
  startedAt: string;
  endedAt?: string;
}

export default function ConversationsPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [agentId]);

  async function loadConversations() {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${agentId}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Carregando conversas...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Conversas</h1>
        <p className="text-gray-500 mt-1">
          Total: {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhuma conversa ainda</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card key={conv.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{conv.leadName}</p>
                  <p className="text-sm text-gray-600">{conv.phone}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Iniciada: {new Date(conv.startedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Interações: {conv.interactionCount}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Ver Conversa
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
