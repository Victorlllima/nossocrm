# ROADMAP — NossoCRM
> CRM inteligente Max Lima Edition | Método S.H.A.R.K.
> Atualizado: 2026-02-27

## Stack
- **Frontend:** Next.js 16 + React 19 + TypeScript + TailwindCSS
- **Backend:** Supabase (DB + Auth + Storage)
- **IA:** Claude API (RAG + assistente)
- **Deploy:** Vercel
- **RVM Project ID:** cadastrar no RVM

---

## Fase 1 — Fundação & Auth
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 1 | Setup projeto: ESLint, Prettier, estrutura de pastas | pending | 9 | Atlas |
| 2 | Configurar Supabase: auth multi-tenant, RLS policies | pending | 10 | Atlas |
| 3 | Schema DB: accounts, contacts, deals, activities, pipelines | pending | 10 | Shiva |
| 4 | Login/logout com Supabase Auth + proteção de rotas | pending | 9 | Atlas |
| 5 | Layout base: sidebar, header, sistema de navegação | pending | 8 | Atlas |

## Fase 2 — Pipeline & Kanban
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 6 | Kanban pipeline visual com drag-and-drop (dnd-kit) | pending | 10 | Atlas |
| 7 | CRUD de deals/oportunidades com estágios customizáveis | pending | 9 | Atlas |
| 8 | Filtros e busca no pipeline por valor, responsável, status | pending | 8 | Atlas |
| 9 | Histórico de movimentações por deal | pending | 7 | Ravena |

## Fase 3 — Gestão de Contatos
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 10 | CRUD de contatos (pessoas e empresas) | pending | 9 | Atlas |
| 11 | Timeline de atividades por contato (ligações, emails, reuniões) | pending | 9 | Atlas |
| 12 | Import de contatos via CSV | pending | 7 | Atlas |
| 13 | Tags e segmentação de contatos | pending | 7 | Atlas |

## Fase 4 — IA & Automação
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 14 | Assistente IA com RAG sobre histórico do cliente (Claude API) | pending | 9 | Shiva |
| 15 | Sugestão automática de próxima ação por deal | pending | 8 | Shiva |
| 16 | Resumo automático de conversas/atividades por IA | pending | 8 | Atlas |
| 17 | Automações de follow-up com triggers configuráveis | pending | 7 | Atlas |

## Fase 5 — Relatórios & Dashboard
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 18 | Dashboard executivo: deals por estágio, receita prevista, conversão | pending | 8 | Atlas |
| 19 | Relatórios de performance por vendedor | pending | 7 | Atlas |
| 20 | Exportação de relatórios em PDF/Excel | pending | 6 | Atlas |

## Fase 6 — Deploy & Produção
| # | Task | Status | Prioridade | Agente |
|---|------|--------|------------|--------|
| 21 | Deploy no Vercel com variáveis de ambiente | pending | 8 | Kerberos |
| 22 | Testes E2E dos fluxos principais (pipeline, contatos, IA) | pending | 8 | Kerberos |
| 23 | Registrar no RVM com heartbeat ativo | pending | 7 | Atlas |
