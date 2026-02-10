# Post-Mortem: Tentativa de Migração do Agente de IA (Whatsapp)
**Data:** 10/02/2026
**Status:** FALHA NA MIGRAÇÃO -> ROLLBACK EXECUTADO
**Branch de Backup:** `backup/failed-ai-migration`

## O Que Aconteceu?

Tentamos migrar o agente de WhatsApp (originalmente em N8n/LangChain) para o **Vercel AI SDK**. Durante o processo, enfrentamos severos problemas de compatibilidade entre versões de dependências críticas.

### 1. O Conflito do Zod 4 vs AI SDK v3
- O projeto usa `zod@^3.23.8`.
- Tentamos atualizar para `ai@^6.0.3` (versão mais recente, cheia de recursos).
- O `ai` v6 exige `zod@^3.25` ou `^4.0`.
- Ao atualizar o Zod para v4, quebramos `react-hook-form` e outras bibliotecas que dependem estritamente do Zod v3.
- Resultado: "Dependency Hell". O `npm install` falhava ou gerava warnings críticos.

### 2. O Problema de Tipagem do `tool()`
- O `ai` SDK v6 mudou a assinatura da função `tool()`.
- Tentamos usar `jsonSchema` (novo recurso da v6) para evitar o conflito do Zod.
- O TypeScript do projeto (configurado de forma estrita) rejeitou os tipos gerados pelo `jsonSchema` dentro da função `tool()`, acusando erro de overload (`Type 'undefined' is not assignable...`).
- A solução paliativa (`as any`) funcionou para build, mas o runtime era instável devido à mistura de versões.

### 3. Build da Vercel vs Runtime
- O build passava localmente com `as any`, mas falhava na Vercel ocasionalmente por diferenças de cache ou strictness.
- O ambiente de produção (`main`) permaneceu intacto.

## Lições Aprendidas

1.  **Não Misturar Versões Maiores:** Migrar o AI SDK para v6 em um projeto com Zod v3 antigo é arriscado. Ou atualiza-se TUDO (Zod, React Hook Form, etc.), ou mantém-se no AI SDK v3 (LTS).
2.  **Schema Validation:** O AI SDK v3 é fortemente acoplado ao Zod. Usar `jsonSchema` só é viável na v6+.
3.  **Strict Mode:** O TypeScript do projeto é implacável. Qualquer gambiarra (`as any`) deve ser evitada a todo custo em definições de infraestrutura central como Tools.
4.  **Rollback é Vida:** Ter a `main` protegida salvou a produção. O reset da `dev` foi a decisão correta para limpar o histórico.

## Próximos Passos Recomendados

Para a próxima tentativa de implementação do Agente:
- **Opção A (Segura):** Usar `ai` SDK v3 (versão atual do projeto) e aceitar as limitações.
- **Opção B (Correta):** Criar uma branch dedicada de `refactor/upgrade-deps` para atualizar Zod e todas as suas dependências *antes* de tocar no código do agente. Só depois atualizar o AI SDK.

**Recomendação Final:** Devido à complexidade e risco de quebrar formulários, recomendamos a **Opção A** para o MVP do Agente, migrando para a Opção B em um momento dedicado de refatoração técnica.
