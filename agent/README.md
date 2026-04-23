# Agente CRM Max — Assistente Virtual do Max Lima Corretor

Agente conversacional WhatsApp construído em TypeScript + Claude Sonnet 4.6.
Integrado ao CRM Max (Supabase) e à Evolution API (WhatsApp Gateway).

## Stack

- **LLM**: Claude Sonnet 4.6 (Anthropic) via Vercel AI SDK
- **WhatsApp**: Evolution API v2
- **Database**: Supabase (mesmo projeto do CRM Max)
- **Servidor**: Express + TypeScript

## Funcionalidades

- Atende leads via WhatsApp 24/7
- Busca vetorial em base de imóveis (RAG via Supabase pgvector + `match_imoveis`)
- Processa texto, áudio (Whisper), imagem (GPT-4o Vision)
- Cria e atualiza leads automaticamente no CRM
- Buffer de 5s para agrupar rajadas de mensagens
- Suspensão/retomada pelo Max (mensagem qualquer = suspende, `/IA` = retoma)
- Escalada para humano via tool `acionarHumano`
- Histórico persistente por sessão (tabela `messages`)

## Setup

### 1. Migrations Supabase (rodar uma vez)

Acesse o Supabase Studio > SQL Editor e execute:

```sql
-- Histórico de conversa do agente
CREATE TABLE IF NOT EXISTS public.messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages (session_id, created_at ASC);

-- Controle de suspensão (Max assumiu a conversa)
CREATE TABLE IF NOT EXISTS public.ia_suspensa (
    phone        TEXT PRIMARY KEY,
    suspended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
# Preencha as variáveis no .env
```

### 3. Instalar e rodar localmente

```bash
npm install
npm run dev
```

### 4. Configurar webhook na Evolution API

```bash
POST {EVOLUTION_URL}/webhook/set/{EVOLUTION_INSTANCE}
{
  "webhook": {
    "url": "https://SEU_DOMINIO/webhook",
    "events": ["MESSAGES_UPSERT"],
    "enabled": true,
    "webhookByEvents": false,
    "webhookBase64": false
  }
}
```

### 5. Deploy com Docker

```bash
# Build da imagem
docker build -t agent-crm-max:latest .

# Subir container
docker compose up -d

# Ver logs
docker logs agent-crm-max -f
```

## Controle do Agente

| Ação | Como fazer |
|------|-----------|
| Suspender IA | Max envia qualquer mensagem pelo chip |
| Retomar IA | Max envia `/IA` pelo chip |
| Verificar status | `GET /health` |

## Estrutura

```
src/
├── server.ts           ← Express + webhook handler
├── agents/
│   └── comercial.ts    ← Agente Claude com tools
├── tools/
│   ├── crm.ts          ← criarOuAtualizarLead, buscarLead
│   ├── imoveis.ts      ← consultarBaseImoveis (RAG)
│   ├── humano.ts       ← acionarHumano
│   └── controle.ts     ← suspender/retomar
├── services/
│   ├── supabase.ts     ← cliente DB
│   ├── evolution.ts    ← sendText, downloadMedia, transcribeAudio, describeImage
│   ├── buffer.ts       ← buffer de mensagens + deduplicação
│   └── history.ts      ← histórico de conversa
└── prompts/
    └── system.ts       ← system prompt + contexto temporal
```
