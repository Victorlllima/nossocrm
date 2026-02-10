/**
 * Script de teste para sincronização do Google Sheets
 *
 * Este script faz uma requisição HTTP para o endpoint de sincronização
 * e exibe os resultados no console.
 */

const ENDPOINT_URL = 'http://localhost:3000/api/integrations/google-sheets/sync';

async function testSync() {
  console.log('🚀 Iniciando teste de sincronização...\n');

  try {
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Erro na requisição:');
      console.error(`Status: ${response.status}`);
      console.error('Resposta:', responseText.substring(0, 500));
      return;
    }

    const data = JSON.parse(responseText);

    console.log('✅ Sincronização executada com sucesso!\n');
    console.log('📊 Resultados:');
    console.log(`   Total de leads na planilha: ${data.results.total}`);
    console.log(`   Leads novos importados: ${data.results.imported}`);
    console.log(`   Leads já existentes (ignorados): ${data.results.skipped}`);

    if (data.results.errors && data.results.errors.length > 0) {
      console.log(`\n⚠️  Erros encontrados (${data.results.errors.length}):`);
      data.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ Nenhum erro encontrado!');
    }

    console.log('\n📋 Detalhes completos:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Erro ao executar teste:');
    console.error(error.message);
  }
}

testSync();
