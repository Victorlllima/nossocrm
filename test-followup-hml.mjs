
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
const testPhone = env.MAX_PHONE_NUMBER || "5561992978796";

if (!supabaseUrl || !supabaseKey || !evolutionUrl || !evolutionKey) {
    console.error('❌ Erro: Variáveis de ambiente incompletas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('🚀 Iniciando Teste de Follow-up (HML Simulation)');
    console.log('-------------------------------------------');

    try {
        const userId = '963bb55f-37fe-4404-b0da-6f5f915aa23c';
        const orgId = '3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45';
        const stageId = '298e1028-8fc0-48d0-9d14-14a514415245';

        console.log('1. Preparando contato de teste...');

        // Busca contato existente
        let { data: contact, error: fetchError } = await supabase
            .from('contacts')
            .select('id')
            .eq('whatsapp_phone', testPhone)
            .eq('organization_id', orgId)
            .maybeSingle();

        if (!contact) {
            console.log('Criando novo contato...');
            const { data: newContact, error: insertError } = await supabase
                .from('contacts')
                .insert({
                    organization_id: orgId,
                    name: 'Victor Teste Homologação',
                    phone: testPhone,
                    whatsapp_phone: testPhone,
                    source: 'test_script'
                })
                .select()
                .single();
            if (insertError) throw new Error(`Erro ao criar contato: ${insertError.message}`);
            contact = newContact;
        }

        console.log(`✅ Contato pronto: ${contact.id}`);

        console.log('2. Criar deal de teste...');
        const { data: deal, error: dealError } = await supabase
            .from('deals')
            .insert({
                organization_id: orgId,
                contact_id: contact.id,
                stage_id: stageId,
                title: 'Teste Follow-up HML',
                value: 1000,
                status: 'open',
                owner_id: userId
            })
            .select()
            .single();

        if (dealError) throw new Error(`Erro ao criar deal: ${dealError.message}`);
        console.log(`✅ Deal criado: ${deal.id}`);

        console.log('3. Agendando mensagem de follow-up...');
        const messageText = `Olá! Este é um teste oficial de *Follow-up Automático* vindo do ambiente de Homologação. Tudo funcionando por aí? 🔥`;

        const { data: scheduled, error: scheduleError } = await supabase
            .from('scheduled_messages')
            .insert({
                deal_id: deal.id,
                user_id: userId,
                scheduled_at: new Date().toISOString(),
                message_content: messageText,
                status: 'PENDING'
            })
            .select()
            .single();

        if (scheduleError) throw new Error(`Erro ao agendar: ${scheduleError.message}`);
        console.log(`✅ Mensagem agendada: ${scheduled.id}`);

        console.log('4. Disparando mensagem via Evolution API...');
        const payload = {
            number: testPhone,
            text: messageText,
            delay: 1000
        };

        const response = await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionKey
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Response API:', JSON.stringify(result));

        if (response.ok) {
            console.log('✅ Mensagem enviada com sucesso pela API!');

            console.log('5. Atualizando status no CRM...');
            const { error: updateError } = await supabase
                .from('scheduled_messages')
                .update({
                    status: 'SENT',
                    sent_at: new Date().toISOString()
                })
                .eq('id', scheduled.id);

            if (updateError) console.error('⚠️ Erro ao atualizar status:', updateError.message);
            else console.log('✅ Status atualizado para SENT.');

        } else {
            console.error('❌ Erro na API Evolution:', result);
            await supabase.from('scheduled_messages').update({ status: 'FAILED' }).eq('id', scheduled.id);
        }

        console.log('\n-------------------------------------------');
        console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log(`Verifique o WhatsApp no número: ${testPhone}`);

    } catch (error) {
        console.error('\n❌ FALHA NO TESTE:', error.message);
    }
}

runTest();
