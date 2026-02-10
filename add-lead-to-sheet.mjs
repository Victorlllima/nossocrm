
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
const keyFile = path.resolve(process.cwd(), './google-sheets-credentials.json');

async function writeToSheet() {
    console.log('📝 Escrevendo Johnny Ramone na planilha do Google Sheets...');

    const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetName = spreadsheet.data.sheets[0].properties.title;

        const leadRow = [
            `SIM_FB_${Date.now()}`,
            new Date().toISOString(),
            'ad_123',
            'Anúncio Goiânia Luxo',
            'form_bueno',
            'Aldeia Bueno',
            'Johnny Ramone',
            '5561992978796',
            'ACTIVE',
            'facebook',
            'Lançamento Bueno',
            'Investidores Goiânia'
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A:L`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [leadRow]
            },
        });

        console.log('✅ Johnny Ramone adicionado à planilha!');
        console.log(`Planilha ID: ${spreadsheetId}`);

    } catch (error) {
        console.error('❌ Erro ao escrever na planilha:', error.message);
    }
}

writeToSheet();
