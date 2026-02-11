# 🚀 COMEÇA AQUI - PLANO DE VALIDAÇÃO COMPLETO

**Red, este é seu mapa de navegação para os próximos 3 dias.**

---

## 📍 VOCÊ ESTÁ AQUI

```
DIA 1 (HOJE)
  └─ ✅ Análise concluída
  └─ ✅ Documentação criada
  └─ 👉 PRÓXIMO: Começar Fase 1

DIA 2
  └─ Fase 1: Testes (30 min)
  └─ Fase 2: Análise profunda (2-3h)

DIA 3
  └─ Fase 3: Integração Evolution (3-4h)
  └─ Deploy staging
```

---

## 🎯 FASE 1: TESTE IMEDIATO (30 MINUTOS)

### Para Começar Agora

1. **Abra 2 terminais:**

   **Terminal 1:** Servidor dev
   ```bash
   cd "c:\Users\victo_htyd3kj\OneDrive\Desktop\Projetos\Vibecoding\nossocrm"
   npm run dev
   ```

   **Terminal 2:** Para executar testes
   ```bash
   # Deixe aberto para executar curl/postman
   ```

2. **Siga o Guia:** `test/TESTE_WEBHOOK_GUIA.md`
   - Já está tudo explicado lá
   - Copie e cole os comandos curl
   - OU use Postman com `test/webhook-simulator.json`

### Testes Simplificados (Se não quiser Postman)

```bash
# Teste 1: Saudação
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5581999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"Oi"},"messageType":"conversation","pushName":"João"}}'

# Teste 2: Tool Invocation (CRÍTICO)
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5581999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"Tem 2 quartos em Boa Viagem?"},"messageType":"conversation","pushName":"João"}}'

# Teste 3: Transbordo
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5581999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"Quero falar com Max"},"messageType":"conversation","pushName":"João"}}'
```

### O Que Procurar nos Logs

✅ **Sucesso:** Vê isso no terminal?
```
[WhatsApp Webhook] POST /api/whatsapp/webhook
[Tool Call] consultarBaseImoveis chamada
✅ Response gerado
```

❌ **Erro:** Procurar por
```
[Error]
[Tool invocation failed]
[Supabase error]
```

---

## 📚 FASE 2: ANÁLISE PROFUNDA (2-3 HORAS)

### Para Começar Amanhã

1. **Abra este arquivo:** `test/FASE2_ANALISE_PROFUNDA.md`
2. **Revise nesta ordem:**
   - `lib/ai/whatsapp-tools.ts` (92 linhas - 30 min)
   - `lib/ai/whatsapp-vector-search.ts` (? linhas - 45 min)
   - `app/api/whatsapp/webhook/route.ts` (150+ linhas - 45 min)
   - Outros arquivos Tier 2 (30 min)

3. **Preencha a tabela de análise** (fornecida no documento)

4. **Identifique riscos e gaps**

---

## 🔌 FASE 3: INTEGRAÇÃO EVOLUTION (3-4 HORAS)

### Para Começar Depois de Amanhã (ou Dia 3)

1. **Obtenha credenciais da Evolution API**
   - Peça ao Max
   - Armazene em `.env.local`

2. **Siga:** `test/FASE3_INTEGRACAO_EVOLUTION.md`
   - Modifique 3 arquivos
   - Execute testes de integração
   - Valide envio real

3. **Deploy em staging**
   - Quando Fase 1 + 2 + 3 estiverem ok

---

## 📂 ESTRUTURA DE DOCUMENTAÇÃO

```
docs/tech/
├── RESUMO_EXECUTIVO_AGENTE.md       ← Visão geral (leia primeiro)
├── AGENTE_WHATSAPP_ANALISE_COMPLETA.md ← Análise detalhada
├── TOOLS_DETALHES_TECNICO.md        ← Referência técnica
└── ESTADO_ATUAL.md                  ← Dashboard rápido

test/
├── COMECA_AQUI.md                   ← VOCÊ ESTÁ AQUI
├── TESTE_WEBHOOK_GUIA.md            ← Fase 1: Testes (hoje)
├── FASE2_ANALISE_PROFUNDA.md        ← Fase 2: Análise (amanhã)
├── FASE3_INTEGRACAO_EVOLUTION.md    ← Fase 3: Integração (dia 3)
└── webhook-simulator.json           ← Testes Postman prontos
```

---

## ⏰ TIMELINE

```
DIA 1 (HOJE)
  09:00 - Análise concluída ✅
  14:00 - Testes criados ✅
  15:00 - Documentação completa ✅
  16:00 - Você começa Fase 1 👈

DIA 2 (AMANHÃ)
  09:00 - Fase 1: Testes (30 min)
  10:00 - Fase 2: Análise (2-3h)
  14:00 - Listar gaps e riscos
  15:00 - Preparar para Fase 3

DIA 3 (APÓS AMANHÃ)
  09:00 - Fase 3: Integração (3-4h)
  13:00 - Testes de integração
  14:00 - Deploy staging
  15:00 - Testes E2E com Evolution
  16:00 - Aprovação para produção
```

---

## 🎯 CHECKLIST: O QUE VOCÊ PRECISA FAZER AGORA

### ANTES DE COMEÇAR FASE 1

- [ ] Leu `RESUMO_EXECUTIVO_AGENTE.md` (15 min)
- [ ] Entendeu o estado atual (build ok, testes não feitos)
- [ ] Abriu 2 terminais
- [ ] Servidor dev rodando (`npm run dev`)

### DURANTE FASE 1

- [ ] Teste 1: Saudação (status 200) ✅
- [ ] Teste 2: Tool invocation (consultarBaseImoveis chamada) ✅
- [ ] Teste 3: Histórico (contexto mantido) ✅
- [ ] Teste 4: Transbordo (acionarHumano chamada) ✅
- [ ] Teste 5: Anti-spam (buffer funcionando) ✅

### SE ALGUM TESTE FALHAR

1. Ver logs do erro
2. Verificar arquivo correspondente
3. Debugar com `console.log`
4. Corrigir e reteste

---

## 🚨 RISCOS CONHECIDOS

| Risco | Impacto | Se Falhar |
|-------|---------|-----------|
| Tool não é chamada | 🔴 Crítico | Debugar `generateText` |
| Histórico se perde | 🔴 Crítico | Verificar Postgres memory |
| Latência > 2s | 🟡 Alto | Otimizar queries |
| Evolution API mockada | 🟡 Alto | Integrar real (Fase 3) |

---

## 💡 DICAS IMPORTANTES

### Logging
Todos os arquivos têm logs. Ver em terminal:
```bash
# Terminal que rodou npm run dev
# Olhe para:
[WhatsApp Webhook]
[Tool Call]
[Error]
[Response]
```

### Debugging Rápido
Se algo não funciona:
```bash
# 1. Ver erro exato
npm run dev
# (Procurar mensagem de erro)

# 2. Adicionar console.log no arquivo
lib/ai/whatsapp-tools.ts

# 3. Reexecutar teste
curl ... (repetir request)

# 4. Ver novo log com debug
```

### Performance
Esperado:
```
Request → AI generation → Response
|← Total: <2 segundos →|

Se > 3s: Provavelmente lag do OpenAI
Se > 5s: Problema em Supabase ou vector search
```

---

## 🎓 SE VOCÊ SE PERDER

1. **"Não sei o que fazer"**
   → Leia `RESUMO_EXECUTIVO_AGENTE.md` novamente

2. **"Como executo o teste?"**
   → Leia `test/TESTE_WEBHOOK_GUIA.md`

3. **"Como debugo erro X?"**
   → Procure "DEBUGGING" em `TESTE_WEBHOOK_GUIA.md`

4. **"Qual arquivo modificar?"**
   → Leia `FASE2_ANALISE_PROFUNDA.md` ou `FASE3_INTEGRACAO_EVOLUTION.md`

5. **"Por que A falhou?"**
   → Procure em `AGENTE_WHATSAPP_ANALISE_COMPLETA.md`

---

## 📞 CONTATOS IMPORTANTES

Se precisar:
- **Max (Cliente):** Avisar sobre testes
- **Credenciais Evolution:** Pedir para Max
- **Issues de Supabase:** Ver `.env.local`
- **Issues OpenAI:** Ver `.env.local`

---

## 🚀 PRÓXIMO PASSO: COMECE AGORA!

### Opção A: Usar Postman (Recomendado)

1. Abra Postman
2. File → Import
3. Selecione: `test/webhook-simulator.json`
4. Clique no primeiro teste
5. Send
6. Ver resultado

### Opção B: Usar curl

```bash
# Copia o primeiro curl de test/TESTE_WEBHOOK_GUIA.md
# Cola no Terminal 2
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  ...
# Aperta Enter
# Ver resultado + logs no Terminal 1
```

---

## ✅ SUCESSO = QUANDO VOCÊ VER

```
✅ Status 200 no teste
✅ Logs no terminal mostrando tool foi chamada
✅ Resposta é legível (não vômito de dados)
✅ Histórico é mantido (test 3)
✅ Transbordo funciona (test 4)
✅ Anti-spam funciona (test 5)
```

---

**Red, você tem todo o mapa preparado.**

**Próximo passo: Abra 2 terminais e comece!**

👇 Leia agora: `test/TESTE_WEBHOOK_GUIA.md`

---

**Preparado por:** [ATLAS]
**Data:** 10/02/2026 15:45
**Tempo restante para produção:** 2-3 dias
