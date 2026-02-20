/**
 * Agent Settings Sections
 *
 * Componentes para as 6 seções do painel
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
  config: any;
  setConfig: (config: any) => void;
}

// ============================================================================
// 1. PERSONAL INFO SECTION
// ============================================================================

export function PersonalInfoSection({ config, setConfig }: SectionProps) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Informações Pessoais</h2>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Nome do Agente</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Max Imobiliário"
          />
        </div>

        {/* Agent Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Nome para Assinatura</label>
          <input
            type="text"
            value={config.agentName}
            onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Max"
          />
        </div>

        {/* Communication Style */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Comunicação</label>
          <div className="space-y-2">
            {['formal', 'casual', 'normal'].map((style) => (
              <label key={style} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="style"
                  value={style}
                  checked={config.communicationStyle === style}
                  onChange={(e) =>
                    setConfig({ ...config, communicationStyle: e.target.value })
                  }
                  className="w-4 h-4"
                />
                <span className="capitalize">{style === 'formal' ? 'Formal' : style === 'casual' ? 'Descontraído' : 'Normal'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Comportamento Customizado (3000 caracteres)
          </label>
          <textarea
            value={config.customSystemPrompt}
            onChange={(e) =>
              setConfig({
                ...config,
                customSystemPrompt: e.target.value.substring(0, 3000),
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
            placeholder="Instruções customizadas para o agente..."
            maxLength={3000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {config.customSystemPrompt?.length || 0} / 3000 caracteres
          </p>
        </div>

        {/* Enable/Disable */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="font-medium">Agente Ativo</span>
        </label>
      </div>
    </Card>
  );
}

// ============================================================================
// 2. BEHAVIOR SECTION
// ============================================================================

export function BehaviorSection({ config, setConfig }: SectionProps) {
  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Comportamento</h2>

      {/* Respostas */}
      <div>
        <h3 className="font-medium mb-4">Formatação de Respostas</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useEmojis}
              onChange={(e) => setConfig({ ...config, useEmojis: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Usar Emojis nas Respostas</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.signWithName}
              onChange={(e) => setConfig({ ...config, signWithName: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Assinar nome do agente</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.splitLongMessages}
              onChange={(e) => setConfig({ ...config, splitLongMessages: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Dividir resposta em partes (se > 1000 chars)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allowReminders}
              onChange={(e) => setConfig({ ...config, allowReminders: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Permitir registrar lembretes</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.restrictTopics}
              onChange={(e) => setConfig({ ...config, restrictTopics: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Restringir a tópicos permitidos</span>
          </label>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// 3. TRANSFER SECTION
// ============================================================================

export function TransferSection({ config, setConfig }: SectionProps) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Transferência para Humano</h2>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.allowHumanTransfer}
          onChange={(e) => setConfig({ ...config, allowHumanTransfer: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="font-medium">Habilitar transferência para humano</span>
      </label>

      {config.allowHumanTransfer && (
        <div>
          <label className="block text-sm font-medium mb-2">
            URL do Webhook (fila de espera)
          </label>
          <input
            type="url"
            value={config.humanTransferWebhook || ''}
            onChange={(e) =>
              setConfig({ ...config, humanTransferWebhook: e.target.value || null })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// 4. ADVANCED SECTION
// ============================================================================

export function AdvancedSection({ config, setConfig }: SectionProps) {
  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Configurações Avançadas</h2>

      {/* Timing */}
      <div>
        <h3 className="font-medium mb-4">Timing</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <input
              type="text"
              value={config.timezone}
              onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="America/Recife"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tempo de Resposta (ms)
            </label>
            <input
              type="number"
              value={config.responseDelayMs}
              onChange={(e) =>
                setConfig({ ...config, responseDelayMs: parseInt(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Limite de Interações (vazio = ilimitado)
            </label>
            <input
              type="number"
              value={config.maxInteractionsPerSession || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxInteractionsPerSession: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sem limite"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <h3 className="font-medium mb-4">WhatsApp</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.typingIndicator}
              onChange={(e) => setConfig({ ...config, typingIndicator: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Indicador de Digitação</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoMarkRead}
              onChange={(e) => setConfig({ ...config, autoMarkRead: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Leitura Automática</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.acceptGroupMessages}
              onChange={(e) =>
                setConfig({ ...config, acceptGroupMessages: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span>Aceitar Mensagens de Grupos</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.respondToPrivateChats}
              onChange={(e) =>
                setConfig({ ...config, respondToPrivateChats: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span>Responder Chats Privados</span>
          </label>
        </div>
      </div>

      {/* Processing */}
      <div>
        <h3 className="font-medium mb-4">Processamento</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Processamento de Áudio</label>
            <select
              value={config.audioProcessing}
              onChange={(e) =>
                setConfig({ ...config, audioProcessing: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ignore">Ignorar</option>
              <option value="transcribe">Transcrever</option>
              <option value="analyze">Analisar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ativação do Agente</label>
            <select
              value={config.activationTrigger}
              onChange={(e) =>
                setConfig({ ...config, activationTrigger: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="always">Sempre</option>
              <option value="keyword">Palavra-chave</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Encerramento da Conversa</label>
            <select
              value={config.terminationTrigger}
              onChange={(e) =>
                setConfig({ ...config, terminationTrigger: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timeout">Timeout</option>
              <option value="user_request">Solicitação do Usuário</option>
              <option value="max_interactions">Max Interações</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Gerenciamento de Chamadas</label>
            <select
              value={config.callHandling}
              onChange={(e) =>
                setConfig({ ...config, callHandling: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ignore">Ignorar</option>
              <option value="notify">Notificar</option>
              <option value="respond">Responder</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// 5. MODEL SECTION
// ============================================================================

export function ModelSection({ config, setConfig }: SectionProps) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Modelo & Parâmetros</h2>

      <div className="space-y-4">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium mb-2">Provedor</label>
          <select
            value={config.modelProvider}
            onChange={(e) =>
              setConfig({ ...config, modelProvider: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium mb-2">Modelo</label>
          <input
            type="text"
            value={config.modelName}
            onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="gpt-4o-mini"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Temperatura: {config.temperature.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature}
            onChange={(e) =>
              setConfig({ ...config, temperature: parseFloat(e.target.value) })
            }
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            {config.temperature < 0.5
              ? 'Focado - Respostas consistentes'
              : config.temperature < 1
              ? 'Balanceado'
              : 'Criativo - Respostas variadas'}
          </p>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium mb-2">Max Tokens (Comprimento)</label>
          <input
            type="number"
            value={config.maxTokens}
            onChange={(e) =>
              setConfig({ ...config, maxTokens: parseInt(e.target.value) || 500 })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="500"
          />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// 6. PROMPT VERSIONING SECTION
// ============================================================================

interface PromptVersionProps {
  config: any;
  agentId: string;
}

export function PromptVersioningSection({ config, agentId }: PromptVersionProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [agentId]);

  async function loadVersions() {
    try {
      const response = await fetch(`/api/agents/${agentId}/prompts`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (err) {
      console.error('Erro ao carregar versões:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Versionamento de Prompts</h2>
        <Button onClick={() => loadVersions()}>Atualizar</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando versões...</p>
      ) : versions.length === 0 ? (
        <p className="text-gray-500">Nenhuma versão de prompt salva</p>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Versão {version.version}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleDateString()}
                  </p>
                  {version.notes && (
                    <p className="text-sm text-gray-600 mt-1">{version.notes}</p>
                  )}
                </div>
                <Button size="sm" variant="outline">
                  Restaurar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
