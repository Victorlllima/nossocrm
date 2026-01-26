-- Migration: Módulo Follow-up e Agenda
-- Data: 2025-02-06
-- Autor: Hades

-- 1. Tabela de Mensagens Agendadas (Follow-up)
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES public.deals(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED_BY_INTERACTION', 'CANCELLED_MANUAL')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Índices para performance do Cron
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending ON public.scheduled_messages(status, scheduled_at) WHERE status = 'PENDING';

-- 2. Tabela de Integrações de Usuário (Tokens Google)
CREATE TABLE IF NOT EXISTS public.user_integrations (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    provider TEXT NOT NULL CHECK (provider IN ('google_calendar')),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    calendar_id TEXT DEFAULT 'primary',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, provider)
);

-- 3. Tabela de Linkagem de Eventos (CRM <-> Google)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES public.deals(id),
    google_event_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Função RPC para "Smart Cancel"
CREATE OR REPLACE FUNCTION public.cancel_pending_followup_by_phone(phone_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cancelled_count INT;
    affected_ids UUID[];
BEGIN
    -- Identificar Deals associados a esse telefone (assumindo que deals tem contact_phone ou join com contacts)
    -- Por simplificação, vamos assumir que o n8n passa o deal_id direto, ou fazemos lookup.
    -- Cenário MVP: n8n passa o numero, a gente busca o contato.
    
    -- Lógica Simplificada V1: Cancelar qualquer mensagem pendente para deals deste telefone
    -- OBS: Requer join com deals/contacts. 
    -- Vamos assumir que 'deals' tem uma coluna 'customer_phone' ou similar.
    -- Ajuste conforme seu schema real de Deals.
    
    WITH cancelled AS (
        UPDATE public.scheduled_messages sm
        SET status = 'CANCELLED_BY_INTERACTION'
        FROM public.deals d
        WHERE sm.deal_id = d.id
        -- AND d.customer_phone = phone_number -- DECOMENTAR QUANDO TIVER O SCHEMA REAL
        AND sm.status = 'PENDING'
        RETURNING sm.id
    )
    SELECT count(*), array_agg(id) INTO cancelled_count, affected_ids FROM cancelled;

    RETURN jsonb_build_object(
        'success', true,
        'cancelled_count', cancelled_count,
        'affected_ids', affected_ids
    );
END;
$$;
