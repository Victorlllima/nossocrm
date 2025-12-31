# As-Built Documentation - NossoCRM

**Data de Geração**: 31 de Dezembro de 2025
**Versão do Projeto**: 0.1.0

## 1. Visão Geral do Projeto

**NossoCRM** é uma plataforma de Gestão de Relacionamento com Clientes (CRM) desenvolvida para otimizar processos de vendas através de uma interface moderna e integração profunda com Inteligência Artificial. O sistema permite a gestão de pipelines, contatos, atividades e oferece um assistente virtual para automação e insights.

### Propósito
Facilitar a gestão comercial de pequenas e médias empresas, oferecendo ferramentas de produtividade e inteligência de dados em uma plataforma unificada e personalizável.

## 2. Arquitetura Técnica

### Stack Tecnológica
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5.x.
- **Estilização**: Tailwind CSS v4, Radix UI (componentes primitivos), Lucide React (ícones).
- **Backend**: Next.js API Routes (Serverless Functions).
- **Banco de Dados**: Supabase (PostgreSQL) com Row Level Security (RLS).
- **Autenticação**: Supabase Auth (Email/Password, integrações via SSR).
- **Estado & Cache**: TanStack Query v5 (React Query) com padrão "Single Source of Truth".
- **IA**: Vercel AI SDK v6 (suporte a Google Gemini, OpenAI, Anthropic).
- **Testes**: Vitest, React Testing Library.

### Estrutura de Diretórios
O projeto segue uma arquitetura modular baseada em "features", separando responsabilidades por domínio de negócio.

```
nossocrm/
├── app/                  # Rotas da aplicação (Next.js App Router)
│   ├── (protected)/      # Rotas protegidas (Dashboard, Pipeline, etc.)
│   ├── api/              # Endpoints da API (IA, Webhooks, etc.)
│   ├── auth/             # Rotas de Callback de Autenticação
│   ├── install/          # Wizard de Instalação e Configuração
│   └── login/            # Página de Login
├── components/           # Componentes reutilizáveis (UI Kit)
├── context/              # Contextos globais e Facades de Estado
├── docs/                 # Documentação técnica adicional
├── features/             # Módulos de negócio (Lógica, Componentes, Hooks)
│   ├── activities/       # Gestão de Tarefas e Agendamentos
│   ├── ai-hub/           # Central de IA e Configurações de Modelos
│   ├── boards/           # Gestão de Pipelines e Quadros Kanban
│   ├── contacts/         # Gestão de Clientes e Empresas
│   ├── dashboard/        # Visão Geral e Métricas
│   ├── deals/            # Oportunidades de Venda
│   ├── inbox/            # Central de Notificações e Briefings
│   ├── reports/          # Relatórios e Análises
│   └── settings/         # Configurações do Sistema e Organização
├── lib/                  # Bibliotecas utilitárias e Clientes (Supabase, Query)
└── public/               # Ativos estáticos
```

## 3. Módulos e Funcionalidades

### 3.1. Dashboard
- **Visão Geral**: Cards com métricas principais (Leads, Conversão, Receita).
- **Gráficos**: Visualização de desempenho de vendas.

### 3.2. Pipeline (Boards & Deals)
- **Kanban Interativo**: Interface drag-and-drop para mover oportunidades entre estágios.
- **Gestão de Deals**: Criação, edição e acompanhamento de oportunidades com valor, probabilidade e responsável.
- **Múltiplos Pipelines**: Suporte a diferentes processos de venda no mesmo sistema.

### 3.3. Contatos (Contacts)
- **CRM de Clientes**: Cadastro completo de pessoas e empresas.
- **Segmentação**: Categorização por tags, status e origem.
- **Histórico**: Registro unificado de interações vinculadas ao contato.

### 3.4. Atividades (Activities)
- **Gestão de Tarefas**: Criação de to-do lists vinculadas a deals ou contatos.
- **Agendamento**: Calendário de reuniões e follow-ups.

### 3.5. Inbox Inteligente
- **Briefing Diário**: Resumo gerado por IA das prioridades do dia.
- **Scripts de Venda**: Sugestões de abordagem baseadas no contexto do deal.

### 3.6. Inteligência Artificial (AI Hub)
- **Chat Assistente**: Interface de chat para interagir com os dados do CRM (RAG - Retrieval Augmented Generation).
- **Automação**: Geração de e-mails, resumos de reuniões e análise de deals.
- **Configuração Multi-Modelo**: Suporte para alternar entre Gemini, GPT-4 e Claude.

### 3.7. Configurações (Settings)
- **Gestão de Equipe**: Convite de usuários e definição de papéis (Admin/Vendedor).
- **Personalização**: Configuração de campos personalizados e etapas do funil.
- **Integrações**: Configuração de chaves de API e Webhooks.

## 4. Segurança e Dados

### Autenticação
Utiliza `@supabase/ssr` para gerenciamento seguro de sessões. O acesso é restrito via `middleware` que verifica a sessão ativa e redireciona usuários não autenticados para o login.

### Controle de Acesso (RLS)
Todas as tabelas do banco de dados possuem políticas de Row Level Security (RLS) ativas, garantindo que usuários acessem apenas dados pertencentes à sua organização (Tenant Isolation).

### Proteção de Rotas
- `/app/(protected)/*`: Exige autenticação.
- `/admin/*`: Exige permissões de administrador.
- `/api/*`: Protegido via validação de sessão ou tokens de API.

## 5. Integrações

### Webhooks
Sistema de webhooks para eventos de entrada (Inbound) e saída (Outbound), permitindo integração com ferramentas como n8n, Make e Zapier.

### API Pública
Endpoints documentados para manipulação programática de contatos e deals por sistemas externos.

## 6. Procedimentos de Instalação e Deploy

O projeto conta com um "Wizard de Instalação" (`/install`) que automatiza:
1.  Verificação de variáveis de ambiente.
2.  Aplicação de migrações no banco de dados.
3.  Criação da conta de administrador inicial.
4.  Configuração da organização padrão.

O deploy é otimizado para a plataforma Vercel, com configurações pré-definidas no `vercel.json` (implícito) e scripts de build no `package.json`.

---
*Documento gerado automaticamente por Antigravity (Google Deepmind) em 31/12/2025.*
