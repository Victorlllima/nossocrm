import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Pega direto do process.env após o carregamento
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔗 URL detectada:', supabaseUrl);

async function checkDatabaseKeys() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Erro: URL ou Chave do Supabase não encontradas no .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Vasculhando o banco de dados em busca de chaves configuradas...');

    try {
        const { data: settings, error } = await supabase
            .from('organization_settings')
            .select('organization_id, ai_provider, ai_openai_key');

        if (error) throw error;

        if (!settings || settings.length === 0) {
            console.log('⚠️ Nenhuma configuração de IA encontrada no banco de dados.');
            return;
        }

        settings.forEach((s) => {
            console.log(`\n🏢 Org: ${s.organization_id}`);
            const key = s.ai_openai_key;
            if (key) {
                console.log(`🔑 OpenAI Key (Início): ${key.substring(0, 15)}...`);
                console.log(`🔑 OpenAI Key (Fim): ...${key.substring(key.length - 10)}`);

                // A chave que funciona termina em: WKx79P_WJXT3BlbkFJrbPvtREoRNUTbftkynoxizBOYHsUJBiv6itzNiAVJTvak-DmWN9q0ojeTQHec0MXL4Wd14_AAA
                if (key.includes('WJXT3BlbkFJrbPvtREoRNUTbftkynoxizBOYHsUJBiv6itzNiAVJTvak')) {
                    console.log('✅ ESTA CHAVE É A CORRETA!');
                } else {
                    console.log('❌ ESTA CHAVE É DIFERENTE DA QUE FUNCIONA!');
                }
            } else {
                console.log('⚪ Sem chave OpenAI cadastrada.');
            }
        });

    } catch (error: any) {
        console.error('❌ Erro no Supabase:', error.message);
    }
}

checkDatabaseKeys();
