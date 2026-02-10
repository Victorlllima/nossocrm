
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env.local');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[match[1]] = value;
        }
    });
    return env;
}

const env = loadEnv(envPath);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const evolutionUrl = env.EVOLUTION_API_URL;
const evolutionKey = env.EVOLUTION_API_KEY;

if (!supabaseUrl || !supabaseKey || !evolutionUrl || !evolutionKey) {
    console.error('❌ Erro: Variáveis de ambiente incompletas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateLead() {
    console.log('🎸 Simulando entrada de Lead: Johnny Ramone (FB Ads)');
    console.log('--------------------------------------------------');

    try {
        const organizationId = '3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45';
        const userId = '963bb55f-37fe-4404-b0da-6f5f915aa23c';
        const stageId = '298e1028-8fc0-48d0-9d14-14a514415245';

        const lead = {
            id: `SIM_FB_${Date.now()}`,
            full_name: 'Johnny Ramone',
            phone_number: '5561992978796',
            form_name: 'Aldeia Bueno',
            ad_name: 'Anúncio Goiânia Luxo',
            created_time: new Date().toISOString()
        };

        console.log('1. Preparando contato...');
        let { data: contact, error: fetchError } = await supabase
            .from('contacts')
            .select('id')
            .eq('whatsapp_phone', lead.phone_number)
            .eq('organization_id', organizationId)
            .maybeSingle();

        if (!contact) {
            const { data: newContact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                    organization_id: organizationId,
                    name: lead.full_name,
                    phone: lead.phone_number,
                    whatsapp_phone: lead.phone_number,
                    status: 'ACTIVE',
                    stage: 'LEAD',
                    source: 'facebook_ads',
                    notes: 'Lead simulado do Facebook Ads'
                })
                .select()
                .single();
            if (contactError) throw new Error(`Erro no contato: ${contactError.message}`);
            contact = newContact;
        }
        console.log(`✅ Contato pronto: ${contact.id}`);

        console.log('2. Criando deal...');
        const aiSummary = `📱 NOVO LEAD DO FACEBOOK (SIMULAÇÃO)

👤 Cliente: ${lead.full_name}
🏢 Interesse: ${lead.form_name}
📅 Quando chegou: ${new Date().toLocaleString('pt-BR')}

📍 ORIGEM DO LEAD
• Veio do anúncio: "${lead.ad_name}"
• Campanha: Lançamento Bueno
• Público: Investidores Goiânia
• Tipo: Anúncio pago (Facebook Ads)

---
✅ Lead simulado para teste de homologação`;

        const { data: deal, error: dealError } = await supabase
            .from('deals')
            .insert({
                organization_id: organizationId,
                contact_id: contact.id,
                stage_id: stageId,
                board_id: '7d9637e4-7bde-4a58-bc41-0bd3f03c329f', // Board das imobiliárias
                title: `${lead.full_name} - ${lead.form_name}`,
                value: 0,
                status: 'open',
                priority: 'medium',
                tags: ['google-sheets-import', 'facebook-ads', 'simulation'],
                ai_summary: aiSummary,
                custom_fields: {
                    google_sheets_id: lead.id,
                    ad_name: lead.ad_name,
                    form_name: lead.form_name,
                    created_time: lead.created_time,
                    form_responses: aiSummary
                }
            })
            .select()
            .single();

        if (dealError) throw new Error(`Erro no deal: ${dealError.message}`);
        console.log(`✅ Deal criado: ${deal.id}`);

        await supabase.from('deal_notes').insert({
            deal_id: deal.id,
            content: aiSummary
        });

        console.log('3. Notificando corretor via WhatsApp...');
        const formattedDate = new Date().toLocaleString('pt-BR');
        const maxPhone = env.MAX_PHONE_NUMBER || lead.phone_number;

        const maxPayload = {
            number: maxPhone,
            text: `🆕 NOVO LEAD NO CRM (SIMULAÇÃO)\n\n👤 Nome: ${lead.full_name}\n📱 Telefone: ${lead.phone_number}\n🏢 Interesse: ${lead.form_name}\n📅 Data: ${formattedDate}\n\nO cliente veio de um anúncio do Facebook Ads.`
        };

        const resMax = await fetch(evolutionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
            body: JSON.stringify(maxPayload)
        });

        if (resMax.ok) console.log('✅ Notificação Max enviada!');

        console.log('4. Enviando mensagem inicial para o Lead...');
        const leadPayload = {
            number: lead.phone_number,
            text: `Olá, ${lead.full_name}! 

Tudo bem? Aqui é o assistente digital do Max Lima, da RE/MAX

Vi que você demonstrou interesse na ${lead.form_name} através do nosso formulário. Muito obrigado pelo contato!

Conseguiu analisar as informações, fotos e características do imóvel? 

Estou à disposição para esclarecer todas as suas dúvidas! Se quiser, posso ligar para passar maiores informações`
        };

        const resLead = await fetch(evolutionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
            body: JSON.stringify(leadPayload)
        });

        if (resLead.ok) console.log('✅ Mensagem para Johnny enviada!');

        console.log('\n--------------------------------------------------');
        console.log('🎉 SIMULAÇÃO CONCLUÍDA!');
        console.log('O card do Johnny Ramone deve estar na primeira coluna do Kanban.');

    } catch (error) {
        console.error('\n❌ ERRO NA SIMULAÇÃO:', error.message);
    }
}

simulateLead();
