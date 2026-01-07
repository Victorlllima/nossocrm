-- 1. Criação da tabela para receber os resumos do n8n
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL, -- Para manter o tenant isolation
    whatsapp_id TEXT NOT NULL, -- ID bruto do n8n (ex: 551199999999@s.whatsapp.net)
    summary TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE, -- Flag para saber se já foi vinculado ao deal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Segurança)
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Policy básica: permitir inserção apenas se autenticado (service_role ou user logado)
CREATE POLICY "Allow write access for authenticated users" ON conversation_summaries
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read access for organization members" ON conversation_summaries
    FOR SELECT TO authenticated USING (
        organization_id = (SELECT auth.uid()::uuid) -- Simplificado, ajustar conforme auth real
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.organization_id = conversation_summaries.organization_id
        )
    );

-- 2. Função para injetar o resumo no Deal existente
CREATE OR REPLACE FUNCTION append_summary_to_deal()
RETURNS TRIGGER AS $$
DECLARE
    clean_phone TEXT;
    target_contact_id UUID;
    target_deal_id UUID;
BEGIN
    -- Limpeza do número (remove sufixo do whatsapp se existir)
    clean_phone := REGEXP_REPLACE(NEW.whatsapp_id, '@s\.whatsapp\.net$', '');
    -- Remove caracteres não numéricos caso venha sujo
    clean_phone := REGEXP_REPLACE(clean_phone, '[^0-9]', '', 'g');

    -- Tenta encontrar o contato pelo telefone
    SELECT id INTO target_contact_id
    FROM contacts
    WHERE phone LIKE '%' || clean_phone || '%' -- Busca flexível por parte do telefone
      AND organization_id = NEW.organization_id
    LIMIT 1;

    IF target_contact_id IS NOT NULL THEN
        -- Encontra o Deal mais recente
        SELECT id INTO target_deal_id
        FROM deals
        WHERE contact_id = target_contact_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF target_deal_id IS NOT NULL THEN
            -- Atualiza a descrição do Deal adicionando o resumo no início ou fim
            -- Vamos adicionar como uma nota na descrição existente (ou deal_notes se preferir, mas user pediu descrição)
            UPDATE deals
            SET ai_summary = COALESCE(ai_summary, '') || E'\n\n--- 🤖 Resumo da Conversa (IA) ---\n' || NEW.summary
            WHERE id = target_deal_id;

            -- Marca o resumo como processado
            UPDATE conversation_summaries
            SET processed = TRUE
            WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger que dispara após a inserção do n8n
DROP TRIGGER IF EXISTS trg_inject_summary ON conversation_summaries;
CREATE TRIGGER trg_inject_summary
    AFTER INSERT ON conversation_summaries
    FOR EACH ROW
    EXECUTE FUNCTION append_summary_to_deal();
