
import { GoogleSheetsClient } from './lib/integrations/google-sheets/client.js';
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
process.env.GOOGLE_SHEETS_SPREADSHEET_ID = env.GOOGLE_SHEETS_SPREADSHEET_ID;
process.env.GOOGLE_SHEETS_CREDENTIALS_PATH = env.GOOGLE_SHEETS_CREDENTIALS_PATH;

async function checkLeads() {
    console.log('🔍 Verificando leads na planilha real...');
    console.log(`ID: ${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}`);

    try {
        const client = new GoogleSheetsClient();
        const leads = await client.getLeads();

        console.log(`📊 Total encontrado: ${leads.length}`);
        if (leads.length > 0) {
            console.log('\nÚltimos leads na planilha:');
            leads.slice(-3).forEach(l => {
                console.log(`- ${l.full_name} (${l.phone_number}) - Criado em: ${l.created_time}`);
            });
        }
    } catch (error) {
        console.error('❌ Erro ao ler planilha:', error.message);
    }
}

checkLeads();
