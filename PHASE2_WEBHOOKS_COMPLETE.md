# 🎯 PHASE 2: WEBHOOKS - 100% COMPLETO

**Data:** 11/02/2026
**Status:** ✅ READY FOR TESTING
**Próximo:** PHASE 3 (Painel UI)

---

## 📦 ENTREGÁVEIS CRIADOS

### **2 Novos Endpoints Criados**

#### 1. **`app/api/agents/webhook/[agentId]/route.ts`** (293 linhas)

**Flow Completo:**
```
1. ✅ Parse webhook da Evolution API
2. ✅ Validação de tenant isolation (organization_id)
3. ✅ Carrega config dinâmica do agente
4. ✅ Aplica accumulator (buffer X segundos)
5. ✅ Recupera/cria conversa
6. ✅ Carregar histórico (com auto-trimming)
7. ✅ Construir prompt customizado
8. ✅ Chamar IA (OpenAI + Anthropic fallback)
9. ✅ Salvar conversa
10. ✅ Enviar resposta via Evolution API
11. ✅ Limpar buffer
```

**Características:**
- ✅ Retry com exponential backoff
- ✅ Model fallback chain (OpenAI → Anthropic)
- ✅ Limite de interações por sessão
- ✅ Rastreamento completo (requestId, latência)
- ✅ Error handling robusto
- ✅ Isolamento de tenant garantido

#### 2. **`app/api/agents/health/route.ts`** (40 linhas)

**Informações Monitoradas:**
- Buffer ativo (quantidade, status)
- Cache (agentes em cache, idade)
- Uptime
- Timestamp

---

## 🧪 COMO TESTAR

### Teste 1: Webhook Simples

```bash
curl -X POST http://localhost:3000/api/agents/webhook/YOUR_AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "messageType": "conversation",
      "key": {
        "remoteJid": "5561999999999@s.whatsapp.net",
        "fromMe": false
      },
      "message": {
        "conversation": "Oi, qual é o preço?"
      },
      "pushName": "João"
    }
  }'
```

**Resposta Esperada:**
```json
{
  "status": "buffered",
  "waitingMs": 5000
}
```

(Aguarda 5 segundos por mais mensagens. Depois processa tudo.)

---

### Teste 2: Health Check

```bash
curl http://localhost:3000/api/agents/health
```

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-11T...",
  "buffer": {
    "activeBuffers": 1,
    "details": [
      {
        "key": "agent-id:5561999999999",
        "messageCount": 2,
        "isProcessing": false,
        "ageSeconds": 3
      }
    ]
  },
  "cache": {
    "totalCached": 1,
    "agents": [...]
  },
  "uptime": 123.45
}
```

---

### Teste 3: Múltiplas Mensagens (Accumulator)

```bash
# Mensagem 1
curl -X POST http://localhost:3000/api/agents/webhook/AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5561999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"Oi"},"pushName":"João"}}'

# Mensagem 2 (< 5s depois)
curl -X POST http://localhost:3000/api/agents/webhook/AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5561999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"Quanto custa?"},"pushName":"João"}}'

# Mensagem 3 (> 5s depois) - PROCESSA TUDO
curl -X POST http://localhost:3000/api/agents/webhook/AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5561999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"Tem piscina?"},"pushName":"João"}}'
```

**Primeira + Segunda:** Retorna `"status": "buffered"`
**Terceira:** Processa as 3 mensagens e retorna `"status": "success"`

---

## 🔧 PRÉ-REQUISITOS PARA TESTES

1. ✅ Migration executada (tabelas criadas)
2. ✅ Agente criado no banco

   ```sql
   INSERT INTO agents (
     id, organization_id, name, agent_name,
     communication_style, enabled, created_by, model_provider, model_name
   ) VALUES (
     'your-agent-uuid',
     'your-org-uuid',
     'Test Agent',
     'TestBot',
     'normal',
     true,
     'your-user-uuid',
     'openai',
     'gpt-4o-mini'
   );
   ```

3. ✅ Environment variables configuradas:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `EVOLUTION_API_URL`
   - `EVOLUTION_API_KEY`

---

## 🎯 FLUXO COMPLETO (COM ACCUMULATOR)

```
Timeline (em segundos):

0s    → Msg 1 chega: "Oi"
       └─ addMessageToAccumulator → shouldProcess: false
       └─ Retorna HTTP 200 "buffered"

2s    → Msg 2 chega: "Qual preço?"
       └─ addMessageToAccumulator → shouldProcess: false
       └─ Retorna HTTP 200 "buffered"

5s    → TIMEOUT do accumulator
       └─ (nenhuma ação, aguarda nova msg)

7s    → Msg 3 chega: "Tem piscina?"
       └─ addMessageToAccumulator → shouldProcess: TRUE!
       └─ accumulatedMessages: ["Oi", "Qual preço?", "Tem piscina?"]
       └─ Processa as 3 mensagens
       └─ Retorna HTTP 200 "success" + resposta
```

---

## 🚨 TENANT ISOLATION

**Garantido por:**
1. Validação `validateAgentOwnership()` - verifica se agente pertence a organization
2. `organization_id` em todas as tabelas
3. `getOrCreateConversation()` usa organization_id implicitamente

**Cenário seguro:**
- Agente A (Org 1) NÃO pode processar com Agente B (Org 2)
- Históricos completamente isolados por organization_id

---

## 📊 PERFORMANCE ESPERADA

| Métrica | Valor |
|---------|-------|
| **Latência (sem buffer)** | 3-8s (depende IA) |
| **Latência com buffer** | 5s (espera) + 3-8s (IA) |
| **Taxa de sucesso** | 99%+ (com fallback) |
| **Memory overhead** | ~2-5MB per 1000 leads |

---

## 🔐 SEGURANÇA

✅ **Tenant Isolation** - Validado em cada request
✅ **Organization ID** - Obrigatório em tabelas
✅ **Agente Disabled** - Retorna 503
✅ **Max Interactions** - Respeitado por config
✅ **Error Cleanup** - Buffer limpo mesmo em erro

---

## 📝 PRÓXIMA AÇÃO

1. **Criar agente de teste** (insert no banco)
2. **Testar health check** (deve retornar healthy)
3. **Fazer curl do webhook** (com agent_id e phone)
4. **Verificar logs** (deve ver: buffered → processing → success)
5. **Confirmar que funcionou**

---

## 🔧 ESTRUTURA DE PASTAS FINAL

```
app/api/agents/
├─ webhook/
│  └─ [agentId]/
│     └─ route.ts ✅ (293 linhas)
│
└─ health/
   └─ route.ts ✅ (40 linhas)

lib/ai/agents/
├─ message-accumulator.ts ✅
├─ agent-config-loader.ts ✅
├─ prompt-builder.ts ✅
├─ conversation-manager.ts ✅
└─ index.ts ✅
```

---

## 🆘 TROUBLESHOOTING

### "Agent not found"
→ Verifique agent_id (deve ser UUID válido)
→ Agent deve estar no banco com enabled = true

### "Organization isolation failed"
→ Verifique organization_id
→ Agente deve pertencer à organization

### "Buffered" na terceira mensagem
→ Isso é **normal**! Espere 5 segundos após 2ª msg
→ Na 3ª msg (após timeout), vai processar todas

### Resposta vazia
→ Verifique API keys (OpenAI/Anthropic)
→ Verifique Evolution API credentials
→ Veja logs para erro exato

---

**Criado por:** Atlas
**Data:** 11/02/2026
**Status:** ✅ Pronto para testes
**Próximo:** PHASE 3 (Painel de Settings)

🚀 **PHASE 2 COMPLETA!**
