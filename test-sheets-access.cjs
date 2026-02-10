const { google } = require('googleapis');
const path = require('path');

async function testSheetsAccess() {
  try {
    // Caminho para as credenciais
    const keyFile = path.join(__dirname, 'google-sheets-credentials.json');

    // Autenticar
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ID da planilha
    const spreadsheetId = '1AxH1q3aLBmJokZzx5-u5sQ3-h2vkQ9I9tw4J1Tiehas';

    // Buscar informações da planilha
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log('\n✅ Acesso autorizado!');
    console.log('Título:', spreadsheet.data.properties.title);
    console.log('Abas:', spreadsheet.data.sheets.map(s => s.properties.title).join(', '));

    // Ler primeira aba (cabeçalhos e primeiras linhas)
    const firstSheet = spreadsheet.data.sheets[0].properties.title;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${firstSheet}!A1:Z10`, // Primeiras 10 linhas, até coluna Z
    });

    const rows = response.data.values;
    if (rows && rows.length) {
      console.log('\n📋 Estrutura da planilha:');
      console.log('Colunas:', rows[0].join(' | '));
      console.log('\nPrimeiras linhas de exemplo:');
      rows.slice(1, 3).forEach((row, i) => {
        console.log(`Linha ${i+2}:`, row.join(' | '));
      });
      console.log(`\nTotal de linhas lidas: ${rows.length}`);
    } else {
      console.log('Planilha vazia ou sem dados.');
    }

  } catch (error) {
    console.error('❌ Erro ao acessar planilha:');
    console.error(error.message);
    if (error.code === 403) {
      console.log('\n⚠️ Erro de permissão! Verifique se a planilha foi compartilhada com:');
      console.log('integra-ao-crm-max@n8n-projetos-450609.iam.gserviceaccount.com');
    }
  }
}

testSheetsAccess();
