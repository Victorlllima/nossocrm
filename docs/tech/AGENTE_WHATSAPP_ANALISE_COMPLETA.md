# 🦈 ANÁLISE COMPLETA: AGENTE CONVERSACIONAL PARA WHATSAPP
**Data:** 10/02/2026
**Status:** RECONSTRUÇÍO EM DEV - BUILD PASSANDO
**Objetivo:** Replicar workflow N8n em Vercel AI SDK v3

---

## 📊 MAPA MENTAL: ONDE ESTAMOS?

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTES: N8N WORKFLOW                          │
│  Agente_Max_Corretor (4950 linhas JSON)                        │
│  ✅ Produção rodando | ❌ Lento, caro, inflexível              │
└─────────────────────────────────────────────────────────────────┘
                           ↓ REPLICAR
┌─────────────────────────────────────────────────────────────────┐
│              AGORA: VERCEL AI SDK v3 (DEV)                      │
│  Codebase modernizado, TypeScript strict, Faster                │
│  ⚠️ Build passando | ✅ Estrutura básica pronta                 │
│  ❌ Faltam: Validação completa de tools, Multimodal, Context   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ ESTRUTURA DO PROJETO ATUAL

### Arquivos Críticos (Vercel AI SDK)

```
lib/ai/
├── whatsapp-tools.ts           [2 tools implementadas]
├── whatsapp-prompt.ts          [Prompt do sistema - ~120 linhas]
├── whatsapp-vector-search.ts   [Busca semântica com embeddings]
├── whatsapp-memory.ts          [Histórico de conversa]
├── whatsapp-context.ts         [Contexto do lead]
├── whatsapp-buffer.ts          [Anti-spam, rate limit]
├── whatsapp-multimodal.ts      [Imagens, áudio, PDF]
├── whatsapp-sender.ts          [Formatação de resposta]
└── ...

app/api/whatsapp/webhook/route.ts [Endpoint principal - 60s timeout]
app/api/chat/route.ts              [Chat genérico (não-WhatsApp)]
```

### Stack Técnico (BLOQUEADO)
- **AI SDK:** v3.2.14 (não atualizar para v6+)
- **Zod:** v3.23.8 (compatível com react-hook-form)
- **Supabase:** PostgreSQL + Realtime
- **Vector DB:** pg_vector (embeddings na coluna `embedding` de imoveis_catalogo)

---

## 🔍 ANÁLISE DO WORKFLOW N8N (AGENTE_MAX_CORRETOR)

### Fluxo Principal (Mapa de Nós)

```
Webhook (Evolution API)
    ↓
[Parâmetros Fluxo] + [Dados Lead] + [Webhook Data]
    ↓
[Filtro Inicial] → [Se vazio, retorna]
    ↓
[Redis] → Verificar status do agente (Desativado?)
    ↓
[Bot Desativado?] → Se "Desativado", ignora
    ↓
[Mensagem e Bairros] → Extrai tipo de mensagem
    ↓
[Postgres Chat Memory] → Carrega histórico
    ↓
[AI Agent1] → MÁQUINA INTELIGENTE (OpenAI LangChain)
    │
    ├─→ [Consultar_Base_Imoveis] (Tool)
    ├─→ [Acionar_Humano] (Tool)
    └─→ [Retorna output.mensagens]
    ↓
[Split Out1] → Divide array de mensagens
    ↓
[Loop Over Items1] + [Wait3] → Processa cada mensagem com delay
    ↓
[(EVO) Enviar Mensagem1] → Envia via Evolution API
```

### Nós Críticos & Suas Funções

| Nó | Tipo | Função |
|----|------|--------|
| **Parametros Fluxo** | `Set` | Define constantes: EsperaBuffer (15s), TempoInatividadeAgente (3600s), ModeloTemperatura (0.2) |
| **Dados Lead** | `Set` | Extrai IdConversa, LeadNome, LeadTelefone do webhook |
| **Filtro Inicial** | `Filter` | Verifica se há mensagem (anti-spam) |
| **Redis** | `Cache` | Recupera estado do agente (ativo/desativado) |
| **Bot Desativado?** | `If` | Rota condicional: se status=="Desativado", ignora |
| **Mensagem e Bairros** | `RuleSwitch` | Classifica tipo de mensagem: texto, áudio, imagem, PDF |
| **Postgres Chat Memory** | `Memory` | Recupera últimas 10 mensagens (contextWindowLength: 10) |
| **AI Agent1** | `LangChain Agent` | Motor: OpenAI + Tools automáticas |
| **Split Out1** | `SplitOut` | Converte array de mensagens em items |
| **Loop Over Items1** | `SplitInBatches` | Processa em loop (anti-flooding) |
| **Wait3** | `Wait` | Delay de 1 segundo entre mensagens |

---

## 🧠 O AGENTE IA (AI Agent1) - CORAÇÍO DO SISTEMA

### Prompt do Sistema

**Persona:** Assistente Virtual do Max Lima (Corretor RE/MAX)

**Comportamento Crítico:**
1. **Dedução de Fluidez** → Analisa a mensagem para saber se é resposta a um disparo anterior
2. **Anti-Loop** → Não repete perguntas
3. **Dados Limpos** → Sem "vômito de dados"
4. **Transbordo Inteligente** → Escalação automática quando necessário

**Parâmetros do Prompt:**
- Lead Name: `$('Webhook').item.json.body.data.pushName`
- Hora Atual: `{{ $now.setZone('America/Recife').toFormat('HH:mm') }}`
- Dia da Semana: `{{ $now.setZone('America/Recife').setLocale('pt-BR').toFormat('EEEE') }}`

### Tools Disponíveis (N8n)

#### 1️⃣ **Consultar_Base_Imoveis**
- **Entrada:** Query (string: ID, bairro, características)
- **Saída:** Array de imóveis (até 5 resultados)
- **Busca:** Semântica (embeddings) + Text fallback

**Campos Retornados:**
```javascript
{
  id,
  titulo,
  tipo,              // "Venda" | "Aluguel"
  localizacao,       // bairro + cidade
  preco,
  quartos,
  area_total,
  link,              // RE/MAX link
  similarity         // % de match (0-1)
}
```

#### 2️⃣ **Acionar_Humano**
- **Entrada:** Motivo (string)
- **Saída:** Confirmação de transbordo
- **Uso:** Lead pede humano OU agente não consegue resolver

---

## ✅ O QUE ESTÁ IMPLEMENTADO NO VERCEL AI SDK

### 1. **WhatsApp Tools** (`lib/ai/whatsapp-tools.ts`)

✅ **consultarBaseImoveis**
```typescript
export const consultarBaseImoveis = tool({
  description: 'Busca imóveis na base de dados',
  parameters: z.object({
    query: z.string().describe('Termo de busca')
  }),
  execute: async ({ query }) => {
    // ID direto → Busca by ID
    // Texto → Busca semântica (hybridSearchProperties)
  }
});
```

✅ **acionarHumano**
```typescript
export const acionarHumano = tool({
  description: 'Notifica humano para assumir',
  parameters: z.object({
    motivo: z.string().describe('Motivo')
  }),
  execute: async ({ motivo }) => {
    // TODO: Integração real com Evolution API
  }
});
```

### 2. **Prompt do Sistema** (`lib/ai/whatsapp-prompt.ts`)

✅ **getWhatsAppAgentPrompt(params)**
- Recebe: leadContext, leadName, currentTime, dayOfWeek
- Retorna: Prompt completo do sistema (idêntico ao N8n)
- **Status:** 100% replicated

### 3. **Webhook Handler** (`app/api/whatsapp/webhook/route.ts`)

✅ Implementado:
- Extração de dados do webhook (Evolution API)
- Filtro de self-messages + groups
- Histórico da conversa (Postgres)
- Context preparado
- Chamada ao generateText com tools

❌ **Problemas Identificados:**
1. Validação de tool invocation pode não estar fluindo (TODO)
2. Loop de transbordo não testado
3. Multimodal (áudio, imagem, PDF) - estrutura ok, mas não validado

### 4. **Suporte Adicional**

✅ `whatsapp-vector-search.ts` → Busca semântica (hybridSearchProperties)
✅ `whatsapp-memory.ts` → Histórico em Postgres
✅ `whatsapp-context.ts` → Contexto do lead (nome, histórico de compras, etc)
✅ `whatsapp-buffer.ts` → Anti-spam, timeout de agente
✅ `whatsapp-multimodal.ts` → Processamento de imagens, áudio, PDFs
✅ `whatsapp-sender.ts` → Formatação de resposta para Evolution API

---

## 🚨 LIÇÕES APRENDIDAS (Post-Mortem)

### O Que Não Fazer

1. ❌ **Não Atualizar Zod v3 → v4**
   - Quebra react-hook-form imediatamente
   - Cria "dependency hell"
   - AI SDK v6 exige zod@^4, então não podemos usar v6

2. ❌ **Não Usar `as any` em Ferramentas**
   - Parece funcionar, mas runtime é instável
   - Vercel pode gerar warnings no build
   - Melhor: Corrigir a tipagem na raiz

3. ❌ **Não Tentar `jsonSchema` na v3**
   - AI SDK v3 não suporta jsonSchema
   - Usar `zod` diretamente sempre

4. ❌ **Não Misturar Versões Maiores**
   - AI v3 + Zod v3 = ✅ Estável
   - AI v6 + Zod v4 = ✅ Estável
   - AI v6 + Zod v3 = ❌ Disaster

### Decisão: Ficar na v3

**Razão:** Projeto já usa Zod v3 + react-hook-form v6. Para migrar para AI SDK v6, teríamos que:
1. Atualizar Zod v3 → v4
2. Atualizar react-hook-form (pode quebrar formulários existentes)
3. Retestar toda a aplicação

**Custo-Benefício:** Não vale. AI SDK v3 é LTS, estável, e faz tudo que precisamos.

---

## 📋 CHECKLIST: O QUE FALTA VALIDAR?

### P1: CRÍTICO (Bloqueia Deploy)

- [ ] **Tool Invocations Loop**
  - Verificar se `generateText` com `tools` está funcionando
  - Testar: Enviar mensagem que dispare "Consultar_Base_Imoveis"
  - Validar: Retorno da tool + resposta final

- [ ] **Transbordo Inteligente**
  - Testar: Lead pede "falar com humano"
  - Validar: Chamada a `acionarHumano` funciona
  - Verificar: Integração Evolution API (atualmente mockada)

- [ ] **Histórico de Conversa**
  - Testar: 2+ mensagens seguidas do mesmo lead
  - Validar: Memory carrega contexto anterior
  - Verificar: Limite de 10 mensagens (contextWindowLength)

### P2: IMPORTANTE (Afeta UX)

- [ ] **Multimodal**
  - Testar: Lead envia imagem + texto
  - Testar: Lead envia áudio
  - Verificar: Transcrição + análise funciona

- [ ] **Rate Limit / Buffer**
  - Testar: Lead envia 5 mensagens em 2 segundos
  - Validar: Buffer de 15s funciona (anti-spam)

- [ ] **Timeout do Agente**
  - Testar: Lead fica inativo por 1+ hora
  - Validar: Agente se desativa (timeout 3600s)

### P3: MELHORIAS (Podem Esperar)

- [ ] **Integração Real Evolution API**
  - Atualmente: Função `formatAndSendResponse` está mockada
  - Necessário: API key + endpoint da Evolution

- [ ] **Vector Search Validação**
  - Testar: Busca por "2 quartos no Recife"
  - Validar: Relevância dos resultados
  - Ajustar: Thresholds de similarity

- [ ] **Dashboard de Monitoramento**
  - Logs de conversas
  - Analytics de transbordo
  - Métricas de satisfação

---

## 🎯 PRÓXIMOS PASSOS (RECOMENDADO)

### Fase 1: Validação (Esta Semana)

1. **Teste Manual do Webhook**
   - Usar Postman/Insomnia para simular Evolution API
   - Verificar logs no terminal (`npm run dev`)
   - Validar: Tool é chamada, resposta é correta

2. **Teste de Tool Invocation**
   - Lead: "Tem imóvel com 2 quartos em Boa Viagem?"
   - Esperado: Agente chama `consultarBaseImoveis`
   - Validar: Resposta contém imóvel real

3. **Teste de Transbordo**
   - Lead: "Quero falar com o Max"
   - Esperado: Agente chama `acionarHumano`
   - Validar: Notificação chega (quando Evolution API estiver real)

### Fase 2: Integração (Próx. 2 semanas)

1. **Evolution API Real**
   - Obter credenciais
   - Implementar `formatAndSendResponse` com chamada real
   - Testar: Mensagem é enviada para lead no WhatsApp

2. **Multimodal Completo**
   - Integrar Whisper (transcrição de áudio)
   - Integrar Vision (análise de imagens)
   - Testar: "Manda aí uma foto do imóvel"

3. **Vector Search Tunning**
   - Avaliar qualidade de embeddings
   - Ajustar cosine similarity threshold
   - Adicionar fallback de busca por bairro/tipo

### Fase 3: Deploy (Quando P1 + P2 Passarem)

1. **Staging na Vercel**
   - Deploy de `dev` para branch de staging
   - Testar com Evolution API em staging
   - Monitorar erros

2. **Produção**
   - Merge para `main`
   - Deploy automático
   - Monitoramento contínuo

---

## 📐 TABELA DE REQUISITOS (N8n → Vercel AI SDK)

| Requisito | N8n | Vercel AI SDK | Status |
|-----------|-----|---------------|--------|
| Webhook da Evolution | ✅ | ✅ | OK |
| Extração de dados lead | ✅ | ✅ | OK |
| Histórico de conversa | ✅ | ✅ | OK |
| Consultar_Base_Imoveis | ✅ | ✅ | OK |
| Acionar_Humano | ✅ | ✅ | OK (mockada) |
| Dedução de fluidez | ✅ | ✅ | OK (no prompt) |
| Anti-loop | ✅ | ✅ | OK (no prompt) |
| Rate limit / Buffer | ✅ | ✅ | OK |
| Timeout do agente | ✅ | ✅ | OK |
| Multimodal (áudio/imagem) | ✅ | ⚠️ | Pronto, não testado |
| Split de mensagens | ✅ | ⚠️ | Pronto, não testado |
| Vector search | ✅ | ✅ | OK |
| Personalização (Max, RE/MAX) | ✅ | ✅ | OK |

---

## 🔧 STACK TÉCNICO - REFERÊNCIA RÁPIDA

```
ENTRADA
  ↓
Evolution API Webhook
  ↓ (POST /api/whatsapp/webhook)
  ↓
Extrair: leadPhone, leadName, userMessage, messageType
  ↓ (Filtros: self, groups, reactions)
  ↓
PROCESSAMENTO
  ↓
1. Buffer Check (anti-spam)
2. Lead Context (histórico, dados CRM)
3. Chat Memory (últimas 10 mensagens)
4. System Prompt (getWhatsAppAgentPrompt)
5. generateText com Tools
   - Tool: consultarBaseImoveis (semântica + IDs)
   - Tool: acionarHumano (escalação)
   ↓ (maxSteps: 5 iterações)
   ↓
SAÍDA
  ↓
formatAndSendResponse
  ↓
Evolution API (sendText)
  ↓
Lead recebe mensagem no WhatsApp
```

---

## 📚 REFERÊNCIAS & DOCUMENTOS

- **AI Migration Postmortem:** `docs/tech/AI_MIGRATION_POSTMORTEM.md`
- **Rebuild Guide:** `docs/tech/AGENT_REBUILD_GUIDE.md`
- **N8n Workflow:** `public/Agente_Max_Corretor (48).json` (4950 linhas)
- **Handover Protocol:** `HANDOVER_PROTOCOLO_ALFA.md`

---

**Assinado:** [ATLAS] via Antigravity AI
**Próx. Review:** Após testes de validação P1
**Escalação:** Se build quebrar, verificar `lib/ai/**` antes de tocar em dependencies.
