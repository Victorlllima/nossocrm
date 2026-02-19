-- Migration: Log Sent Scheduled Messages to Dialogos
-- Data: 2026-02-19
-- Autor: Atlas

-- Função para logar mensagem na tabela dialogos quando o status mudar para SENT
CREATE OR REPLACE FUNCTION public.log_sent_scheduled_message()
RETURNS TRIGGER AS $$
DECLARE
    deal_contact_phone TEXT;
    contact_id_val UUID;
BEGIN
    -- Check if status changed to SENT
    IF NEW.status = 'SENT' AND OLD.status != 'SENT' THEN
        -- Get contact phone associated with the deal
        SELECT c.phone INTO deal_contact_phone
        FROM public.deals d
        JOIN public.contacts c ON d.contact_id = c.id
        WHERE d.id = NEW.deal_id;

        -- If phone found, insert into dialogos
        IF deal_contact_phone IS NOT NULL THEN
            INSERT INTO public.dialogos (session_id, message)
            VALUES (
                deal_contact_phone || '_memory',
                jsonb_build_object(
                    'type', 'ai',
                    'content', NEW.message_content,
                    'additional_kwargs', '{}'::jsonb,
                    'response_metadata', '{}'::jsonb
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a função após update na tabela scheduled_messages
DROP TRIGGER IF EXISTS trigger_log_sent_scheduled_message ON public.scheduled_messages;

CREATE TRIGGER trigger_log_sent_scheduled_message
AFTER UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION log_sent_scheduled_message();
