# Integração Google Sheets → CRM Max

Este documento descreve como funciona a integração automática entre o Google Sheets (formulários do Facebook Ads) e o CRM Max.

## 📋 Visão Geral

A integração lê automaticamente os leads capturados via Facebook Ads (que são salvos em uma planilha do Google Sheets) e os importa para o CRM, criando:
1. Um novo **contato** com os dados do lead
2. Um novo **deal (negócio)** no primeiro estágio do board
3. **Mensagem WhatsApp para Max** notificando sobre o novo lead
4. **Mensagem WhatsApp para o Lead** com o primeiro contato

## 🔧 Configuração

### 1. Variáveis de Ambiente

As seguintes variáveis devem estar configuradas no arquivo [.env.local](.env.local):

```bash
# Google Sheets Integration (HML - Homologation Environment)
GOOGLE_SHEETS_SPREADSHEET_ID=1AxH1q3aLBmJokZzx5-u5sQ3-h2vkQ9I9tw4J1Tiehas
GOOGLE_SHEETS_CREDENTIALS_PATH=./google-sheets-credentials.json

# WhatsApp Integration
MAX_PHONE_NUMBER=5561992978796
MAX_PHONE_NUMBER_2=5561999999999 # Opcional: Segundo número para notificação
EVOLUTION_API_KEY=C24AA838FAD1-4A36-A447-F1C8FBEEF050
EVOLUTION_API_URL=https://evolution.app.info.pl/message/sendText/Max_vendedor
```

**IMPORTANTE:** O `GOOGLE_SHEETS_SPREADSHEET_ID` atual é o ambiente de **HOMOLOGAÇÃO (HML)**. Para produção, substitua pelo ID da planilha real.

### 2. Credenciais do Google Sheets

O arquivo `google-sheets-credentials.json` contém as credenciais da service account que acessa a planilha.

**Email da Service Account:** `integra-ao-crm-max@n8n-projetos-450609.iam.gserviceaccount.com`

**IMPORTANTE:** A planilha do Google Sheets deve ser compartilhada (permissão de leitura) com este email para que a integração funcione.

### 3. Board Padrão

A integração adiciona os deals no **board padrão** do CRM. Certifique-se de que:
- Existe um board marcado como padrão (`is_default = true`)
- O board possui pelo menos um estágio configurado
- Os deals serão criados no **primeiro estágio** do board (menor valor de `order`)

## 🚀 Como Usar

### Sincronização Manual

Para executar a sincronização manualmente, faça uma requisição POST para o endpoint:

```bash
POST http://localhost:3000/api/integrations/google-sheets/sync
```

**Exemplo com curl:**
```bash
curl -X POST http://localhost:3000/api/integrations/google-sheets/sync
```

**Exemplo com Node.js:**
```javascript
const response = await fetch('http://localhost:3000/api/integrations/google-sheets/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
console.log(result);
```

### Script de Teste

Foi criado um script de teste em [test-sync-google-sheets.mjs](test-sync-google-sheets.mjs) que você pode executar:

```bash
node test-sync-google-sheets.mjs
```

## 📊 Estrutura da Planilha

A planilha deve ter as seguintes colunas obrigatórias:

| Coluna | Descrição |
|--------|-----------|
| `id` | ID único do lead (usado para detectar duplicatas) |
| `created_time` | Data/hora de criação do lead |
| `ad_id` | ID do anúncio do Facebook |
| `ad_name` | Nome do anúncio |
| `form_id` | ID do formulário |
| `form_name` | Nome do formulário/empreendimento |
| `full_name` | Nome completo do lead |
| `phone_number` | Telefone do lead (formato E164: +5561999999999) |
| `lead_status` | Status do lead no Facebook |

Outras colunas dinâmicas (respostas do formulário) também são importadas e armazenadas nos `custom_fields` do deal.

## 🔄 Detecção de Duplicatas

A integração previne duplicatas usando o campo `id` da planilha:
- Cada deal criado armazena o `google_sheets_id` em `custom_fields`
- Antes de importar, verifica se já existe um deal com aquele ID
- Se existir, o lead é **ignorado** (não é importado novamente)

## 📱 Mensagens WhatsApp

### Mensagem 1: Notificação para Max e Equipe

Enviada para os números configurados em `MAX_PHONE_NUMBER` (e `MAX_PHONE_NUMBER_2` se existir):

```
🆕 NOVO LEAD CADASTRADO

👤 Nome: [nome]
📱 Telefone: [telefone]
🏢 Empreendimento: [empreendimento]
📅 Data: [data]

📋 RESPOSTAS DO FORMULÁRIO:
[respostas]

---
✅ Lead adicionado automaticamente ao CRM
```

### Mensagem 2: Primeiro Contato com o Lead

Enviada para o telefone do lead:

```
Olá, [Nome]!

Tudo bem? Aqui é o assistente digital do Max, da RE/MAX.

Vi que você demonstrou interesse na [Empreendimento] através do nosso formulário. Muito obrigado pelo contato!

Conseguiu analisar as informações, fotos e características do imóvel?

Estou à disposição para esclarecer todas as suas dúvidas! Se quiser, posso ligar para passar maiores informações
```

## 🏗️ Arquitetura

### Estrutura de Pastas

```
lib/integrations/
├── google-sheets/
│   ├── client.ts      # Cliente do Google Sheets API
│   └── index.ts       # Exports
└── evolution-api/
    ├── client.ts      # Cliente da Evolution API (WhatsApp)
    └── index.ts       # Exports

app/api/integrations/google-sheets/sync/
└── route.ts           # Endpoint de sincronização
```

### Fluxo de Execução

1. **Leitura do Google Sheets**
   - Usa `googleapis` com autenticação via service account
   - Lê todas as linhas da primeira aba
   - Retorna array de objetos `Lead`

2. **Verificação de Duplicatas**
   - Busca todos os deals da organização
   - Extrai `google_sheets_id` de cada deal
   - Filtra apenas leads novos

3. **Criação de Contatos**
   - Para cada lead novo, verifica se já existe contato com aquele telefone
   - Se não existir, cria novo contato com status `ACTIVE` e stage `LEAD`

4. **Criação de Deals**
   - Cria deal no primeiro estágio do board padrão
   - Armazena ID do Google Sheets em `custom_fields.google_sheets_id`
   - Adiciona tags: `google-sheets-import`, `facebook-ads`

5. **Envio de WhatsApp**
   - Envia notificação para Max
   - Envia mensagem de primeiro contato para o Lead
   - Usa Evolution API

## 🔐 Segurança

- **Service Account:** Usa autenticação via service account do Google (mais seguro que OAuth)
- **Supabase Admin Client:** Usa `createStaticAdminClient` para operações server-side
- **RLS:** Todos os dados são isolados por `organization_id`

## 🧪 Testes

### Teste Básico

Execute o script de teste:
```bash
node test-sync-google-sheets.mjs
```

### Resposta Esperada

```json
{
  "success": true,
  "message": "Sincronização concluída",
  "results": {
    "total": 10,      // Total de leads na planilha
    "new": 3,         // Leads novos (não importados antes)
    "skipped": 7,     // Leads já existentes (ignorados)
    "imported": 3,    // Leads importados com sucesso
    "errors": []      // Array de erros (se houver)
  }
}
```

## 🚨 Troubleshooting

### Erro: "Board padrão não encontrado"
**Solução:** Configure um board como padrão no banco de dados:
```sql
UPDATE boards SET is_default = true WHERE id = '<board-id>';
```

### Erro: "Permissão negada para acessar planilha"
**Solução:** Compartilhe a planilha com o email da service account:
`integra-ao-crm-max@n8n-projetos-450609.iam.gserviceaccount.com`

### Erro: "Já existe um negócio para este contato"
**Informação:** Este é um comportamento esperado. O backend previne múltiplos deals para o mesmo contato no mesmo estágio. Isso indica que o contato já foi importado anteriormente.

### Erro: "Erro ao enviar WhatsApp"
**Verificação:**
1. Verifique se `EVOLUTION_API_KEY` está correto
2. Verifique se `EVOLUTION_API_URL` está acessível
3. Verifique se o número está no formato E164 (+5561999999999)

## 📈 Melhorias Futuras

- [ ] Adicionar webhook do Google Sheets para sincronização em tempo real
- [ ] Criar interface de administração para configurar templates de mensagem
- [ ] Adicionar relatórios de sincronização
- [ ] Implementar retry automático para falhas de WhatsApp
- [ ] Adicionar suporte para múltiplas planilhas

## 📝 Notas Importantes

1. **Ambiente HML:** A planilha configurada é de HOMOLOGAÇÃO. Atualize para produção quando necessário.
2. **Telefones:** Os números devem estar no formato E164 para o WhatsApp funcionar corretamente.
3. **Duplicatas:** A detecção é baseada apenas no campo `id` do Google Sheets. Se dois leads tiverem o mesmo ID, o segundo será ignorado.
4. **Performance:** Para grandes volumes de dados (>1000 leads), considere implementar paginação ou processamento em batch.

---

**Última atualização:** 2026-02-02
**Desenvolvido por:** Atlas (via Claude Code)
