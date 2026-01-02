-- =============================================================================
-- Migration: n8n Lead Sync Trigger (WhatsApp Integration)
-- Description: Sincroniza automaticamente leads do n8n/WhatsApp com contacts e deals
-- Author: CRM Team
-- Date: 2026-01-02
-- Organization Target: Max Lima (3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45)
-- =============================================================================

-- #############################################################################
-- PARTE 1: PREPARAÇÃO DAS TABELAS
-- #############################################################################

-- -----------------------------------------------------------------------------
-- 1.1 Adicionar coluna whatsapp_id à tabela LEADS (formato n8n: "5599999999@s.whatsapp.net")
-- -----------------------------------------------------------------------------
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS whatsapp_id TEXT;

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_id 
ON public.leads(whatsapp_id) 
WHERE whatsapp_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 1.2 Adicionar coluna whatsapp_phone à tabela CONTACTS (número limpo)
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- Índice para busca rápida por whatsapp_phone
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_phone 
ON public.contacts(whatsapp_phone) 
WHERE whatsapp_phone IS NOT NULL;

-- Índice composto para busca por org + whatsapp
CREATE INDEX IF NOT EXISTS idx_contacts_org_whatsapp 
ON public.contacts(organization_id, whatsapp_phone) 
WHERE whatsapp_phone IS NOT NULL;

-- #############################################################################
-- PARTE 2: FUNÇÃO DE SINCRONIZAÇÃO
-- #############################################################################

CREATE OR REPLACE FUNCTION public.sync_leads_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    -- ID DA ORGANIZAÇÃO (Max Lima) - FIXO
    v_org_id UUID := '3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45';
    
    -- Variáveis de processamento
    v_clean_phone TEXT;
    v_contact_id UUID;
    v_board_id UUID;
    v_stage_id UUID;
    v_deal_title TEXT;
BEGIN
    -- =========================================================================
    -- 1. LIMPEZA DO WHATSAPP ID
    -- Formato de entrada: "5599999999@s.whatsapp.net" ou "5599999999"
    -- Saída: "5599999999" (apenas o número)
    -- =========================================================================
    
    IF NEW.whatsapp_id IS NOT NULL THEN
        -- Remove sufixo @s.whatsapp.net se existir
        v_clean_phone := SPLIT_PART(NEW.whatsapp_id, '@', 1);
    ELSE
        -- Fallback: usa email ou gera ID único
        v_clean_phone := COALESCE(NEW.email, NEW.id::TEXT);
    END IF;

    -- =========================================================================
    -- 2. GESTÃO DO CONTATO (Busca ou Cria)
    -- =========================================================================
    
    -- Tenta encontrar contato existente pelo número limpo
    SELECT id INTO v_contact_id 
    FROM public.contacts 
    WHERE whatsapp_phone = v_clean_phone 
      AND organization_id = v_org_id;

    -- Se não encontrou, cria novo contato
    IF v_contact_id IS NULL THEN
        INSERT INTO public.contacts (
            organization_id, 
            name, 
            whatsapp_phone, 
            phone, 
            source,
            stage,
            created_at
        )
        VALUES (
            v_org_id, 
            COALESCE(NEW.name, 'Lead ' || v_clean_phone), 
            v_clean_phone, 
            v_clean_phone, 
            'whatsapp_leads_table',
            'LEAD',
            NOW()
        )
        RETURNING id INTO v_contact_id;
    END IF;

    -- =========================================================================
    -- 3. LOCALIZAÇÃO DO PIPELINE (Board e Estágio)
    -- =========================================================================
    
    -- Busca o primeiro board da organização (prioriza is_default)
    SELECT id INTO v_board_id 
    FROM public.boards 
    WHERE organization_id = v_org_id 
      AND deleted_at IS NULL
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;

    -- Se não encontrou board, aborta mas não falha
    IF v_board_id IS NULL THEN
        RAISE WARNING 'sync_leads_to_crm: Nenhum board encontrado para org_id=%', v_org_id;
        -- Ainda atualiza o lead com o contact_id
        UPDATE public.leads
        SET organization_id = v_org_id,
            converted_to_contact_id = v_contact_id
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Tenta encontrar estágio com "Novo" no nome (case insensitive)
    SELECT id INTO v_stage_id 
    FROM public.board_stages 
    WHERE board_id = v_board_id 
      AND name ILIKE '%Novo%' 
    LIMIT 1;

    -- Fallback: pega o primeiro estágio pela ordem (position ou created_at)
    IF v_stage_id IS NULL THEN
        SELECT id INTO v_stage_id 
        FROM public.board_stages 
        WHERE board_id = v_board_id 
        ORDER BY "order" ASC, created_at ASC 
        LIMIT 1;
    END IF;

    -- Se não encontrou estágio, aborta mas não falha
    IF v_stage_id IS NULL THEN
        RAISE WARNING 'sync_leads_to_crm: Nenhum estágio encontrado para board_id=%', v_board_id;
        -- Ainda atualiza o lead com o contact_id
        UPDATE public.leads
        SET organization_id = v_org_id,
            converted_to_contact_id = v_contact_id
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- =========================================================================
    -- 4. CRIAÇÃO DO DEAL (Card no Kanban)
    -- =========================================================================
    
    -- Define título do deal
    v_deal_title := CASE 
        WHEN NEW.name IS NOT NULL AND TRIM(NEW.name) != '' 
        THEN NEW.name
        ELSE 'Negócio WhatsApp ' || v_clean_phone
    END;

    -- Insere o deal
    INSERT INTO public.deals (
        organization_id, 
        contact_id, 
        board_id, 
        stage_id, 
        title, 
        status, 
        value,
        priority,
        tags,
        created_at
    )
    VALUES (
        v_org_id, 
        v_contact_id, 
        v_board_id, 
        v_stage_id, 
        v_deal_title, 
        'open', 
        0,
        'medium',
        ARRAY['whatsapp', 'n8n', 'auto']::TEXT[],
        NOW()
    );

    -- =========================================================================
    -- 5. ATUALIZAÇÃO DO REGISTRO ORIGINAL (Feedback/Rastreio)
    -- =========================================================================
    
    UPDATE public.leads
    SET organization_id = v_org_id,
        converted_to_contact_id = v_contact_id
    WHERE id = NEW.id;

    -- Log de sucesso
    RAISE NOTICE 'Lead % sincronizado com sucesso: contact_id=%, board_id=%, stage_id=%', 
        NEW.id, v_contact_id, v_board_id, v_stage_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário na função
COMMENT ON FUNCTION public.sync_leads_to_crm() IS 
'Trigger function que sincroniza leads do n8n/WhatsApp com contacts e deals.
Limpa o whatsapp_id (remove @s.whatsapp.net), cria contato e deal automaticamente.
Org fixada: Max Lima (3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45)';

-- #############################################################################
-- PARTE 3: CRIAÇÃO DO TRIGGER
-- #############################################################################

-- Remove trigger antigo se existir (cleanup)
DROP TRIGGER IF EXISTS trg_new_lead_entry ON public.leads;
DROP TRIGGER IF EXISTS trg_sync_leads ON public.leads;

-- Cria o novo trigger
CREATE TRIGGER trg_sync_leads
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_leads_to_crm();

-- Comentário no trigger
COMMENT ON TRIGGER trg_sync_leads ON public.leads IS 
'Sincroniza automaticamente novos leads do n8n/WhatsApp com contacts e deals.
Dispara após INSERT na tabela leads.';

-- #############################################################################
-- PARTE 4: PERMISSÕES
-- #############################################################################

-- SECURITY DEFINER permite bypass de RLS
GRANT EXECUTE ON FUNCTION public.sync_leads_to_crm() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_leads_to_crm() TO service_role;

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================

-- #############################################################################
-- TESTE (Executar manualmente após aplicar a migration)
-- #############################################################################
/*
-- Inserir lead de teste (simula entrada n8n)
INSERT INTO public.leads (name, whatsapp_id)
VALUES ('Teste WhatsApp', '5511999887766@s.whatsapp.net');

-- Verificar resultados
SELECT * FROM public.leads WHERE whatsapp_id LIKE '%999887766%';
SELECT * FROM public.contacts WHERE whatsapp_phone = '5511999887766';
SELECT * FROM public.deals WHERE title LIKE '%Teste WhatsApp%';

-- Verificar trigger instalado
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'trg_sync_leads';
*/
