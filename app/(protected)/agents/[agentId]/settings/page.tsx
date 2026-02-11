/**
 * Agent Settings Page
 *
 * Painel completo de configuração do agente
 * Com 6 seções: Pessoal, Comportamento, Transferência, Avançadas, Modelo, Versionamento
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  PersonalInfoSection,
  BehaviorSection,
  TransferSection,
  AdvancedSection,
  ModelSection,
  PromptVersioningSection,
} from './sections';

interface AgentConfig {
  id: string;
  name: string;
  agentName: string;
  communicationStyle: 'formal' | 'casual' | 'normal';
  customSystemPrompt: string;
  useEmojis: boolean;
  signWithName: boolean;
  restrictTopics: boolean;
  splitLongMessages: boolean;
  allowReminders: boolean;
  allowHumanTransfer: boolean;
  humanTransferWebhook: string | null;
  timezone: string;
  responseDelayMs: number;
  maxInteractionsPerSession: number | null;
  typingIndicator: boolean;
  autoMarkRead: boolean;
  audioProcessing: 'ignore' | 'transcribe' | 'analyze';
  activationTrigger: 'always' | 'keyword' | 'manual';
  terminationTrigger: 'timeout' | 'user_request' | 'max_interactions';
  acceptGroupMessages: boolean;
  respondToPrivateChats: boolean;
  callHandling: 'ignore' | 'notify' | 'respond';
  modelProvider: 'openai' | 'anthropic' | 'google';
  modelName: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

export default function AgentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, [agentId]);

  async function loadConfig() {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${agentId}/config`);
      if (!response.ok) throw new Error('Falha ao carregar configuração');
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Falha ao salvar');
      alert('Configuração salva com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Agente não encontrado</p>
        <Button onClick={() => router.push('/agents')}>Voltar para Agentes</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{config.name}</h1>
          <p className="text-gray-500 mt-1">Configurações do agente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/agents')}>
            Cancelar
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="personal">Pessoal</TabsTrigger>
          <TabsTrigger value="behavior">Comportamento</TabsTrigger>
          <TabsTrigger value="transfer">Transferência</TabsTrigger>
          <TabsTrigger value="advanced">Avançadas</TabsTrigger>
          <TabsTrigger value="model">Modelo</TabsTrigger>
          <TabsTrigger value="versions">Versões</TabsTrigger>
        </TabsList>

        {/* 1. Personal Info */}
        <TabsContent value="personal">
          <PersonalInfoSection config={config} setConfig={setConfig} />
        </TabsContent>

        {/* 2. Behavior */}
        <TabsContent value="behavior">
          <BehaviorSection config={config} setConfig={setConfig} />
        </TabsContent>

        {/* 3. Transfer */}
        <TabsContent value="transfer">
          <TransferSection config={config} setConfig={setConfig} />
        </TabsContent>

        {/* 4. Advanced */}
        <TabsContent value="advanced">
          <AdvancedSection config={config} setConfig={setConfig} />
        </TabsContent>

        {/* 5. Model */}
        <TabsContent value="model">
          <ModelSection config={config} setConfig={setConfig} />
        </TabsContent>

        {/* 6. Versions */}
        <TabsContent value="versions">
          <PromptVersioningSection config={config} agentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
