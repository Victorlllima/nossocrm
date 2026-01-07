-- =======================================================
-- MIGRATION: Auto-convert Leads to Deals/Contacts
-- DATE: 2026-01-06
-- =======================================================

CREATE OR REPLACE FUNCTION public.handle_new_lead_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contact_id UUID;
    v_deal_id UUID;
    v_board_id UUID;
    v_stage_id UUID;
    v_default_product_id UUID;
    v_owner_id UUID;
BEGIN
    -- Definições iniciais
    v_owner_id := COALESCE(NEW.owner_id, auth.uid()); -- Tenta usar o owner do lead ou quem inseriu

    -- 1. Cria o Contato
    INSERT INTO public.contacts (
        organization_id,
        name,
        email,
        company_name,
        role,
        source,
        avatar,
        notes,
        status,
        stage,
        owner_id,
        created_at,
        updated_at
    )
    VALUES (
        NEW.organization_id,
        NEW.name,
        NEW.email,
        NEW.company_name,
        NEW.role,
        NEW.source,
        NULL, -- Avatar
        NEW.notes, -- Repassa notas iniciais
        'ACTIVE',
        'LEAD',
        v_owner_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_contact_id;

    -- 2. Busca o Board Padrão (ou o primeiro disponível)
    SELECT id, default_product_id INTO v_board_id, v_default_product_id
    FROM public.boards
    WHERE organization_id = NEW.organization_id
      AND deleted_at IS NULL
    ORDER BY is_default DESC, position ASC, created_at ASC
    LIMIT 1;

    -- Se não achou board, aborta (não deveria acontecer em prod)
    IF v_board_id IS NULL THEN
        RAISE WARNING 'Organization % has no boards. Lead % converted to Contact but no Deal created.', NEW.organization_id, NEW.id;
        
        -- Apenas atualiza o lead para contact
        UPDATE public.leads
        SET converted_to_contact_id = v_contact_id,
            status = 'CONVERTED'
        WHERE id = NEW.id;
        
        RETURN NEW;
    END IF;

    -- 3. Busca o Primeiro Estágio do Board
    SELECT id INTO v_stage_id
    FROM public.board_stages
    WHERE board_id = v_board_id
    ORDER BY "order" ASC
    LIMIT 1;
    
    IF v_stage_id IS NULL THEN
        RAISE WARNING 'Board % has no stages. Lead % converted to Contact but no Deal created.', v_board_id, NEW.id;
        RETURN NEW;
    END IF;

    -- 4. Cria o Deal (Oportunidade)
    INSERT INTO public.deals (
        organization_id,
        title,
        status, -- Status legado, manter compatibilidade
        board_id,
        stage_id,
        contact_id,
        owner_id,
        value,
        priority,
        created_at,
        updated_at
    )
    VALUES (
        NEW.organization_id,
        NEW.company_name || ' - ' || NEW.name, -- Ex: "Acme Corp - João Silva"
        v_stage_id, -- Legado usa ID do estágio como status
        v_board_id,
        v_stage_id,
        v_contact_id,
        v_owner_id,
        0, -- Valor inicial zero
        'medium',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_deal_id;
    
    -- 5. Se houver produto padrão no board, adiciona item ao deal (Opcional, mas legal)
    IF v_default_product_id IS NOT NULL THEN
        INSERT INTO public.deal_items (
            organization_id,
            deal_id,
            product_id,
            name,
            quantity,
            price
        )
        SELECT 
            organization_id,
            v_deal_id,
            id,
            name,
            1,
            price
        FROM public.products
        WHERE id = v_default_product_id;
    END IF;

    -- 6. Atualiza o Lead original marcando como convertido
    UPDATE public.leads
    SET converted_to_contact_id = v_contact_id,
        status = 'CONVERTED'
    WHERE id = NEW.id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, loga mas não impede a inserção do lead (silent fail safe)
        RAISE WARNING 'Error converting lead %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_auto_convert_lead ON public.leads;

CREATE TRIGGER trigger_auto_convert_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_lead_conversion();
