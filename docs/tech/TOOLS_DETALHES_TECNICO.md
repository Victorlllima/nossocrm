# 🔨 DETALHES TÉCNICO: TOOLS DO AGENTE WHATSAPP

## Análise Profunda das Ferramentas (Tools)

---

## Tool 1: consultarBaseImoveis

### Definição N8n

```javascript
{
  "name": "Consultar_Base_Imoveis",
  "description": "Busca informações detalhadas sobre imóveis (características, preço, localização, comodidades). Use quando o lead perguntar sobre imóveis específicos ou características.",

  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Termo de busca: pode ser ID do imóvel, bairro, tipo, ou características"
      }
    },
    "required": ["query"]
  }
}
```

### Implementação Vercel AI SDK

```typescript
export const consultarBaseImoveis = tool({
    description: 'Busca informações detalhadas sobre imóveis...',
    parameters: z.object({
        query: z.string().describe('Termo de busca: pode ser ID do imóvel, bairro, tipo, ou características')
    }),
    execute: async ({ query }) => {
        const supabase = createStaticAdminClient();

        // LÓGICA 1: Busca por ID direto
        const idMatch = query.match(/ID:\s*(\d+)/i) || query.match(/^(\d+)$/);
        if (idMatch) {
            const propertyId = idMatch[1];
            const { data, error } = await supabase
                .from('imoveis_catalogo')
                .select('*')
                .eq('id', propertyId)
                .maybeSingle();

            if (error || !data) {
                return 'Imóvel não encontrado com este ID.';
            }

            // Retorna: Título, Tipo, Localização, Preço, Quartos, Área, Link
            return `Imóvel encontrado: ...`;
        }

        // LÓGICA 2: Busca semântica + texto
        const results = await hybridSearchProperties(query, 5);

        if (results.length === 0) {
            return 'Nenhum imóvel encontrado com esses critérios. Sugira ao lead entrar em contato com o Max...';
        }

        // Retorna: Lista de 5 imóveis com relevância
        return results.map((property, index) => `
${index + 1}. ${property.titulo || property.tipo}
   - Tipo: ${property.tipo}
   - Localização: ${property.localizacao}
   - Preço: R$ ${property.preco?.toLocaleString('pt-BR')}
   - Quartos: ${property.quartos || 'N/A'}
   - Área: ${property.area_total}m²
   - Link: ${property.link}
   - Relevância: ${(property.similarity * 100).toFixed(0)}%
        `).join('\n---\n');
    }
});
```

### Fluxo de Busca Detalhado

```
ENTRADA: query = "2 quartos em Boa Viagem"

PASSO 1: Verificar se é ID
  ├─ Regex: /ID:\s*(\d+)/i
  ├─ Regex: /^(\d+)$/
  └─ Resultado: NÃO (não é ID puro)

PASSO 2: Busca Semântica (hybridSearchProperties)
  │
  ├─ 2A. Gerar embedding da query
  │   └─ OpenAI Embedding API
  │   └─ Dimensionalidade: 1536 (ada-002)
  │
  ├─ 2B. Busca por cosine similarity
  │   └─ SELECT * FROM imoveis_catalogo
  │   └─ WHERE embedding <-> query_embedding < threshold
  │   └─ ORDER BY similarity DESC
  │   └─ LIMIT 5
  │
  ├─ 2C. Busca por texto (fallback)
  │   └─ ILIKE sobre: titulo, tipo, localizacao
  │   └─ "2 quartos" ILIKE %2% OR %quartos%
  │   └─ "Boa Viagem" ILIKE %boa viagem%
  │
  └─ 2D. Merge & Ranking
      └─ Combina resultados semânticos + texto
      └─ Ordena por (similarity * 0.7 + text_score * 0.3)
      └─ Retorna top 5

PASSO 3: Formatação de Resposta
  └─ Para cada imóvel: Título, Tipo, Localização, Preço, Quartos, Área, Link, %Relevância
  └─ Separador: "---\n"
  └─ Total: ~500-800 caracteres (evita "vômito de dados")

SAÍDA: String formatada com até 5 imóveis
```

### Tabela de Campos da imoveis_catalogo

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| id | INT | PK | 42 |
| titulo | TEXT | Nome do imóvel | "Apto 3Q em Boa Viagem" |
| tipo | TEXT | Venda \| Aluguel | "Venda" |
| localizacao | TEXT | Bairro + Cidade | "Boa Viagem, Recife - PE" |
| preco | DECIMAL | Valor em R$ | 450000.00 |
| quartos | INT | Qtd quartos | 3 |
| area_total | DECIMAL | m² | 150.5 |
| link | TEXT | URL RE/MAX | "https://www.remax.com.br/..." |
| embedding | vector(1536) | OpenAI embed | [0.123, -0.456, ...] |
| similarity | FLOAT | Calc. em runtime | 0.89 |
| created_at | TIMESTAMPTZ | Quando cadastrado | 2025-11-01 |

---

## Função Auxiliar: hybridSearchProperties

### Localização

```
lib/ai/whatsapp-vector-search.ts
```

### Assinatura

```typescript
export async function hybridSearchProperties(
    query: string,
    limit: number = 5
): Promise<Array<{
    id: number;
    titulo: string;
    tipo: string;
    localizacao: string;
    preco: number;
    quartos: number;
    area_total: number;
    link: string;
    similarity: number;  // 0-1
}>>
```

### Lógica Interna (Pseudocódigo)

```typescript
async function hybridSearchProperties(query, limit) {
    const supabase = createStaticAdminClient();

    // 1. Gerar embedding da query
    const embedding = await getEmbedding(query); // OpenAI

    // 2. Busca semântica (vector similarity)
    const semanticResults = await supabase
        .rpc('search_properties_by_embedding', {
            query_embedding: embedding,
            match_count: limit,
            similarity_threshold: 0.3  // Flexible
        });

    // 3. Busca por texto
    const textResults = await supabase
        .from('imoveis_catalogo')
        .select('*')
        .or(`
            titulo.ilike.%${query}%,
            localizacao.ilike.%${query}%,
            tipo.ilike.%${query}%
        `)
        .limit(limit);

    // 4. Merge & Deduplica
    const merged = mergeResults(semanticResults, textResults);

    // 5. Ranking by relevance
    const ranked = merged
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return ranked;
}
```

### Threshold de Similarity

- **0.75+** → Excelente match (mostrar sempre)
- **0.50-0.75** → Bom match (mostrar com confiança)
- **0.30-0.50** → Aceitável (mostrar como alternativa)
- **<0.30** → Rejeitar (não mostrar)

---

## Tool 2: acionarHumano

### Definição N8n

```javascript
{
  "name": "Acionar_Humano",
  "description": "Notifica humano para assumir o atendimento. Use quando o lead pedir explicitamente para falar com humano ou quando você não conseguir resolver a solicitação.",

  "parameters": {
    "type": "object",
    "properties": {
      "motivo": {
        "type": "string",
        "description": "Motivo do transbordo para humano"
      }
    },
    "required": ["motivo"]
  }
}
```

### Implementação Vercel AI SDK

```typescript
export const acionarHumano = tool({
    description: 'Notifica humano para assumir o atendimento. Use quando o lead pedir explicitamente para falar com humano ou quando você não conseguir resolver a solicitação.',
    parameters: z.object({
        motivo: z.string().describe('Motivo do transbordo para humano'),
    }),
    execute: async ({ motivo }) => {
        // TODO: Integração real com Evolution API e sistema de fila

        // Placeholder (simulação)
        return `Transbordo solicitado. Motivo: ${motivo}. O Max será notificado.`;

        // Quando implementar:
        // 1. Chamar Evolution API: POST /message/sendText/
        // 2. Enviar para chat do Max: "TRANSFERÊNCIA: [lead] pediu - ${motivo}"
        // 3. Criar ticket em banco de dados (novo tipo de record)
        // 4. Manter histórico de transbordo para análise
    }
});
```

### Casos de Uso

```
CASO 1: Lead Pede Explicitamente
  Lead: "Quero falar com o Max"
  IA: "Entendido. Deixa eu avisar o Max para você."
  ├─ Chamar: acionarHumano({ motivo: "Lead solicitou atendimento humano" })
  └─ Resposta: "O Max vai te responder em breve!"

CASO 2: Imóvel Não Encontrado
  Lead: "Tenho um lote de 500m² no Poço da Panela"
  IA: [Consultar_Base_Imoveis retorna vazio]
  IA: "Não encontrei esse perfil exato. Vou avisar o Max para buscar."
  ├─ Chamar: acionarHumano({ motivo: "Lote 500m² Poço da Panela não encontrado" })
  └─ Resposta: "Max vai buscar opções na rede para você."

CASO 3: Erro Ou Incompatibilidade
  Lead: "Quero alugar um imóvel para empresa"
  IA: [Consultar_Base_Imoveis retorna apenas residenciais]
  IA: "Vejo que você está procurando um imóvel comercial. Max tem tudo, deixa eu chamar."
  ├─ Chamar: acionarHumano({ motivo: "Lead busca imóvel comercial (fora do escopo)" })
  └─ Resposta: "Max vai ajudar com isso."

CASO 4: Lead Insiste em Dúvida
  Lead: "Tem certeza desse preço?" [×3 mensagens]
  IA: "Deixa eu passar para o Max, ele resolve isso de uma vez."
  ├─ Chamar: acionarHumano({ motivo: "Lead com dúvida persistente sobre preço" })
  └─ Resposta: "Max já já tá aqui!"
```

### Integração com Evolution API (FUTURE)

```typescript
async function acionarHumano({ motivo, leadPhone, leadName, conversationId }) {
    const evolutionToken = process.env.EVOLUTION_API_TOKEN;
    const maxInstanceName = 'Max_corretor';  // Instance name na Evolution

    // 1. Notificar Max
    await fetch('https://evolution.app.info.pl/message/sendText/' + maxInstanceName, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${evolutionToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            number: '+5581999999999',  // Número do Max
            text: `🔔 TRANSFERÊNCIA\nLead: ${leadName}\nTelefone: ${leadPhone}\nMotivo: ${motivo}\nConversaID: ${conversationId}`
        })
    });

    // 2. Notificar lead que Max vai responder
    await fetch('https://evolution.app.info.pl/message/sendText/' + maxInstanceName, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${evolutionToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            number: leadPhone,
            text: `Entendi! Deixa eu chamar o Max pra você. 👋`
        })
    });

    // 3. Registrar no CRM
    await supabase.from('handoffs').insert({
        conversation_id: conversationId,
        lead_phone: leadPhone,
        lead_name: leadName,
        reason: motivo,
        timestamp: new Date(),
        status: 'pending'
    });

    return {
        success: true,
        message: `Transbordo para ${maxInstanceName} realizado. Motivo: ${motivo}`
    };
}
```

---

## Cenários de Uso: Quando Chamar Cada Tool

### Consultar_Base_Imoveis: SIM

✅ "Tem algum 2 quartos no Peixoto?"
✅ "Qual é o preço desse imóvel?" (ID já foi mencionado)
✅ "Mostre imóvel de aluguel"
✅ "ID 42"
✅ "Tenho interesse em casa"

### Consultar_Base_Imoveis: NÃO

❌ "Bom dia!" (não é busca, é saudação)
❌ "Tudo bem?" (small talk)
❌ "Quando você atende?" (pergunta operacional)
❌ "Qual sua comissão?" (pergunta sobre Max, não sobre imóveis)

### Acionar_Humano: SIM

✅ "Quero falar com o Max"
✅ "Não achei o que procuro"
✅ "Tem imóvel comercial?" (fora do escopo)
✅ "Preciso de financiamento" (não é suporte de IA)
✅ "Tem WhatsApp do Max?" (operacional)

### Acionar_Humano: NÃO

❌ "Tem 2 quartos?" (pode responder com tool)
❌ "Qual o preço?" (pode responder com tool)
❌ "Me manda as fotos" (pode responder com tool)

---

## Instrução Crítica do Prompt: VALIDAÇÃO DE TOOL CALLS

(Extraída do prompt, no N8n)

```
# INSTRUÇÕES DE VALIDAÇÃO (CÉREBRO DO AGENTE)
Ao receber dados da tool:
1. **Finalidade:** Venda vs Aluguel (Se incompatível → Transbordo).
2. **Repetição:** Não mostre imóvel já apresentado nas últimas 3 mensagens.
3. **Requisitos:** Se a tool trouxe errado (ex: 2 quartos ao invés de 3) → Avise e Transborde.
4. **Vazio:** Sem resultados → Transbordo.
```

### Tradução para Código

```typescript
// Após chamar consultarBaseImoveis:

if (results.length === 0) {
    // Vazio → Transbordo
    await acionarHumano({
        motivo: `Query "${query}" não retornou resultados`
    });
    return 'Não encontrei imóveis com esse critério...';
}

// Validação de Finalidade
const leadRequests = parseLeadIntent(userMessage);
if (leadRequests.finalidade === 'aluguel' && results.some(r => r.tipo === 'venda')) {
    // Incompatível → Aviso
    return 'Vejo que você busca aluguel, mas esses imóveis são venda. Deixa eu avisar o Max...';
}

// Validação de Repetição
const recentlyShown = getRecentPropertyIds(sessionId, messages, lastN=3);
const filtered = results.filter(r => !recentlyShown.includes(r.id));
if (filtered.length === 0) {
    // Todos já foram mostrados
    return 'Já mostrei todos os imóveis que temos no perfil. Quer outras opções?';
}

// Validação de Requisitos
if (leadRequests.quartos && results[0].quartos !== leadRequests.quartos) {
    // Tool trouxe errado
    await acionarHumano({
        motivo: `Lead pediu ${leadRequests.quartos}Q, tool retornou ${results[0].quartos}Q`
    });
}
```

---

## Resumo: Fluxo Completo de uma Pergunta

```
Lead: "Tem imóvel com 2 quartos em Boa Viagem?"

PARSING:
  └─ Intent: Busca
  └─ Type: Imóvel
  └─ Params: quartos=2, localização=Boa Viagem, finalidade=não especificada

AI AGENT DECISION:
  └─ Escolhe: consultarBaseImoveis
  └─ Monta query: "2 quartos Boa Viagem"

TOOL EXECUTION:
  ├─ hybridSearchProperties("2 quartos Boa Viagem", limit=5)
  ├─ Resultados: [
  │    { id: 42, titulo: "Apto 3Q", quartos: 2, similarity: 0.89 },
  │    { id: 51, titulo: "Apto 2Q", quartos: 2, similarity: 0.85 },
  │    { id: 63, titulo: "Casa 2Q", quartos: 2, similarity: 0.78 }
  │  ]
  └─ Status: OK

VALIDATION:
  ├─ Finalidade: OK (não há conflito Venda/Aluguel)
  ├─ Repetição: OK (primeira vez)
  ├─ Requisitos: OK (todos têm 2 quartos)
  └─ Vazio: Não (3 resultados)

RESPONSE:
  └─ Formata: "Tenho 3 opções com 2 quartos em Boa Viagem:
              1. Apto 3Q - R$ 450k - 150m²
              2. Apto 2Q - R$ 380k - 120m²
              3. Casa 2Q - R$ 520k - 200m²"

SEND TO LEAD:
  └─ Evolution API: sendText(leadPhone, message)
  └─ Save in History: { role: 'assistant', content: message }
```

---

## Dependências e Limites

### AI SDK v3 Tool Format
- ✅ `description`: string (obrigatório)
- ✅ `parameters`: z.object() (Zod schema, obrigatório)
- ✅ `execute`: async function (obrigatório)
- ❌ `jsonSchema`: não suportado (use Zod sempre)
- ❌ `tool-choice: 'required'`: use `maxSteps: 5` em vez disso

### Zod Validation
```typescript
// ✅ CORRETO
const myTool = tool({
  parameters: z.object({
    input: z.string().describe('input description')
  }),
  execute: async ({ input }) => { ... }
});

// ❌ ERRADO (não funciona em v3)
const myTool = tool({
  parameters: {
    type: 'object',
    properties: { ... }  // jsonSchema
  }
});
```

### maxSteps na Chamada
```typescript
const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'usuario pergunta',
  tools: whatsappAgentTools,
  maxSteps: 5  // Máximo 5 iterações de tool calling
});
```

---

**Próx. Validação:** Testar com webhook simulado
**Referência:** `lib/ai/whatsapp-tools.ts` (código real)
