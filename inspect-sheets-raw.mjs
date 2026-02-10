
import { google } from 'googleapis';
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
const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
const credentialsPath = env.GOOGLE_SHEETS_CREDENTIALS_PATH || './google-sheets-credentials.json';
const keyFile = path.resolve(process.cwd(), credentialsPath);

async function checkLeads() {
    console.log('🔍 Inspecionando planilha real diretamente...');
    console.log(`Planilha ID: ${spreadsheetId}`);

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Get sheet name
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const firstSheet = spreadsheet.data.sheets?.[0]?.properties?.title;

        if (!firstSheet) throw new Error('Nenhuma aba encontrada na planilha.');

        // Read data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${firstSheet}!A:Z`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            console.log('📊 A planilha está vazia ou contém apenas o cabeçalho.');
            return;
        }

        const headers = rows[0];
        console.log(`📊 Total de linhas (incluindo cabeçalho): ${rows.length}`);
        console.log(`📋 Colunas encontradas: ${headers.join(' | ')}`);

        console.log('\nÚltimos 5 registros:');
        const lastRows = rows.slice(-5);

        lastRows.forEach((row, idx) => {
            const lead = {};
            headers.forEach((h, i) => lead[h] = row[i]);
            console.log(`[${idx + 1}] ${lead.full_name || 'N/A'} - ${lead.phone_number || 'N/A'} (Data: ${lead.created_time || 'N/A'})`);
        });

    } catch (error) {
        console.error('❌ Erro na inspeção:', error.message);
    }
}

checkLeads();
