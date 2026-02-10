# 🚀 Migration Log: N8n → Vercel AI SDK

**Project**: NossoCRM - WhatsApp AI Agent  
**Start Date**: 2026-02-10  
**Branch**: `feature/migrate-to-vercel-ai-sdk`  
**Status**: 🔄 IN PROGRESS

---

## 📋 Migration Phases

### ✅ Phase 1: Preparation and Base Structure (COMPLETED)
- [x] Created branch `feature/migrate-to-vercel-ai-sdk`
- [x] Created `MIGRATION_LOG.md` documentation
- [x] Install dependencies (`ai`, `@ai-sdk/openai`, `zod`)
- [x] Create folder structure (`/lib/ai/`, `/app/api/whatsapp/`)
- [x] Add `OPENAI_API_KEY` to `.env.local`

### ✅ Phase 2: Webhook and Agent Core (COMPLETED)
- [x] Create API Route `/api/whatsapp/webhook` (receives Evolution API)
- [x] Implement Vercel AI SDK Agent (basic)
- [x] Migrate System Prompt from N8n
- [x] Implement Tool: `Consultar_Base_Imoveis`
- [x] Implement Tool: `acionar_humano`
- [x] Create context preparation module (`prepararContextoLead`)
- [x] Create memory management module (PostgreSQL)
- [x] **Fix all TypeScript lint errors** (Supabase client, AI SDK API)

### 🔄 Phase 3: Multimodal and Buffer (IN PROGRESS)
- [ ] Implement image processing (Vision API)
- [ ] Implement PDF processing
- [ ] Implement audio processing (Whisper)
- [ ] Implement message buffer (Redis or custom logic)

### ⏳ Phase 4: Multimodal and Buffer (PENDING)
- [ ] Implement image processing (Vision API)
- [ ] Implement PDF processing
- [ ] Implement audio processing (Whisper)
- [ ] Implement message buffer (Vercel KV or custom logic)

### ⏳ Phase 5: Formatting and Sending (PENDING)
- [ ] Implement JSON formatting (Structured Output)
- [ ] Implement message splitting (long messages)
- [ ] Implement delay between sends
- [ ] Full integration with Evolution API

---

## 🏗️ Architecture Overview

### Current (N8n)
```
Evolution API (WhatsApp)
    ↓ Webhook
N8n Workflow
    ├── Redis (Buffer + Block)
    ├── LangChain Agent
    │   ├── System Prompt (800+ lines)
    │   ├── PostgreSQL Memory (dialogos)
    │   ├── Tools (Consultar_Base_Imoveis, acionar_humano)
    │   └── Vector Store (Supabase Embeddings)
    ├── Multimodal Processing (Image/PDF/Audio)
    └── Message Formatting (JSON + Split)
    ↓
Evolution API (Send)
```

### Target (Vercel AI SDK)
```
Evolution API (WhatsApp)
    ↓ Webhook
Next.js API Route (/api/whatsapp/webhook)
    ├── Vercel KV (Buffer + Block)
    ├── Vercel AI SDK Agent
    │   ├── System Prompt (migrated)
    │   ├── Supabase Memory (dialogos - manual queries)
    │   ├── Tools (TypeScript functions)
    │   └── Vector Store (Supabase Embeddings)
    ├── Multimodal Processing (libs: tesseract.js, pdf-parse, whisper)
    └── Structured Output (native)
    ↓
Evolution API (Send)
```

---

## 📦 Dependencies to Install

```bash
npm install ai @ai-sdk/openai zod
npm install --save-dev @types/node
```

**Optional (for multimodal):**
```bash
npm install pdf-parse tesseract.js openai
```

---

## 🔑 Environment Variables

**Added to `.env.local`:**
```env
# OpenAI (migrated from N8n)
OPENAI_API_KEY=sk-...

# Vercel KV (optional - for message buffer)
# KV_URL=...
# KV_REST_API_URL=...
# KV_REST_API_TOKEN=...
```

---

## 📝 Key Files Created/Modified

### Created:
- `MIGRATION_LOG.md` - This file
- `/lib/ai/agent.ts` - Main AI agent logic
- `/lib/ai/tools.ts` - Tool definitions
- `/lib/ai/memory.ts` - Memory management
- `/lib/ai/context.ts` - Context preparation
- `/app/api/whatsapp/webhook/route.ts` - Webhook handler

### Modified:
- `.env.local` - Added OpenAI key
- `package.json` - Added dependencies

---

## 🐛 Issues and Solutions

### Issue #1: Missing OPENAI_API_KEY
**Status**: ⏳ WAITING  
**Description**: OpenAI API key not found in `.env.local`  
**Solution**: User will provide the key from N8n credentials  
**Date**: 2026-02-10

---

## 📊 Progress Tracker

| Phase | Progress | ETA |
|-------|----------|-----|
| Phase 1 | 40% | 2026-02-10 |
| Phase 2 | 0% | 2026-02-11 |
| Phase 3 | 0% | 2026-02-12 |
| Phase 4 | 0% | 2026-02-13 |
| Phase 5 | 0% | 2026-02-14 |

---

## 🔄 Handoff Notes (for next LLM)

**Current State**: Branch created, documentation initialized, waiting for OpenAI API key.

**Next Steps**:
1. Add `OPENAI_API_KEY` to `.env.local`
2. Install dependencies: `npm install ai @ai-sdk/openai zod`
3. Create folder structure: `/lib/ai/` and `/app/api/whatsapp/`
4. Start Phase 2: Webhook implementation

**Important Context**:
- User wants **full migration** (not hybrid)
- **NO push/deploy** to production without approval
- All work stays in `feature/migrate-to-vercel-ai-sdk` branch
- System Prompt is in `public/temp/Agente_Max_Corretor (48).json` (line 9)
- Database schema: Supabase with tables `leads`, `dialogos`, `imoveis_catalogo`, `imoveis_embeddings`

---

**Last Updated**: 2026-02-10 15:14 (BRT)  
**Updated By**: Atlas (Google Antigravity)
