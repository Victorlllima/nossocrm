# Single Source of Truth: NossoCRM (Max Lima Edition)

> **Arquivo:** `asbuilt.md`
> **Versão:** 1.3.0
> **Última Atualização:** 08/01/2026
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
*   **Relatórios e Analytics:** Dashboards com métricas de vendas e performance.
*   **Multi-Tenant:** Arquitetura preparada para múltiplas organizações (isolamento via `organization_id`).
*   **Integração n8n/WhatsApp:** Automação de leads com sincronização automática via trigger.
*   **Identidade Visual Max Lima:** Tema Dark com paleta de cores exclusiva (Marrom Escuro #191815, Dourado #ECC197).

---

## 2. Tech Stack Completa

### Frontend
*   **Framework:** Next.js 16.0.10 (App Router).
*   **Linguagem:** TypeScript 5.x.
*   **UI Library:** React 19.2.1, Radix UI (Primitives), Lucide React (Ícones).
*   **Estilização:** Tailwind CSS v4.
*   **Gerenciamento de Estado:** TanStack Query v5 (Server State) + Zustand (Client State) + React Context (UI State).
*   **AI Integration:** Vercel AI SDK v6 (`@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`).
*   **Animações:** Framer Motion v12.
*   **Formulários:** React Hook Form v7 + Zod v4 (validação).
*   **Gráficos:** Recharts v3.

### Backend
*   **Runtime:** Node.js (via Next.js Server Actions & API Routes).
*   **Framework:** Next.js Route Handlers (Standard Web APIs).
*   **Autenticação:** Supabase Auth (SSR flow).
*   **PDF Export:** jsPDF + jspdf-autotable.

### Banco de Dados
*   **Serviço:** Supabase (Managed PostgreSQL).
*   **Acesso a Dados:** `@supabase/supabase-js` v2 (Client) + `@supabase/ssr`.
*   **Segurança:** Row Level Security (RLS) mandatório em todas as tabelas.

### Ferramentas
*   **Testes:** Vitest v4 + React Testing Library v16 + Happy DOM + Vitest-Axe (a11y).
*   **Build:** Turbopack (dev) / Webpack (build).
*   **Linting:** ESLint v9.
*   **PWA:** Service Workers configurados.

---

## 3. Arquitetura e Estrutura de Pastas

O projeto segue uma arquitetura **Feature-based**, onde a lógica de negócios é agrupada por domínio (`features/`), enquanto a infraestrutura reside em `app/` e `lib/`.

```text
nossocrm/
├── app/                      # ROTAS (Next.js App Router)
│   ├── (protected)/          # Área logada (Dashboard, Pipeline, etc.)
│   │   ├── activities/       # Gestão de atividades e agenda
│   │   ├── ai/               # Interface do Pilot AI
│   │   ├── ai-test/          # Área de testes de IA
│   │   ├── boards/           # Gestão de quadros Kanban
│   │   ├── contacts/         # Listagem/edição de contatos
│   │   ├── dashboard/        # Visão geral e métricas
│   │   ├── deals/            # Detalhes de oportunidades
│   │   ├── decisions/        # Centro de decisões inteligentes
│   │   ├── inbox/            # Central de notificações
│   │   ├── labs/             # Funcionalidades experimentais
│   │   ├── pipeline/         # Visualização Kanban (alias)
│   │   ├── profile/          # Perfil do usuário
│   │   ├── reports/          # Relatórios e analytics
│   │   ├── settings/         # Configurações da conta/org
│   │   └── setup/            # Configuração pós-instalação
│   ├── api/                  # Endpoints Backend (REST/Edge)
│   │   ├── admin/            # APIs administrativas
│   │   ├── ai/               # Endpoints de IA (chat, tasks)
│   │   ├── chat/             # Chat em tempo real
│   │   ├── contacts/         # CRUD de contatos
│   │   ├── installer/        # APIs de instalação
│   │   ├── integrations/     # Webhooks externos (n8n)
│   │   ├── invites/          # Sistema de convites
│   │   ├── mcp/              # Model Context Protocol
│   │   ├── public/           # APIs públicas (v1)
│   │   ├── settings/         # APIs de configuração
│   │   └── setup-instance/   # Criação inicial de admin/org
│   ├── auth/                 # Callbacks de Autenticação
│   ├── install/              # Wizard de Instalação ("Setup Instance")
│   ├── join/                 # Entrada via convite
│   ├── login/                # Página de login
│   └── layout.tsx            # Root Layout (Providers globais)
├── components/               # UI KIT (Componentes visuais agnósticos)
│   ├── ai/                   # Componentes de Chat/IA Genérica
│   ├── charts/               # Componentes de gráficos
│   ├── debug/                # Ferramentas de debug
│   ├── filters/              # Componentes de filtro
│   ├── navigation/           # Sidebar e Menus
│   ├── notifications/        # Componentes de notificação
│   ├── pwa/                  # Componentes PWA
│   ├── ui/                   # Primitivos (Buttons, Inputs, Dialogs)
│   ├── AIAssistant.tsx       # Assistente de IA global
│   ├── ConfirmModal.tsx      # Modal de confirmação
│   ├── ConsentModal.tsx      # Modal de consentimento LGPD
│   ├── Layout.tsx            # Layout principal
│   ├── MaintenanceBanner.tsx # Banner de manutenção
│   ├── OnboardingModal.tsx   # Modal de onboarding
│   └── PageLoader.tsx        # Loader de página
├── context/                  # React Context Providers
├── features/                 # LÓGICA DE NEGÓCIO (Domain Driven)
│   ├── activities/           # Lógica de Tarefas e Agenda
│   ├── ai-hub/               # Hub central de IA
│   ├── boards/               # Lógica do Kanban
│   ├── contacts/             # Lógica de Clientes/Empresas
│   ├── dashboard/            # Lógica do Dashboard
│   ├── deals/                # Lógica de Oportunidades
│   ├── decisions/            # Lógica de Decisões Inteligentes
│   ├── inbox/                # Central de Notificações
│   ├── profile/              # Lógica de Perfil
│   ├── reports/              # Lógica de Relatórios
│   └── settings/             # Lógica de Configurações
├── hooks/                    # Hooks globais compartilhados
├── lib/                      # INFRA E UTILS
│   ├── a11y/                 # Utilidades de acessibilidade
│   ├── ai/                   # Agentes, Prompts e Tools
│   ├── consent/              # Gerenciamento de consentimento
│   ├── debug/                # Ferramentas de debug
│   ├── forms/                # Utilitários de formulários
│   ├── installer/            # Lógica de instalação
│   ├── mcp/                  # Model Context Protocol
│   ├── public-api/           # API pública (Swagger/OpenAPI)
│   ├── query/                # Configuração do React Query
│   ├── realtime/             # Supabase Realtime
│   ├── security/             # Utilitários de segurança
│   ├── stores/               # Zustand stores
│   ├── supabase/             # Clients (Server/Client) e Middlewares
│   ├── templates/            # Templates de e-mail/documento
│   ├── utils/                # Helpers diversos
│   └── validations/          # Schemas de validação Zod
├── supabase/                 # Configuração Supabase
│   ├── functions/            # Edge Functions
│   ├── migrations/           # Migrations SQL
│   ├── config.toml           # Configuração local
│   └── reset.sql             # Script de reset (dev)
├── test/                     # Testes automatizados
├── types/                    # Definições Globais de Tipos
│   ├── types.ts              # Tipos de domínio
│   ├── ai.ts                 # Tipos de IA
│   └── aiActions.ts          # Tipos de ações de IA
└── public/                   # Assets Estáticos
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
*   **Leads**: Entrada de leads externos (n8n/WhatsApp).
*   **ConversationSummaries**: Resumos de conversas processados por IA (n8n).

**Padrão de Segurança (RLS):**
Todas as tabelas possuem a coluna `organization_id` (UUID). As policies do Supabase garantem que `auth.uid()` só acesse registros onde sua organização corresponde.

**Migrations Disponíveis:**
1. `20251201000000_schema_init.sql` - Schema inicial completo (82KB).
2. `20260102144200_n8n_lead_sync_trigger.sql` - Trigger de sincronização de leads WhatsApp/n8n.
3. `20260106_auto_convert_leads.sql` - Trigger de conversão automática de leads em deals/contacts.
4. `20260107160000_conversation_summaries.sql` - Tabela e trigger de resumos de conversas IA.

---

## 5. Rotas e Interfaces (APIs)

### Frontend (App Router)
*   `/dashboard`: Visão geral e métricas.
*   `/pipeline` (alias `/boards`): Gestão visual de deals.
*   `/contacts`: Listagem e edição de contatos/empresas.
*   `/activities`: Agenda e tarefas.
*   `/inbox`: Notificações e briefing IA.
*   `/deals/[id]`: Detalhes de uma oportunidade específica.
*   `/reports`: Relatórios e analytics de vendas.
*   `/settings`: Configurações da conta/organização.
*   `/profile`: Perfil do usuário.
*   `/ai`: Interface do Pilot AI.
*   `/decisions`: Centro de decisões inteligentes.
*   `/labs`: Funcionalidades experimentais.
*   `/install`: Wizard de configuração inicial.
*   `/join`: Entrada via convite de equipe.

### Backend (Route Handlers)
*   **IA & Agentes:**
    *   `POST /api/ai/chat`: Endpoint principal do Chatbot (Streaming).
    *   `POST /api/ai/tasks/*`: Tarefas específicas (gerar resumo, analisar deal).
*   **Integrações Externas:**
    *   `POST /api/integrations/n8n/incoming`: Webhook para receber leads do n8n/WhatsApp.
*   **Administração:**
    *   `/api/admin/*`: Endpoints administrativos do sistema.
*   **Sistema:**
    *   `POST /api/setup-instance`: Criação do primeiro admin/org.
    *   `GET /api/public/v1/docs`: Swagger UI da API pública.
*   **Convites:**
    *   `/api/invites/*`: Gerenciamento de convites de equipe.
*   **MCP:**
    *   `/api/mcp/*`: Model Context Protocol para integrações de IA.

---

## 5.1 Integrações Externas (n8n/WhatsApp)

O CRM possui integração nativa com **n8n** para automação de leads vindos do WhatsApp.

### Opção 1: Via API Webhook
**Endpoint:** `POST /api/integrations/n8n/incoming`

**Payload:**
```json
{
  "phone": "+5511999999999",
  "name": "Nome do Lead",
  "organization_id": "uuid-da-organizacao"
}
```

**Comportamento:**
1. Valida campos obrigatórios (`phone`, `organization_id`).
2. Busca ou cria contato na tabela `contacts`.
3. Identifica o board e estágio "Novo" da organização.
4. Cria um deal (card) no pipeline.

**Arquivo:** `app/api/integrations/n8n/incoming/route.ts`

### Opção 2: Via Database Trigger (Recomendado)
**Trigger:** `trg_sync_leads` (AFTER INSERT em `leads`)

**Função:** `sync_leads_to_crm()`

**Comportamento:**
1. Limpa o `whatsapp_id` (remove `@s.whatsapp.net`).
2. Busca ou cria contato em `contacts` com `whatsapp_phone`.
3. Identifica board padrão e estágio "Novo" ou primeiro disponível.
4. Cria deal no pipeline com tags `['whatsapp', 'n8n', 'auto']`.
5. Atualiza o lead com `converted_to_contact_id`.

**Migration:** `supabase/migrations/20260102144200_n8n_lead_sync_trigger.sql`

**Organização Target:** Max Lima (`3cd3d18e-6fd4-4f9c-8fcf-701d099e4e45`)

**Formato de entrada (tabela `leads`):**
```sql
INSERT INTO leads (name, whatsapp_id)
VALUES ('João Silva', '5511999999999@s.whatsapp.net');
```

### Colunas Adicionadas:
*   `contacts.whatsapp_phone` (TEXT): Número limpo do WhatsApp.
*   `leads.whatsapp_id` (TEXT): ID bruto do n8n (formato: `numero@s.whatsapp.net`).
*   `leads.converted_to_contact_id` (UUID): Referência ao contato criado.

### Nova Tabela: Conversation Summaries
* **Tabela:** `conversation_summaries`
* **Finalidade:** Receber resumos de conversas gerados por IA via n8n.
* **Trigger:** `trg_inject_summary` -> Injeta o conteúdo no campo `ai_summary` do Deal mais recente do contato.

### Integração n8n - Resumo de Conversa
**Tabela Alvo:** `conversation_summaries`
**Payload esperado do n8n:**
```json
{
  "whatsapp_id": "551199999999@s.whatsapp.net",
  "summary": "Cliente interessado no plano X, mas achou caro. Pediu retorno semana que vem.",
  "organization_id": "uuid-da-org"
}
```

---

## 6. Configuração e Variáveis de Ambiente

Arquivo necessário: `.env.local`

**Chaves Obrigatórias:**
*   `NEXT_PUBLIC_SUPABASE_URL`: Endpoint da API Supabase.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave pública para cliente.
*   `SUPABASE_SERVICE_ROLE_KEY`: Chave administrativa (Server-side only).

**Chaves de IA:**
*   `OPENAI_API_KEY`: Chave da API OpenAI.
*   `ANTHROPIC_API_KEY`: Chave da API Anthropic (Claude).
*   `GOOGLE_GENERATIVE_AI_API_KEY`: Chave da API Google AI.

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
*   `npm run test:run`: Rodar testes uma vez (CI).
*   `npm run lint`: Executar linting.
*   `npm run precheck`: Validação completa (lint + typecheck + test + build).
*   `npm run precheck:fast`: Validação rápida (lint + typecheck + test).
*   `npm run stories`: Rodar testes de stories.
*   `npm run smoke:integrations`: Testes de integração.

---

## 7. Estado Atual e Convenções

**Status do Desenvolvimento:**
*   ✅ **Core CRM**: Funcional (CRUD de Contatos, Deals, Boards).
*   ✅ **IA Integration**: Funcional (Chat, Tools de leitura/escrita, RAG básico).
*   ✅ **Autenticação**: Funcional (Supabase Auth).
*   ✅ **Integração n8n/WhatsApp**: Funcional (API Webhook + DB Trigger).
*   ✅ **Relatórios**: Funcional (Dashboard com métricas e analytics).
*   ✅ **Inbox Inteligente**: Funcional (Notificações e briefings).
*   ✅ **AI Hub**: Funcional (Centro de IA com múltiplos provedores).
*   ✅ **Sistema de Convites**: Funcional (Convites por e-mail para equipe).
*   ✅ **Onboarding**: Funcional (Modal de boas-vindas e setup).
*   ✅ **Consentimento LGPD**: Funcional (Modal de consentimento).
*   ⚠️ **Mobile/PWA**: Em refinamento (Layouts responsivos implementados).
*   ⚠️ **Testes**: Cobertura parcial (foco em core logic e a11y).
*   🧪 **Labs**: Área experimental para novas funcionalidades.

**Convenções de Código:**
1.  **Língua Principal**: Inglês para código (variáveis, funções, commits), Português para textos da UI.
2.  **Estilização**: **Tailwind CSS** exclusivo. Evitar CSS Modules ou CSS-in-JS.
3.  **Imports**: Usar aliases `@/` (ex: `@/components/ui/button`).
4.  **Componentes**: "Server Components" por padrão. Usar `'use client'` apenas quando necessário (interatividade/hooks).
5.  **Clean Code**: Funções pequenas, hooks customizados para lógica complexa.
6.  **Validação**: Zod para schemas, React Hook Form para formulários.
7.  **Estado Global**: Zustand para estado de cliente, TanStack Query para server state.
8.  **Acessibilidade**: Vitest-axe para testes de a11y, Radix UI para componentes acessíveis.

---

## 8. Dependências Principais

| Categoria | Pacote | Versão |
|-----------|--------|--------|
| Framework | Next.js | 16.0.10 |
| UI | React | 19.2.1 |
| Styling | Tailwind CSS | 4.x |
| State | TanStack Query | 5.90+ |
| State | Zustand | 5.0+ |
| AI | Vercel AI SDK | 6.0.3 |
| AI | @ai-sdk/openai | 3.0.1 |
| AI | @ai-sdk/anthropic | 3.0.1 |
| AI | @ai-sdk/google | 3.0.1 |
| Database | @supabase/supabase-js | 2.87+ |
| Animation | Framer Motion | 12.23+ |
| Forms | React Hook Form | 7.68+ |
| Validation | Zod | 4.1+ |
| Charts | Recharts | 3.5+ |
| Testing | Vitest | 4.0+ |
| Testing | React Testing Library | 16.3+ |

---

## 9. Repositório e Controle de Versão

### Repositórios Remotos

| Remote | URL | Descrição |
|--------|-----|-----------|
| `origin` | `https://github.com/Victorlllima/nossocrm.git` | Fork principal (desenvolvimento) |
| `upstream` | `https://github.com/whaleslaray/nossocrm.git` | Repositório original |

### Branches Locais

| Branch | Tracking | Status |
|--------|----------|--------|
| `main` **(atual)** | `origin/main` | ✅ Sincronizada |
| `maxCorretor` | `origin/maxCorretor` | Branch de feature |

### Branches Remotas

**origin:**
*   `origin/main` - Branch principal de desenvolvimento
*   `origin/maxCorretor` - Feature branch
*   `origin/single-source-of-truth` - Branch de documentação
*   `origin/HEAD` → `origin/main`

**upstream:**
*   `upstream/main` - Branch principal do repositório original

### Workflow de Git

1.  **Desenvolvimento:** Trabalhar na branch `main` ou criar feature branches.
2.  **Commits:** Usar prefixos semânticos (`feat:`, `fix:`, `docs:`, `refactor:`).
3.  **Sync:** Manter sincronizado com `origin` e periodicamente com `upstream`.

**Comandos úteis:**
```bash
# Verificar status
git status

# Sincronizar com origin
git pull origin main

# Sincronizar com upstream
git fetch upstream
git merge upstream/main

# Push para origin
git push origin main
```

### Último Commit (main)
```
ea4505f - Trigger de sincronização WhatsApp contacts and deals
```

---
*Documento atualizado em 06/01/2026 para conformidade técnica.*
