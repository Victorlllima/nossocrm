/**
 * Agents List Page
 *
 * Lista todos os agentes da organização
 * Permite criar, editar, deletar e duplicar agentes
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Copy, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Agent {
  id: string;
  name: string;
  agentName: string;
  communicationStyle: string;
  enabled: boolean;
  modelProvider: string;
  modelName: string;
  temperature: number;
  createdAt: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      setLoading(true);
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Falha ao carregar agentes');
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function deleteAgent(agentId: string) {
    if (!confirm('Tem certeza que deseja deletar este agente?')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Falha ao deletar');
      setAgents(agents.filter((a) => a.id !== agentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar');
    }
  }

  async function duplicateAgent(agent: Agent) {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...agent,
          name: `${agent.name} (cópia)`,
          agentName: `${agent.agentName} Copy`,
        }),
      });
      if (!response.ok) throw new Error('Falha ao duplicar');
      const newAgent = await response.json();
      setAgents([...agents, newAgent]);
      router.push(`/agents/${newAgent.id}/settings`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao duplicar');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Carregando agentes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes WhatsApp</h1>
          <p className="text-gray-500 mt-1">Gerencie seus agentes de IA</p>
        </div>
        <Button
          onClick={() => router.push('/agents/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Agente
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty State */}
      {agents.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhum agente criado ainda</p>
          <Button onClick={() => router.push('/agents/new')}>Criar Primeiro Agente</Button>
        </Card>
      ) : (
        /* Agents Grid */
        <div className="grid gap-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/agents/${agent.id}/settings`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{agent.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        agent.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {agent.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">Nome: {agent.agentName}</p>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Estilo</span>
                      <p className="font-medium capitalize">{agent.communicationStyle}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Modelo</span>
                      <p className="font-medium">{agent.modelName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Temperatura</span>
                      <p className="font-medium">{agent.temperature.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/agents/${agent.id}/settings`);
                    }}
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateAgent(agent);
                    }}
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAgent(agent.id);
                    }}
                    title="Deletar"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
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
