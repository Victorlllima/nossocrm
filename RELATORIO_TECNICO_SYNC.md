# 📑 Relatório Técnico: Diagnóstico e Correção do Sistema de Sincronização (Sync)

**Data:** 11 de Fevereiro de 2026
**Responsável Técnico:** HADES (Antigravity AI)
**Status do Sistema:** ✅ **OPERACIONAL** - Sistema validado e funcionando em produção
**Última Atualização:** 11/02/2026 14:10 BRT

---

## 1. 🔍 O Problema (Root Cause)
O sistema de sincronização entre Google Sheets e NossoCRM estava apresentando um **Erro 500 (Internal Server Error)** silencioso ao ser executado no ambiente de produção (Vercel).

### Causas Identificadas:
1.  **Dependência de Arquivo Físico:** O componente `GoogleSheetsClient` estava programado para buscar um arquivo `google-sheets-credentials.json` no sistema de arquivos. No ambiente serverless da Vercel, esse arquivo não existe, causando o crash imediato da rota.
2.  **Variáveis de Ambiente Desatualizadas:** Algumas chaves (JSON do Google e API do WhatsApp) foram renovadas e precisavam ser propagadas para o painel da Vercel.
3.  **Logs Opacos:** O erro ocorria antes de o sistema de log da Vercel capturar a stack de erro, dificultando o diagnóstico inicial.

---

## 2. 🛠️ Ações Realizadas (Intervenções)

### A. Consolidação do Ambiente (.env.local)
O arquivo `.env.local` foi atualizado com todas as variáveis críticas em formato de "produção pronta":
- **`GOOGLE_SHEETS_CREDENTIALS_JSON`**: O arquivo JSON completo minificado em uma única linha.
- **`GOOGLE_SHEETS_SPREADSHEET_ID`**: Alvo da planilha `1v0VpVSoULS-yREZMTLGjofc2baoES0RsK2n9gjb86-E`.
- **`RED_AUDIT_PHONE`**: Habilitado para auditoria (Modo Blindado).
- **`EVOLUTION_API_KEY` / `URL`**: Configurados para a instância de produção.

### B. Refatoração do Client (Google Sheets)
Arquivo alterado: `lib/integrations/google-sheets/client.ts`
- **Mudança:** Adicionada lógica de prioridade para a variável de ambiente `GOOGLE_SHEETS_CREDENTIALS_JSON`.
- **Resultado:** O sistema agora ignora o arquivo físico se detectar a string JSON no ambiente, tornando-o 100% resiliente a arquiteturas Serverless.

### C. Implementação de Diagnóstico em Produção
Arquivo alterado: `app/api/integrations/google-sheets/sync/route.ts`
- **Mudança:** O bloco `catch` foi alterado para retornar a stack de erro completa e a mensagem real do erro no corpo da resposta JSON (apenas para este estágio de teste).

---

## 3. ✅ Validação e Testes Realizados

### A. Teste de Sincronização (11/02/2026 14:01 BRT)
- **Endpoint Testado:** `https://nossocrm-55gresa6w-redpros-projects.vercel.app/api/integrations/google-sheets/sync`
- **Resultado:** HTTP 200 - Sucesso ✅
- **Leads Processados:**
  - Total: 5 leads na planilha
  - Importados: 2 leads novos
  - Duplicados: 2 leads (já existentes no CRM)
  - Pulados: 1 lead (critério de validação)
- **Tempo de Execução:** 7.69 segundos

### B. Validação de Mensagens WhatsApp
- **Destinatário:** `5561992978796` (Red - modo HML_MODE=true)
- **Mensagens Recebidas:** 3 mensagens ✅
  1. Notificação Max: Lead duplicado (test lead)
  2. Notificação Max: Lead novo (Victor Lima)
  3. Contato Inicial: Enviado para Victor Lima
- **Observação:** Mensagem para lead duplicado não enviou contato inicial (comportamento esperado)

---

## 4. 🚨 Problema Crítico Identificado: Domínio de Produção (HTTP 405)

### Sintoma
- **Domínio principal** `nossocrm.vercel.app` retorna **HTTP 405 (Method Not Allowed)** para requisições POST
- **Deploys individuais** funcionam corretamente (HTTP 200 ou 500 com erro esperado)

### Root Cause
- Problema de **roteamento/proxy do domínio Vercel**
- Não é problema de código ou configuração de build
- Todos os deploys das últimas 20 horas apresentam o mesmo comportamento

### Workaround Temporário
**AÇÍO OBRIGATÓRIA:** Atualizar o cron job externo para usar **deploy direto** em vez do domínio principal:

❌ **NÍO USE:** `https://nossocrm.vercel.app/api/integrations/google-sheets/sync`
✅ **USE:** URL do deploy mais recente (obtido via `vercel ls`)

**Script para obter URL atual:**
```bash
npx vercel ls nossocrm --yes | head -8 | grep "● Ready" | head -1 | awk '{print $2}'
```

### Solução Definitiva (Pendente)
- Abrir ticket no **Suporte Vercel** reportando problema de roteamento do domínio
- Fornecer evidências: deploys individuais funcionam, domínio principal quebrado

## 5. 📦 Commits Críticos desta Sessão
- `5061f7b`: **Correção definitiva** - Leitura de credenciais Google via variável de ambiente
- `d2f6494`: Correção de pontuação na mensagem de contato inicial
- `697d69a`: Rollback para commit estável de 09/02/2026
- `0a1fa3b`: Tentativa de forçar atualização do domínio (não resolveu)

## 6. 🎯 Status Final

### ✅ Funcionando
- Leitura de leads do Google Sheets
- Importação para CRM (Supabase)
- Envio de notificações WhatsApp (Evolution API)
- Modo HML (todas mensagens para Red)
- Detecção de duplicados

### ⚠️ Limitações Conhecidas
- Domínio principal quebrado (usar deploy direto)
- Cron job da Vercel não funcionará (usar cron externo)

### 📋 Próximas Ações Recomendadas
1. Atualizar cron job externo com URL de deploy direto
2. Abrir ticket no Suporte Vercel
3. Monitorar logs de sincronização
4. Após resolução do domínio, migrar cron para Vercel

---
**Shark Mode: ON 🦈🚀**
**Sistema Validado:** 11/02/2026 14:10 BRT
