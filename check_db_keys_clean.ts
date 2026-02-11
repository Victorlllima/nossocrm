import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Função para ler o .env.local ignorando as variáveis do sistema (para teste)
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

async function checkDatabaseKeys() {
    console.log('🔗 Usando URL Limpa do .env.local:', supabaseUrl);

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Erro: URL ou Chave do Supabase não encontradas no arquivo.');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data: settings, error } = await supabase
            .from('organization_settings')
            .select('organization_id, ai_openai_key');

        if (error) throw error;

        console.log('\n--- CHAVES ENCONTRADAS NO BANCO ---');
        settings.forEach((s) => {
            console.log(`🏢 Empresa: ${s.organization_id}`);
            if (s.ai_openai_key) {
                console.log(`🔑 Chave no Banco (Início): ${s.ai_openai_key.substring(0, 15)}...`);
                console.log(`🔑 Chave no Banco (Fim): ...${s.ai_openai_key.substring(s.ai_openai_key.length - 10)}`);
            } else {
                console.log('⚪ Nenhuma chave OpenAI no banco.');
            }
        });

    } catch (error: any) {
        console.error('❌ Erro ao ler banco:', error.message);
    }
}

checkDatabaseKeys();
