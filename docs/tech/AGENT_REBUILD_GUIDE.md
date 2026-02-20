# Guia de Reconstrução do Agente de IA para WhatsApp
**Status:** PRONTO PARA EXECUÇÃO
**Base:** Dev Resetada (igual a Main)
**Dependência Crítica:** `ai@^3.2.14`, `zod@^3.23` (NÃO TENTE ATUALIZAR, VAI QUEBRAR TUDO)

Bem-vindo, Agente (ou Dev Humano). 👋
Sua missão: Implementar o Agente de IA para WhatsApp DE FORMA LIMPA E SEGURA.

## Regras de Ouro (Derivadas do Post-Mortem) ⚠️

1.  **PROIBIDO ATUALIZAR DEPENDÊNCIAS DO ZERO:**
    - Não toque no `package.json` para atualizar dependências globais (`ai`, `zod`, `react`, etc.). O projeto DEVE rodar com o stack atual.
    - Se precisar de uma feature nova do AI SDK v6, **ESQUEÇA**. Use a v3 (instalada) ou crie um polyfill manual.

2.  **USE O PADRÃO ANTIGO DE FERRAMENTAS:**
    - Em vez de `jsonSchema`, use `zod` schema diretamente.
    - Em vez de `execute: async ({ ... })`, use `execute: async (input) => { const { ... } = input; }`. (Isso evita problemas de destructuring com tipos inferidos errados).

3.  **TYPE SAFETY FIRST:**
    - **NÃO USE `as any`**. Se o TypeScript reclamar, significa que sua definição está errada para a versão instalada. Conserte a definição.
    - Declare interfaces explícitas para Inputs e Outputs das Tools.

## Plano de Implementação Passo-a-Passo 📝

### 1. Criar Definição das Tools (`lib/ai/whatsapp-tools.ts`)
- Use `z.object` com `describe`.
- Exporte como um objeto simples `{ toolName: tool(...) }` (padrão v3).
- Teste a compilação com `npm run typecheck` (ou `tsc --noEmit`).

### 2. Criar o Prompt do Sistema (`lib/ai/whatsapp-prompt.ts`)
- Mantenha o prompt limpo, focado em vendas e personas (Max, Corretor).
- Não dependa de recursos complexos do AI SDK (como tool-choice forçado complexo). Use o padrão `auto`.

### 3. Implementar o Endpoint (`app/api/whatsapp/webhook/route.ts`)
- Use `streamText` ou `generateText` da versão v3.
- Lembre-se que `onToolCall` pode ter assinatura diferente na v3. Verifique a doc ou tipos instalados (`node_modules/ai/dist/index.d.ts`).
- **NÃO tente usar `ToolLoopAgent` ou outras abstrações removidas.**
- Implemente o loop de ferramentas manualmente se necessário (na v3, o `streamText` já suporta `maxSteps: 5` e `tools` automaticamente).

### 4. Teste Local
- Use `npm run dev`.
- Simule requests com Postman/Insomnia para o endpoint.
- Verifique logs no terminal.

## Exemplo de Código Seguro (Tool v3)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const minhaTool = tool({
  description: 'Faz algo útil',
  parameters: z.object({
    input: z.string().describe('O que fazer'),
  }),
  execute: async ({ input }) => {
    // Lógica aqui
    return `Feito: ${input}`;
  },
});
```

---
**Boa sorte! E lembre-se: A estabilidade da Produção é mais importante que o hype da versão mais nova.** 🚀
