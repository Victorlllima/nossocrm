# 🦈 PROTOCOLO DE TRANSMISSÍO S.H.A.R.K. - V1.0

Este documento é a ÚNICA fonte de verdade para a continuidade do desenvolvimento do **NossoCRM**.

## 🏗️ CONTEXTO TÉCNICO
- **Stack**: Next.js 16.1 (Turbopack), Supabase (PostgreSQL + Auth), AI SDK v3, Tailwind CSS 4.
- **Filosofia**: Design Premium (Glassmorphism, Dots Background), Didática Humanizada e Método S.H.A.R.K.

## 🚦 STATUS ATUAL (ESTADO DE GUERRA)
O projeto está em fase de correção de build para deploy na Vercel.

### 1. Sistema de Chat (AI SDK v3)
- **Arquivo**: `components/ai/UIChat.tsx`
- **O que foi feito**: Migração para a nova sintaxe do `useChat` (`append` em vez de `sendMessage`, `isLoading` em vez de `status`).
- **Pendente**: Verificar se os disparos de ferramentas (Tool Invocations) e aprovações estão fluindo perfeitamente no backend.

### 2. Validação de Formulários
- **Arquivo**: `lib/forms/useFormEnhanced.ts`
- **O que foi feito**: Correção de erros de variância de tipo no `zodResolver`.
- **Nota Técnica**: Foi utilizado um cast `as any` no resolver para lidar com a rigidez do TypeScript 5+ com genéricos de `FieldValues`. Não remova sem testar a compatibilidade do Zod v4.

### 3. Página de Troca de Senha (Build Blocker)
- **Local**: `app/(protected)/update-password/`
- **Problema**: Erro de prerenderização (`prerender-error`) causado por chamadas de roteamento/auth durante a geração estática.
- **Solução Atual**: O conteúdo foi movido para `UpdatePasswordClient.tsx` e carregado via `next/dynamic` com `ssr: false` no `page.tsx`.

### 4. Fantasma do 'generate-embeddings'
- O compilador TS às vezes reclama de um arquivo `app/api/generate-embeddings/route.js` inexistente. 
- **Causa**: Provavelmente lixo de cache do Turbopack ou referências sozinhas no `.next`. 
- **Ação**: Sempre que esse erro travar a build, limpe o cache (`rm -rf .next`).

## 🗺️ ROADMAP DE FUNCIONALIDADES (PRÓXIMOS PASSOS)
A ordem de prioridade definida pelo usuário (Red) é:

1.  **Mentoria**: Fluxo de qualificação amplo (além do Método Shark).
2.  **In Company**: Copy de conversão + escassez + formulário.
3.  **Eventos**: Landing page simples "Em Breve".
4.  **Contrate (Shark Radar)**: Implementar a ferramenta de busca/análise Shark Radar.
5.  **Newsletter (Vortex)**: Implementar efeito visual "Vortex" na captura de email.
6.  **Contato (AI Terminal)**: Chat interface em estilo terminal de comando.

## 📜 REGRAS DE OURO (NÍO NEGOCIÁVEIS)
- **Analogias Invisíveis**: Nunca diga "pense como um..."; apenas explique o conceito técnico usando a analogia de forma direta na narração.
- **Didática SHARK**: Tom amigável, chamando o usuário pelo nome (Red) e celebrando vitórias.
- **Build First**: Não avance para novas features sem garantir que `npm run build` termine com sucesso.

## 🔍 ARQUIVOS CRÍTICOS PARA ESTUDO
- `components/ai/UIChat.tsx` (Core da IA)
- `features/auth/actions/update-password.ts` (Server Action Crítica)
- `context/AuthContext.tsx` (Coração da Autenticação)
- `lib/forms/useFormEnhanced.ts` (Sistema de Validação)

---
**Assinado**: Atlas & Hades (Via Antigravity AI)
