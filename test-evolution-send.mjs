
const API_URL = "https://evolution.app.info.pl/message/sendText/Max_vendedor";
const API_KEY = "C24AA838FAD1-4A36-A447-F1C8FBEEF050";
const TEST_NUMBER = "5561992978796";

console.log('🔧 Configuração Hardcoded para Teste:');
console.log(`URL: ${API_URL}`);
console.log(`KEY: ${API_KEY.substring(0, 5)}...`);
console.log('-----------------------------------');

async function sendTestMessage(number, text, description) {
    console.log(`\n📤 Enviando ${description}...`);
    try {
        const payload = {
            number: number,
            text: text,
            delay: 1200,
            linkPreview: true
        };

        console.log('Payload:', JSON.stringify(payload));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const textResponse = await response.text();
        console.log('Status:', response.status);
        console.log('Response Body:', textResponse);

        if (response.ok) {
            console.log(`✅ ${description} enviada com sucesso!`);
        } else {
            console.error(`❌ Erro ao enviar ${description}`);
        }
    } catch (error) {
        console.error(`❌ Exceção ao enviar ${description}:`, error.message);
    }
}

async function runTests() {
    // 1. Simulação de Novo Lead vindo do formulário
    const leadMessage = `Olá, Victor! 👋

Vi que você demonstrou interesse na Loja da 311 através do nosso formulário. Muito obrigado pelo contato!

Aqui é o assistente digital do Max, da RE/MAX. Conseguiu analisar as informações e localização dessa loja?

Estou à disposição para tirar suas dúvidas!`;

    await sendTestMessage(TEST_NUMBER, leadMessage, '1. Mensagem de Novo Lead (Loja 311)');
}

runTests();
