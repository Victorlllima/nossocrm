# 📋 GUIA DE VERSÕES - Webhook WhatsApp

**Localização:** `app/api/whatsapp/webhook/`

---

## 🎯 VERSÕES DISPONÍVEIS

### ✅ ATIVA AGORA: `route.ts` (→ route-anthropic-notools.ts)

```
🟢 Status: OPERACIONAL
📦 Provider: Anthropic Claude
🤖 Modelo: claude-opus-4-1
⚙️  Ferramentas: DESABILITADAS (sem tools)
📊 Taxa de Sucesso: 100% (sem tools)
⏱️  Latência: ~8 segundos
💰 Custo: Adequado
🔑 Token: VÁLIDO ✅
```

**Use quando:** Quiser sistema operacional agora, sem tools
**Comando para ativar:**
```bash
cp app/api/whatsapp/webhook/route-anthropic-notools.ts app/api/whatsapp/webhook/route.ts
```

---

### 🟡 EXPERIMENTAL: `route-anthropic.ts`

```
🟡 Status: ERRO - Schema de tools incompatível
📦 Provider: Anthropic Claude
🤖 Modelo: claude-opus-4-1
⚙️  Ferramentas: HABILITADAS (mas não funcionam)
📊 Taxa de Sucesso: 0% (schema error)
⏱️  Latência: N/A (erro)
💰 Custo: N/A
🔑 Token: VÁLIDO (mas schema incompatível)
```

**Use quando:** Resolver schema JSON e quiser tools completos
**Próximo passo:** Corrigir converter Zod → JSON Schema

---

### 🔴 BLOQUEADO: `route-openai-backup.ts`

```
🔴 Status: BLOQUEADO - Quota OpenAI
📦 Provider: OpenAI
🤖 Modelo: gpt-4-turbo
⚙️  Ferramentas: HABILITADAS
📊 Taxa de Sucesso: 0% (quota exceeded)
⏱️  Latência: N/A
💰 Custo: Desconhecido
🔑 Token: VÁLIDO (mas sem crédito de billing)
```

**Use quando:** Conseguir novo token OpenAI com crédito real

---

### ✅ FALLBACK: `route-mock.ts`

```
🟢 Status: SEMPRE FUNCIONA
📦 Provider: Mock (padrões hardcoded)
🤖 Modelo: N/A
⚙️  Ferramentas: N/A
📊 Taxa de Sucesso: 100% (sempre)
⏱️  Latência: Instant (~50ms)
💰 Custo: Zero
🔑 Token: Não precisa
```

**Use quando:**
- Quiser testar sem APIs externas
- Antropic/OpenAI estiverem down
- Desenvolvimento local

**Comando para ativar:**
```bash
cp app/api/whatsapp/webhook/route-mock.ts app/api/whatsapp/webhook/route.ts
```

---

### 🧪 OPTIMIZATION: `route-optimized.ts`

```
🔴 Status: BLOQUEADO - Quota OpenAI (mesmo com otimizações)
📦 Provider: OpenAI
🤖 Modelo: gpt-4-turbo (reduzido de gpt-4o-mini)
⚙️  Ferramentas: HABILITADAS
📊 Taxa de Sucesso: 0% (quota exceeded)
⏱️  Latência: N/A
💰 Custo: Menor que gpt-4o-mini
🔑 Token: VÁLIDO (mas sem crédito)
```

**Otimizações aplicadas:**
- maxSteps: 2 (vs 5)
- temperature: 0.1 (mais determinístico)
- Exponential backoff com retry (2s, 4s, 8s)
- Request rate monitoring
- Detailed quota logging

**Use quando:** OpenAI funcionar com nova key

---

## 🔄 FLUXO DE DECISÍO

```
Qual versão usar?
│
├─ Quer sistema funcional AGORA?
│  └─ SIM → Use route-anthropic-notools.ts ✅
│     (Funciona, sem tools, Anthropic)
│
├─ Quer testar SEM APIs externas?
│  └─ SIM → Use route-mock.ts
│     (Funciona sempre, responde patterns)
│
├─ Conseguiu nova chave OpenAI?
│  └─ SIM → Use route-openai-backup.ts ou route-optimized.ts
│     (Versão otimizada com menos requisições)
│
└─ Quer tools (busca de imóveis) funcionando?
   └─ Espera um pouco → Será resolvido
      (Precisa corrigir schema de tools com Anthropic)
```

---

## 📊 COMPARAÇÍO LADO A LADO

| Feature | Anthropic No Tools | Mock | OpenAI Optimized | Anthropic Com Tools |
|---------|-------------------|------|------------------|-------------------|
| **Status** | ✅ Ativo | ✅ Funciona | 🔴 Bloqueado | 🟡 Em trabalho |
| **Latência** | ~8s | <100ms | N/A | N/A |
| **Custo** | Adequado | Zero | Menor (otim.) | Adequado |
| **Tools** | ❌ Não | ❌ Não | ✅ Sim | ⏳ Schema error |
| **IA Real** | ✅ Sim | ❌ Não | ✅ Sim | ✅ Sim |
| **Português** | ✅ Perfeito | ⚠️ Mock | ⚠️ Genérico | ✅ Perfeito |

---

## 🎯 RECOMENDAÇÕES POR CENÁRIO

### 📱 Produção (Agora)
**Use:** `route-anthropic-notools.ts` (✅ Antropic)
- Operacional
- Sem bloqueadores
- Responde bem mesmo sem tools

### 🧪 Testes Locais
**Use:** `route-mock.ts`
- Nenhuma dependência externa
- Respostas instantâneas
- Sem custos

### 📊 Validação de Funcionalidades
**Use:** `route-mock.ts` (quick test)
**Depois:** `route-anthropic-notools.ts` (real test)

### 🚀 Quando Tools Forem Críticos
**Use:** `route-anthropic.ts` (após resolver schema)
ou
**Use:** `route-openai-backup.ts` (após nova key OpenAI)

---

## 🔧 COMO TROCAR DE VERSÍO

### Ativar Anthropic (SEM TOOLS) - RECOMENDADO
```bash
cp app/api/whatsapp/webhook/route-anthropic-notools.ts app/api/whatsapp/webhook/route.ts
# Servidor recarrega automaticamente
```

### Ativar Mock
```bash
cp app/api/whatsapp/webhook/route-mock.ts app/api/whatsapp/webhook/route.ts
```

### Ativar OpenAI (se tiver chave nova)
```bash
cp app/api/whatsapp/webhook/route-optimized.ts app/api/whatsapp/webhook/route.ts
# Primeiro atualizar .env.local com OPENAI_API_KEY
```

### Ativar Anthropic COM TOOLS (quando schema resolvido)
```bash
cp app/api/whatsapp/webhook/route-anthropic.ts app/api/whatsapp/webhook/route.ts
```

---

## 📋 CHECKLIST: ANTES DE TROCAR

- [ ] Backup mental de qual versão está ativa agora
- [ ] Saber qual versão você quer testar
- [ ] Ter o comando correto para copiar
- [ ] Deixar servidor rodando (npm run dev)
- [ ] Esperar 2-3 segundos para reload
- [ ] Testar com uma mensagem simples
- [ ] Confirmar que funciona

---

## 🆘 TROUBLESHOOTING

### "Está dando erro de token inválido"
```
→ Verifique .env.local tem a chave correta
→ Se for Anthropic: ANTHROPIC_API_KEY=sk-ant-...
→ Se for OpenAI: OPENAI_API_KEY=sk-proj-...
→ Reinicie servidor (npm run dev)
```

### "Não está respondendo"
```
→ Cheque qual arquivo está em route.ts
→ Rode: cat app/api/whatsapp/webhook/route.ts | head -1
→ Veja se é o arquivo que esperava
→ Se for Mock, respostas são instantâneas
→ Se for Anthropic, aguarde ~8s
```

### "Quer voltar para a versão anterior"
```
→ Você tem backups de todas as versões
→ route-mock.ts
→ route-anthropic-notools.ts
→ route-openai-backup.ts
→ Pode trocar livremente
```

---

## 📈 PRÓXIMAS AÇÕES

### Curto Prazo (Esta semana)
- ✅ Manter route-anthropic-notools.ts em produção
- ✅ Testar com diferentes mensagens
- ✅ Medir performance

### Médio Prazo (Próximas 2 semanas)
- ⏳ Investigar schema Anthropic de tools
- ⏳ Corrigir route-anthropic.ts
- ⏳ Testar com tools habilitadas

### Longo Prazo (Este mês)
- ⏳ Setup de monitoring
- ⏳ Documentar decisions
- ⏳ Consider Google Gemini as alternative

---

**Última atualização:** 10/02/2026
**Status:** 🟢 Sistema Operacional com Anthropic
