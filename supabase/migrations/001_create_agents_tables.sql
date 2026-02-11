-- ============================================================================
-- AGENTS PLATFORM MULTI-TENANT TABLES
-- Purpose: Foundation for multi-tenant WhatsApp agent system
-- Date: 11/02/2026
-- ============================================================================

-- 1️⃣ TABLE: agents (Configuração dos agentes)
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, -- Referência ao cliente/empresa

  -- Informações Pessoais
  name varchar(255) NOT NULL,
  description text,
  agent_name varchar(100),
  communication_style varchar(20) DEFAULT 'normal', -- 'formal' | 'casual' | 'normal'
  custom_system_prompt text,

  -- Comportamento - Respostas
  use_emojis boolean DEFAULT false,
  sign_with_name boolean DEFAULT false,
  restrict_topics boolean DEFAULT false,
  split_long_messages boolean DEFAULT true,
  allow_reminders boolean DEFAULT false,

  -- Comportamento - Transferência
  allow_human_transfer boolean DEFAULT true,
  human_transfer_webhook text,

  -- Configurações Avançadas - Timing
  timezone varchar(50) DEFAULT 'America/Recife',
  response_delay_ms integer DEFAULT 0,
  max_interactions_per_session integer,

  -- Configurações Avançadas - WhatsApp
  typing_indicator boolean DEFAULT true,
  auto_mark_read boolean DEFAULT false,
  audio_processing varchar(20) DEFAULT 'ignore', -- 'ignore' | 'transcribe' | 'analyze'
  activation_trigger varchar(50) DEFAULT 'always', -- 'always' | 'keyword' | 'manual'
  termination_trigger varchar(50) DEFAULT 'timeout', -- 'timeout' | 'user_request' | 'max_interactions'
  accept_group_messages boolean DEFAULT false,
  respond_to_private_chats boolean DEFAULT true,
  call_handling varchar(20) DEFAULT 'ignore', -- 'ignore' | 'notify' | 'respond'

  -- Modelo & Parâmetros
  model_provider varchar(20) DEFAULT 'openai', -- 'openai' | 'anthropic' | 'google'
  model_name varchar(100) DEFAULT 'gpt-4o-mini',
  temperature decimal(3,2) DEFAULT 0.3,
  max_tokens integer DEFAULT 500,

  -- Status
  enabled boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),

  CONSTRAINT agents_unique_name_per_org UNIQUE(organization_id, name)
);

CREATE INDEX idx_agents_organization ON agents(organization_id);
CREATE INDEX idx_agents_enabled ON agents(enabled);
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);

-- 2️⃣ TABLE: agent_prompt_versions (Versionamento de prompts)
CREATE TABLE IF NOT EXISTS agent_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  system_prompt text NOT NULL,
  created_at timestamp DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,

  CONSTRAINT prompt_versions_unique_version UNIQUE(agent_id, version)
);

CREATE INDEX idx_prompt_versions_agent ON agent_prompt_versions(agent_id, version DESC);

-- 3️⃣ TABLE: agent_conversations (Histórico de conversas)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  phone_number varchar(20) NOT NULL,

  -- Lead Info
  lead_name varchar(255),
  lead_email varchar(255),

  -- Contexto (JSONB para flexibilidade)
  conversation_context jsonb,

  -- Status
  status varchar(20) DEFAULT 'active', -- 'active' | 'completed' | 'transferred'
  transferred_to_human_at timestamp,
  transferred_to_agent_id uuid REFERENCES agents(id),

  -- Métricas
  interaction_count integer DEFAULT 0,
  started_at timestamp DEFAULT now(),
  ended_at timestamp,

  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_conversations_agent_phone ON agent_conversations(agent_id, phone_number);
CREATE INDEX idx_conversations_active ON agent_conversations(status) WHERE status = 'active';
CREATE INDEX idx_conversations_organization ON agent_conversations(organization_id);

-- 4️⃣ TABLE: agent_messages (Mensagens da conversa)
CREATE TABLE IF NOT EXISTS agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,

  role varchar(20) NOT NULL, -- 'user' | 'assistant' | 'system'
  content text NOT NULL,

  -- Rastreamento
  model_used varchar(100),
  tokens_used integer,
  latency_ms integer,

  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON agent_messages(conversation_id, created_at DESC);

-- ============================================================================
-- NOTAS IMPORTANTES:
-- 1. organization_id = referência ao cliente/empresa do NossoCRM
-- 2. Sem Redis dependency - buffer fica em memória (in-memory)
-- 3. Isolamento de tenant garantido por organization_id
-- 4. Suporta versionamento de prompts com rollback
-- 5. Conversas persistidas para auditoria e analytics
-- ============================================================================
