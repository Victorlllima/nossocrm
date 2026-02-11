import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function getEnvLocal() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env: Record<string, string> = {};
    lines.forEach(line => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...values] = line.split('=');
            env[key.trim()] = values.join('=').trim().split('#')[0].trim();
        }
    });
    return env;
}

const envLocal = getEnvLocal();
const supabaseUrl = envLocal.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envLocal.SUPABASE_SERVICE_ROLE_KEY;

async function checkAllProfiles() {
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('👥 Mapeando usuários e organizações no sistema...');

    try {
        // Busca perfis para ver quem está usando o quê
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('email, organization_id, role');

        if (pError) throw pError;

        console.log('\n--- PERFIS DE USUÁRIOS ---');
        profiles.forEach(p => {
            console.log(`👤 Usuário: ${p.email} | Org ID: ${p.organization_id} | Role: ${p.role}`);
        });

        // Busca todas as configurações de organização
        const { data: orgs, error: oError } = await supabase
            .from('organization_settings')
            .select('*');

        if (oError) throw oError;

        console.log('\n--- CONFIGURAÇÕES DE TODAS AS ORGS ---');
        orgs.forEach(o => {
            console.log(`🏢 Org: ${o.organization_id}`);
            console.log(`📡 Provider: ${o.ai_provider}`);
            console.log(`🔑 OpenAI Key: ${o.ai_openai_key ? 'CONECTADA (Início: ' + o.ai_openai_key.substring(0, 10) + '...)' : 'VAZIA'}`);
            console.log('-----------------------------------');
        });

    } catch (error: any) {
        console.error('❌ Erro:', error.message);
    }
}

checkAllProfiles();
