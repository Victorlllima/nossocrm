# Single Source of Truth: NossoCRM (Max Lima Edition)

> **Arquivo:** `asbuilt.md`
> **Versão:** 1.0.0
> **Última Atualização:** 01/01/2026
> **Responsável:** Equipe de Engenharia (AI Lead)

Este documento serve como a **Fonte Única da Verdade (SSOT)** para o projeto. Qualquer agente ou desenvolvedor deve consultar este arquivo antes de iniciar novas implementações para garantir consistência arquitetural.

---

## 1. Visão Geral do Projeto

**Propósito:**
O **Max Lima** (anteriormente NossoCRM) é um CRM (Customer Relationship Management) inteligente, focado em produtividade para pequenas e médias equipes de vendas. Ele se diferencia pela integração profunda com IA ("Max Lima Pilot"), que atua propositivamente na gestão do pipeline, qualificação de leads e automação de tarefas.

**Principais Funcionalidades:**
*   **Gestão de Pipeline Visual:** Quadros Kanban arrastáveis com múltiplos boards configuráveis.
*   **CRM Multi-Entidade:** Gestão unificada de Contatos (Pessoas) e Empresas (Clientes).
*   **Assistente de IA (RAG):** Chat contextual ("Pilot") que analisa deals, sugere ações e gera conteúdo (e-mails, scripts).
*   **Gestão de Atividades:** Tarefas, reuniões e chamadas vinculadas a entidades.
*   **Inbox Inteligente:** Briefings diários e notificações priorizadas por IA.
*   **Multi-Tenant:** Arquitetura preparada para múltiplas organizações (isolamento via `organization_id`).

---

## 2. Tech Stack Completa

### Frontend
*   **Framework:** Next.js 16.0.10 (App Router).
*   **Linguagem:** TypeScript 5.x.
*   **UI Library:** React 19 (RC), Radix UI (Primitives), Lucide React (Ícones).
*   **Estilização:** Tailwind CSS v4.
*   **Gerenciamento de Estado:** TanStack Query v5 (Server State) + React Context (UI State).
*   **AI Integration:** Vercel AI SDK v6 (`@ai-sdk/react`, `@ai-sdk/openai`, etc.).

### Backend
*   **Runtime:** Node.js (via Next.js Server Actions & API Routes).
*   **Framework:** Next.js Route Handlers (Standard Web APIs).
*   **Autenticação:** Supabase Auth (SSR flow).

### Banco de Dados
*   **Serviço:** Supabase (Managed PostgreSQL).
*   **Acesso a Dados:** `@supabase/supabase-js` (Client) + `@supabase/ssr`.
*   **Segurança:** Row Level Security (RLS) mandatório em todas as tabelas.

### Ferramentas
*   **Testes:** Vitest + React Testing Library + Happy DOM.
*   **Build:** Turbopack (dev) / Webpack (build).
*   **Linting:** ESLint v9.
*   **PWA:** Service Workers configurados (`next-pwa` customizado).

---

## 3. Arquitetura e Estrutura de Pastas

O projeto segue uma arquitetura **Feature-based**, onde a lógica de negócios é agrupada por domínio (`features/`), enquanto a infraestrutura reside em `app/` e `lib/`.

```text
nossocrm/
├── app/                  # ROTAS (Next.js App Router)
│   ├── (protected)/      # Área logada (Dashboard, Pipeline, etc.)
│   ├── api/              # Endpoints Backend (REST/Edge)
│   ├── auth/             # Callbacks de Autenticação
│   ├── install/          # Wizard de Instalação ("Setup Instance")
│   └── layout.tsx        # Root Layout (Providers globais)
├── components/           # UI KIT (Componentes visuais agnósticos)
│   ├── ui/               # Primitivos (Buttons, Inputs, Dialogs)
│   ├── navigation/       # Sidebar e Menus
│   ├── ai/               # Componentes de Chat/IA Genérica
│   └── wiring/           # Conectores de Providers
├── features/             # LÓGICA DE NEGÓCIO (Domain Driven)
│   ├── boards/           # Lógica do Kanban
│   ├── contacts/         # Lógica de Clientes/Empresas
│   ├── deals/            # Lógica de Oportunidades
│   ├── activities/       # Tarefas e Agenda
│   ├── inbox/            # Central de Notificações
│   └── ...
├── lib/                  # INFRA E UTILS
│   ├── supabase/         # Clients (Server/Client) e Middlewares
│   ├── query/            # Configuração do React Query
│   ├── ai/               # Agentes, Prompts e Tools
│   └── utils/            # Helpers diversos
├── types/                # Definições Globais de Tipos
└── public/               # Assets Estáticos
```

**Convenção de Localização:**
*   **Hooks de Funcionalidade:** Dentro de `features/<domain>/hooks`.
*   **Componentes de Funcionalidade:** Dentro de `features/<domain>/components`.
*   **Server Actions/API Calls:** Dentro de `features/<domain>/api` ou `lib/`.

---

## 4. Modelo de Dados (Schema Simplificado)

Os tipos globais residem em `types/types.ts`.

*   **Organization**: Tenant (Cliente do SaaS).
*   **Contact**: Pessoa física. Relacionada a `Organization` e opcionalmente a `CRMCompany`.
*   **CRMCompany**: Pessoa jurídica (Cliente do Usuário).
*   **Deal**: Oportunidade de venda. Relacionada a `Contact` e `Board`.
*   **Board**: Quadro Kanban. Contém `BoardStage` (colunas).
*   **Activity**: Tarefa/Evento. Relacionada a `Deal` ou `Contact`.
*   **Product/DealItem**: Itens vendáveis associados a um Deal.

**Padrão de Segurança (RLS):**
Todas as tabelas possuem a coluna `organization_id` (UUID). As policies do Supabase garantem que `auth.uid()` só acesse registros onde sua organização corresponde.

---

## 5. Rotas e Interfaces (APIs)

### Frontend (App Router)
*   `/dashboard`: Visão geral e métricas.
*   `/pipeline` (alias `/boards`): Gestão visual de deals.
*   `/contacts`: Listagem e edição de contatos/empresas.
*   `/activities`: Agenda e tarefas.
*   `/inbox`: Notificações e briefing IA.
*   `/settings`: Configurações da conta/organização.
*   `/install`: Wizard de configuração inicial.

### Backend (Route Handlers)
*   **IA & Agentes:**
    *   `POST /api/ai/chat`: Endpoint principal do Chatbot (Streaming).
    *   `POST /api/ai/tasks/*`: Tarefas específicas (gerar resumo, analisar deal).
*   **Sistema:**
    *   `POST /api/setup-instance`: Criação do primeiro admin/org.
    *   `GET /api/public/v1/docs`: Swagger UI da API pública.

---

## 6. Configuração e Variáveis de Ambiente

Arquivo necessário: `.env.local`

**Chaves Obrigatórias:**
*   `NEXT_PUBLIC_SUPABASE_URL`: Endpoint da API Supabase.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave pública para cliente.
*   `SUPABASE_SERVICE_ROLE_KEY`: Chave administrativa (Server-side only).

**Chaves Opcionais / Flags:**
*   `ALLOW_AI_TEST_ROUTE`: (boolean) Habilita rota de debug de IA.
*   `ALLOW_UI_MOCKS_ROUTE`: (boolean) Habilita mocks visuais.
*   `INSTALLER_ENABLED`: (boolean) Controle de acesso ao wizard `/install`.

**Comandos do Projeto:**
*   `npm install`: Instalar dependências.
*   `npm run dev`: Rodar servidor de desenvolvimento (Porta 3000+).
*   `npm run build`: Compilar para produção.
*   `npm run typecheck`: Validar TypeScript.
*   `npm test`: Rodar testes unitários (Vitest).

---

## 7. Estado Atual e Convenções

**Status do Desenvolvimento:**
*   ✅ **Core CRM**: Funcional (CRUD de Contatos, Deals, Boards).
*   ✅ **IA Integration**: Funcional (Chat, Tools de leitura/escrita, RAG básico).
*   ✅ **Autenticação**: Funcional (Supabase Auth).
*   ⚠️ **Mobile/PWA**: Em refinamento (Layouts responsivos implementados, mas precisam de polimento).
*   ⚠️ **Testes**: Cobertura parcial (foco em core logic).

**Convenções de Código:**
1.  **Língua Principal**: Inglês para código (variáveis, funções, commits), Português para textos da UI.
2.  **Estilização**: **Tailwind CSS** exclusivo. Evitar CSS Modules ou CSS-in-JS.
3.  **Imports**: Usar aliases `@/` (ex: `@/components/ui/button`).
4.  **Componentes**: "Server Components" por padrão. Usar `'use client'` apenas quando necessário (interatividade/hooks).
5.  **Clean Code**: Funções pequenas, hooks customizados para lógica complexa.

---
*Documento gerado automaticamente para conformidade técnica.*
