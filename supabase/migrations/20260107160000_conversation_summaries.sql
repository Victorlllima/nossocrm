-- 1. Criação da tabela
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    whatsapp_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Segurança (RLS)
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow write access for authenticated users" ON conversation_summaries
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read access for organization members" ON conversation_summaries
    FOR SELECT TO authenticated USING (
        organization_id = (SELECT auth.uid()::uuid)
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.organization_id = conversation_summaries.organization_id
        )
    );

-- 3. Função de Injeção Automática (Versão Final com Timestamp e Quebra de Linha)
CREATE OR REPLACE FUNCTION append_summary_to_deal()
RETURNS TRIGGER AS $$
DECLARE
    clean_phone TEXT;
    target_contact_id UUID;
    target_deal_id UUID;
    timestamp_header TEXT;
BEGIN
    -- Limpeza do número
    clean_phone := REGEXP_REPLACE(NEW.whatsapp_id, '@s\.whatsapp\.net$', '');
    clean_phone := REGEXP_REPLACE(clean_phone, '[^0-9]', '', 'g');

    -- Timestamp (Brasília)
    timestamp_header := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY [HH24:MI]');

    -- Busca Contato
    SELECT id INTO target_contact_id
    FROM contacts
    WHERE whatsapp_phone = clean_phone
      AND organization_id = NEW.organization_id
    LIMIT 1;

    IF target_contact_id IS NOT NULL THEN
        -- Busca Deal Recente
        SELECT id INTO target_deal_id
        FROM deals
        WHERE contact_id = target_contact_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF target_deal_id IS NOT NULL THEN
            -- Injeta Data + Resumo no campo ai_summary
            UPDATE deals
            SET ai_summary = COALESCE(ai_summary, '') 
                || chr(10) || chr(10) 
                || '📌 RESUMO DA CONVERSA - ' || timestamp_header 
                || chr(10) 
                || '--------------------------------------------------' 
                || chr(10) 
                || NEW.summary
            WHERE id = target_deal_id;

            -- Marca resumo como processado
            UPDATE conversation_summaries
            SET processed = TRUE
            WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_inject_summary ON conversation_summaries;
CREATE TRIGGER trg_inject_summary
    AFTER INSERT ON conversation_summaries
    FOR EACH ROW
    EXECUTE FUNCTION append_summary_to_deal();
