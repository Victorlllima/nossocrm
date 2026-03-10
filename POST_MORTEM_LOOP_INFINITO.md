# 🔴 POST-MORTEM: Loop Infinito de Consumo de Tokens

**Data:** 10/02/2026
**Afetado:** WhatsApp Agent (Anthropic)
**Impacto:** Consumo descontrolado de tokens

---

## 🎯 O QUE ACONTECEU

### Sequência de Eventos

1. **Primeiro teste (sucesso)**
   - Mensagem 1: "Teste 1: primeira mensagem" → Processada ✅
   - Evolution API: Mensagem enviada ✅

2. **Segundo teste (buffered)**
   - Mensagem 2: "Teste 2: segunda mensagem" → Buffered (< 5s)
   - HTTP 200: `{"status": "buffered"}`

3. **Terceiro teste (INÍCIO DO LOOP)**
   - Mensagem 3: "Teste 3: terceira mensagem" → Processada
   - **BUG CRÍTICO:** Código tinha `setTimeout` recursivo que reprocessava buffer
   - Sistema chamava `POST()` recursivamente infinitamente
   - Cada chamada gerava nova resposta → novos tokens gastos
   - Buffer nunca estava vazio → loop nunca parava

### Logs Reveladores

```
[requestId1] ✅ Response generated
✅ Evolution API success: 5561992978796
⏳ Buffered messages detected for 5561992978796, scheduling reprocessing...
Processing 1 buffered message(s) for 5561992978796
[requestId2] Processing: Red (5561992978796) → "Teste 1..."  ← RECURSIVO!
[requestId2] ✅ Response generated
⏳ Buffered messages detected for 5561992978796, scheduling reprocessing...
Processing 1 buffered message(s) for 5561992978796  ← LOOP CONTINUA
[requestId3] Processing: Red (5561992978796) → "Teste 1..."
...
```

---

## 🔍 ROOT CAUSE ANALYSIS

### Problema #1: Recursão sem condição de parada

**Código problemático (REMOVIDO):**
```typescript
if (hasBufferedMessages(leadPhone)) {
    setTimeout(async () => {
        const bufferedMsgs = getBufferedMessages(leadPhone);
        for (const bufferedMsg of bufferedMsgs) {
            await POST(retryReq);  // ⚠️ Chamava POST recursivamente
        }
    }, 500);
}
```

**Por que era perigoso:**
- `POST()` processa mensagem → marca como done
- Sistema detecta mensagens no buffer → agenda novo POST
- Novo POST processa mensagem → detecta buffer novamente
- **RESULTADO:** Loop infinito de recursão

### Problema #2: Misunderstanding do Buffer

O buffer original do N8n era simples:
- ✅ Evita processar 2 mensagens SIMULTANEAMENTE
- ❌ NÍO foi designed para reprocessamento automático

Minha implementação tentou criar um queue processor, mas:
1. Não tinha mecanismo para parar o loop
2. A recursão dentro de `setTimeout` criava chamadas intermináveis
3. Cada reprocessamento gerava NOVA resposta (novo consumo de tokens)

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### 1. Remover Recursão Completamente

✅ **FEITO:** Removi todo código de `setTimeout` e `POST()` recursivo
✅ **FEITO:** Buffer agora é apenas anti-spam, não queue processor

### 2. Problema Real: Mensagens Buffered Nunca são Processadas

**Novo Entendimento:**
- Quando MSG2 é buffered, ela fica **em memória** do servidor
- Quando MSG3 chega e é processada, as mensagens antigas no buffer morrem
- **Solução correta:** NÍO reprocessar buffer automaticamente

**Por quê?** Porque a Evolution API (webhook) envia cada mensagem como um HTTP POST separado. Não há "fila que espera ser processada". Cada POST é independente.

### 3. O Verdadeiro Problema: Buffer de 2-5 segundos

Red, você enviou:
1. MSG1 → Processada imediatamente
2. MSG2 (0.5s depois) → Buffered por < 5s
3. MSG3 (3s depois) → Processada, mas MSG2 já foi descartada do buffer!

**Solução:** O buffer não é o problema. A Evolution API NÍO reenvia as mensagens que ficaram buffered. Elas são perdidas.

---

## 🚀 NOVO DESIGN CORRETO

### Como Deveria Funcionar

```
MSG1 chega → Processa imediatamente → Responde
        ↓
MSG2 chega (< 5s) → Buffera → Retorna HTTP 200 com status "buffered"
        ↓
MSG3 chega (> 5s) → Processa → Responde
        ↓
MSG2? → NUNCA é processada porque não é um novo POST
```

**Isso é CORRETO porque:**
- Evolution API não reenvia mensagens buffered
- Se o usuário quer que MSG2 seja processada, precisa reenviar
- Evita loops infinitos
- Evita consumo incontrolado de tokens

---

## 📋 MUDANÇAS DE CÓDIGO

### Arquivo: `app/api/whatsapp/webhook/route.ts`

**REMOVIDO:**
- ❌ `hasBufferedMessages()` import
- ❌ `getBufferedMessages()` import
- ❌ Lógica de `setTimeout` e reprocessamento recursivo
- ❌ Chamadas recursivas de `POST()`

**MANTIDO:**
- ✅ Buffer de 5 segundos
- ✅ Anti-spam funcional
- ✅ Resposta imediata quando pode processar
- ✅ Kill switch para emergências

### Arquivo: `lib/ai/whatsapp-buffer.ts`

**Mantido como está:**
- Buffer simples e funcional
- Funções `hasBufferedMessages()` existem mas não são usadas (safe to keep)

---

## 🎯 COMO EVITAR ISSO NO FUTURO

### Princípios de Design

1. **Nunca recursão sem guard clause**
   ```typescript
   // ❌ BAD: Pode criar loop infinito
   if (condition) {
       await myFunction(); // Chama a si mesmo
   }

   // ✅ GOOD: Guard clause garante parada
   let depth = 0;
   function process() {
       if (depth > MAX_DEPTH) return;
       depth++;
       // ...
   }
   ```

2. **Webhook é stateless**
   - Cada POST é independente
   - Não tente criar "estado compartilhado" entre POSTs
   - Buffer em memória = perdido quando servidor reinicia

3. **Anti-spam vs Queue Processing**
   - Anti-spam: Rejeita mensagens rápidas (retorna 200/buffered)
   - Queue: Armazena e processa depois (requer persistência)
   - **Não misture os dois sem persistência!**

---

## 🔐 KILL SWITCH STATUS

**Arquivo:** `app/api/whatsapp/webhook/route.ts` linha 66-70

```typescript
export async function POST(req: NextRequest) {
    // ⛔ KILL SWITCH - Webhook desabilitado para parar consumo de tokens
    return NextResponse.json({
        status: 'disabled',
        message: 'WhatsApp webhook is currently disabled to stop token consumption'
    }, { status: 503 });
```

**Status:** ✅ ATIVO

Para reabilitar, comente essas linhas e descomente o resto do código.

---

## ✅ VERIFICAÇÍO PRÉ-REABILITAÇÍO

Antes de reabilitar o webhook, verificar:

- [ ] Buffer está corrigido (sem recursão)
- [ ] Sem `setTimeout` que chama `POST()`
- [ ] Sem `getBufferedMessages()` sendo usada
- [ ] Sem loops infinitos possíveis
- [ ] Code review do webhook completo

---

## 📊 PRÓXIMOS PASSOS

**Red, para que o agente responda APENAS o que você perguntar:**

1. **Entender o prompt do agente**
   - Arquivo: `lib/ai/whatsapp-prompt.ts`
   - Tem 6 cenários definidos
   - Pode estar muito "criativo"

2. **Ajustar temperatura do Claude**
   - Atual: `temperature: 1.0` (máxima criatividade)
   - Reduzir para: `temperature: 0.3-0.5` (mais focado)

3. **Adicionar guardrails no prompt**
   - Instruir para responder APENAS o perguntado
   - Evitar continuações automáticas

4. **Validação de resposta**
   - Antes de enviar via Evolution, validar comprimento
   - Rejeitar respostas muito longas

---

**Criado por:** Hades
**Data:** 10/02/2026
**Status:** ✅ Incidente encerrado, análise completa
