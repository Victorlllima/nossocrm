# 🚀 AGENTS PLATFORM - SETUP GUIDE

**Data:** 11/02/2026
**Status:** ✅ Foundation Criada
**Próximo Passo:** Executar Migrations + Webhooks

---

## 📋 O QUE FOI CRIADO

### 1️⃣ **Database Migrations** (`supabase/migrations/001_create_agents_tables.sql`)
- ✅ `agents` - Configuração dos agentes
- ✅ `agent_prompt_versions` - Versionamento de prompts
- ✅ `agent_conversations` - Histórico de conversas
- ✅ `agent_messages` - Mensagens individuais

### 2️⃣ **Core TypeScript Modules** (`lib/ai/agents/`)
- ✅ `message-accumulator.ts` - Buffer em-memória (sem Redis)
- ✅ `agent-config-loader.ts` - Carrega config dinâmica do agente
- ✅ `prompt-builder.ts` - Constrói prompts dinamicamente
- ✅ `conversation-manager.ts` - Gerencia histórico de conversas
- ✅ `index.ts` - Exporta tudo

---

## 🔧 COMO EXECUTAR AS MIGRATIONS

### Opção 1: Via Supabase Console (RECOMENDADO para DEV)

1. Abra seu Supabase Project: https://app.supabase.com
2. Vá para **SQL Editor**
3. Cole o conteúdo de `supabase/migrations/001_create_agents_tables.sql`
4. Clique **Run** (ou Ctrl+Enter)
5. Aguarde ~5-10 segundos

**Resultado esperado:**
```
✅ CREATE TABLE agents
✅ CREATE TABLE agent_prompt_versions
✅ CREATE TABLE agent_conversations
✅ CREATE TABLE agent_messages
```

### Opção 2: Via Supabase CLI (Local)

```bash
# Se você usa o Supabase CLI localmente
supabase db push --local

# Ou se estiver em dev remoto
supabase migration push
```

---

## 📊 ESTRUTURA DO BANCO

### Tabela: `agents`
```
Armazena CONFIGURAÇÍO dos agentes
- id, organization_id, name
- Informações pessoais (agent_name, communication_style)
- Comportamento (use_emojis, sign_with_name, etc)
- Configurações avançadas (timezone, audio_processing, etc)
- Modelo (temperature, max_tokens, provider)
```

### Tabela: `agent_conversations`
```
Armazena CONVERSA entre agente e lead
- id, agent_id, phone_number, lead_name
- status (active/completed/transferred)
- interaction_count
- conversation_context (JSONB para dados customizados)
```

### Tabela: `agent_messages`
```
Armazena MENSAGENS individuais
- conversation_id, role (user/assistant), content
- Rastreamento: model_used, tokens_used, latency_ms
```

---

## 🎯 COMO USAR A FOUNDATION

### 1️⃣ Carregar Configuração do Agente

```typescript
import { loadAgentConfig } from '@/lib/ai/agents';

const agentId = 'uuid-do-agente';
const config = await loadAgentConfig(agentId);

if (!config.enabled) {
  return NextResponse.json({ status: 'disabled' });
}
```

### 2️⃣ Acumular Mensagens (com delay)

```typescript
import { addMessageToAccumulator, markAsProcessing, clearAccumulator } from '@/lib/ai/agents';

// Lead envia: "Oi, qual é o preço?"
const result = addMessageToAccumulator(
  agentId,
  userPhone,
  "Oi, qual é o preço?",
  5000 // Aguardar 5 segundos por mais mensagens
);

if (result.shouldProcess) {
  // Processar todas as mensagens acumuladas
  const allMessages = result.accumulatedMessages;
  // ... chamar IA ...
  clearAccumulator(agentId, userPhone);
}
```

### 3️⃣ Gerenciar Conversas

```typescript
import {
  getOrCreateConversation,
  addMessageToConversation,
  getFormattedConversationHistory,
  incrementInteractionCount,
} from '@/lib/ai/agents';

// Criar ou recuperar conversa ativa
const conversation = await getOrCreateConversation(
  agentId,
  organizationId,
  userPhone,
  leadName
);

// Recuperar histórico (com trimming automático)
const history = await getFormattedConversationHistory(conversation.id);

// ... processar com IA ...

// Salvar mensagens
await addMessageToConversation(conversation.id, 'user', userMessage);
await addMessageToConversation(conversation.id, 'assistant', aiResponse);

// Incrementar contador
await incrementInteractionCount(conversation.id);
```

### 4️⃣ Construir Prompt Dinamicamente

```typescript
import { buildSystemPrompt, formatResponse } from '@/lib/ai/agents';

const systemPrompt = buildSystemPrompt(config, leadName, leadPhone, additionalContext);

// ... chamar IA com systemPrompt ...

const formatted = formatResponse(aiResponse, config);
// Aplicará: assinatura, emojis, truncamento, etc
```

---

## 🧪 TESTE RÁPIDO

Para verificar que tudo está funcionando:

```typescript
// 1. Verificar se tabelas existem
// Via Supabase Console → Table Editor → Você deve ver 4 tabelas novas

// 2. Testar config loader
const config = await loadAgentConfig('algum-uuid');
console.log(config); // Deve retornar AgentConfig

// 3. Testar accumulator
const result = addMessageToAccumulator('agent1', '5561999999', 'Oi!', 5000);
console.log(result); // { shouldProcess: false, accumulatedMessages: [] }

// 4. Testar conversation
const conv = await getOrCreateConversation('agent1', 'org1', '5561999999', 'João');
console.log(conv); // { id: 'uuid', status: 'active', ... }
```

---

## ⚠️ IMPORTANTE

1. **organization_id**: Deve corresponder a um ID válido da tabela `organizations` do NossoCRM
2. **Cache TTL**: Config fica em cache por 5 minutos. Use `invalidateAgentCache()` após atualizar
3. **Buffer em RAM**: Se o servidor reiniciar, mensagens buffered são perdidas (projeto)
4. **Context Window**: Automáticamente trimado em ~4000 tokens
5. **Sem Redis**: Nenhuma dependência de Redis necessária

---

## 📈 PRÓXIMOS PASSOS

- [ ] **Fase 2:** Criar webhook multi-agente (`app/api/agents/webhook/[agentId]/route.ts`)
- [ ] **Fase 3:** Criar painel de settings (`app/(protected)/agents/`)
- [ ] **Fase 4:** Testar com múltiplos agentes

---

## 🆘 TROUBLESHOOTING

### "Table does not exist"
→ Verifique se executou a migration. Vá para SQL Editor e cole de novo.

### "organization_id not found"
→ organization_id deve ser um UUID válido da tabela `organizations`.

### "Cache hits are slow"
→ Aumente CACHE_TTL_MS em `agent-config-loader.ts` (default: 5 minutos).

### "Accumulated messages not processing"
→ Verifique que `accumulationTimeMs` está correto. Default é 5000ms (5 segundos).

---

**Criado por:** Atlas
**Data:** 11/02/2026
**Status:** ✅ Pronto para Fase 2 (Webhooks)
