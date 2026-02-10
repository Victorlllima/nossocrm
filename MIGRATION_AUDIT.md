# 🔍 AUDITORIA COMPLETA: N8n vs Vercel AI SDK

**Data:** 2026-02-10  
**Objetivo:** Garantir 100% de precisão na migração do agente WhatsApp

---

## 📊 ANÁLISE DO WORKFLOW N8n

### **Tool: Consultar_Base_Imoveis**

**Configuração N8n:**
```json
{
  "mode": "retrieve-as-tool",
  "toolDescription": "Busca informações detalhadas sobre imóveis (características, preço, localização, comodidades)",
  "tableName": "imoveis_embeddings",
  "topK": 12,
  "queryName": "match_imoveis"
}
```

**Método:** Vector Store Supabase (pgvector)  
**Tabela:** `imoveis_embeddings`  
**Função SQL:** `match_imoveis`  
**Top K:** 12 resultados

---

## 🗄️ ESTRUTURA REAL DAS TABELAS

### **Tabela: `imoveis_embeddings`** (35 rows)
```sql
CREATE TABLE imoveis_embeddings (
  id BIGINT PRIMARY KEY,
  imovel_id TEXT NOT NULL,           -- FK para imoveis_catalogo.id
  content TEXT NOT NULL,             -- Texto usado para gerar embedding
  embedding VECTOR(1536) NOT NULL,   -- OpenAI embedding
  metadata JSONB,                    -- Metadados adicionais
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### **Tabela: `imoveis_catalogo`** (12 rows)
```sql
CREATE TABLE imoveis_catalogo (
  id INTEGER PRIMARY KEY,
  corretor_id VARCHAR NOT NULL,
  corretor_nome VARCHAR,
  link VARCHAR UNIQUE NOT NULL,
  tipo VARCHAR,                      -- apartamento, casa, terreno, chacara
  localizacao VARCHAR,               -- ⚠️ NÃO É "bairro", é "localizacao"
  imovel_id VARCHAR,
  preco NUMERIC,
  descricao TEXT,
  detalhes TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT now(),
  atualizado_em TIMESTAMP DEFAULT now(),
  quartos INTEGER,
  banheiros INTEGER,
  vagas INTEGER,
  area_total NUMERIC,                -- ⚠️ É "area_total", não "metragem"
  area_util NUMERIC,
  condominio NUMERIC,
  iptu NUMERIC,
  endereco TEXT,
  titulo TEXT,
  google_maps VARCHAR,
  palavras_chave TEXT,
  suites INTEGER,
  andar VARCHAR,
  aceita_financiamento BOOLEAN DEFAULT false,
  aceita_permuta BOOLEAN DEFAULT false,
  permuta_detalhes TEXT,
  aceita_fgts BOOLEAN DEFAULT false,
  nome_empreendimento VARCHAR,
  posicao_solar VARCHAR,
  area_construida NUMERIC,
  eh_condominio BOOLEAN,
  documentacao VARCHAR,
  embedding VECTOR(1536)             -- ⚠️ Duplicado (também em imoveis_embeddings)
);
```

---

## ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

### **1. COLUNA `finalidade` NÃO EXISTE**
❌ **Erro na função `match_imoveis`:**
```sql
-- LINHA 39 da migration SQL
imoveis_catalogo.finalidade,  -- ❌ ESTA COLUNA NÃO EXISTE!
```

**Impacto:** A função SQL vai FALHAR ao executar.

**Solução:** Remover a coluna `finalidade` da função ou adicionar lógica para inferir (venda/aluguel) do `link` ou `descricao`.

---

### **2. COLUNA `bairro` NÃO EXISTE**
❌ **Erro na função `match_imoveis`:**
```sql
-- LINHA 34 da migration SQL
imoveis_catalogo.bairro,  -- ❌ ESTA COLUNA NÃO EXISTE!
```

**Realidade:** A coluna é `localizacao`, não `bairro`.

**Impacto:** A função SQL vai FALHAR ao executar.

**Solução:** Substituir `bairro` por `localizacao`.

---

### **3. COLUNA `metragem` NÃO EXISTE**
❌ **Erro na função `match_imoveis`:**
```sql
-- LINHA 36 da migration SQL
imoveis_catalogo.metragem,  -- ❌ ESTA COLUNA NÃO EXISTE!
```

**Realidade:** A coluna é `area_total`, não `metragem`.

**Impacto:** A função SQL vai FALHAR ao executar.

**Solução:** Substituir `metragem` por `area_total`.

---

### **4. JOIN INCORRETO**
⚠️ **Problema no JOIN:**
```sql
-- LINHA 43 da migration SQL
JOIN imoveis_catalogo ON imoveis_embeddings.imovel_id = imoveis_catalogo.id
```

**Problema:** `imoveis_embeddings.imovel_id` é TEXT, mas `imoveis_catalogo.id` é INTEGER.

**Solução:** Cast explícito:
```sql
JOIN imoveis_catalogo ON imoveis_embeddings.imovel_id::INTEGER = imoveis_catalogo.id
```

---

### **5. DADOS REAIS**
**Exemplo de imóvel real:**
```json
{
  "id": 20,
  "titulo": "Condo/Apartment - For Sale - Águas Claras",
  "tipo": "apartamento",
  "localizacao": "aguas claras",  // ⚠️ NÃO é "bairro"
  "preco": 605000.00,
  "quartos": 2,
  "area_total": 69,               // ⚠️ NÃO é "metragem"
  "link": "https://www.remax.com.br/pt-br/imoveis/apartamento/venda/aguas-claras/880161048-42",
  "embedding_imovel_id": null     // ⚠️ SEM EMBEDDING!
}
```

**⚠️ CRÍTICO:** Dos 12 imóveis em `imoveis_catalogo`, **NENHUM** tem embedding em `imoveis_embeddings`!

---

## 🔧 CORREÇÕES NECESSÁRIAS

### **1. Corrigir função `match_imoveis`**
```sql
CREATE OR REPLACE FUNCTION match_imoveis(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  titulo text,
  descricao text,
  localizacao text,        -- ✅ CORRIGIDO: era "bairro"
  preco numeric,
  quartos int,
  area_total numeric,      -- ✅ CORRIGIDO: era "metragem"
  tipo text,
  link text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    imoveis_embeddings.imovel_id::BIGINT,  -- ✅ CORRIGIDO: cast explícito
    imoveis_catalogo.titulo,
    imoveis_catalogo.descricao,
    imoveis_catalogo.localizacao,          -- ✅ CORRIGIDO: era "bairro"
    imoveis_catalogo.preco,
    imoveis_catalogo.quartos,
    imoveis_catalogo.area_total,           -- ✅ CORRIGIDO: era "metragem"
    imoveis_catalogo.tipo,
    imoveis_catalogo.link,
    1 - (imoveis_embeddings.embedding <=> query_embedding) AS similarity
  FROM imoveis_embeddings
  JOIN imoveis_catalogo ON imoveis_embeddings.imovel_id::INTEGER = imoveis_catalogo.id  -- ✅ CORRIGIDO: cast
  WHERE 1 - (imoveis_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY imoveis_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### **2. Atualizar `whatsapp-tools.ts`**
```typescript
// LINHA 48-70 em whatsapp-tools.ts
interface PropertyResult {
  id: number;
  titulo: string;
  descricao: string;
  localizacao: string;    // ✅ CORRIGIDO: era "bairro"
  preco: number;
  quartos: number;
  area_total: number;     // ✅ CORRIGIDO: era "metragem"
  tipo: string;
  link: string;
  similarity: number;
}
```

### **3. Atualizar `whatsapp-vector-search.ts`**
```typescript
// LINHA 54-68 em whatsapp-vector-search.ts
interface PropertyMatch {
  id: number;
  titulo: string;
  descricao: string;
  localizacao: string;    // ✅ CORRIGIDO: era "bairro"
  preco: number;
  quartos: number;
  area_total: number;     // ✅ CORRIGIDO: era "metragem"
  tipo: string;
  link: string;
  similarity: number;
}
```

---

## 🚨 BLOQUEADOR CRÍTICO

**⚠️ NENHUM IMÓVEL TEM EMBEDDING!**

Dos 12 imóveis em `imoveis_catalogo`, **ZERO** têm embeddings em `imoveis_embeddings`.

**Impacto:** Vector search vai retornar **VAZIO** sempre.

**Solução:** Criar script para gerar embeddings dos imóveis existentes.

---

## ✅ PRÓXIMOS PASSOS

1. ✅ **Corrigir migration SQL** (remover `finalidade`, `bairro`, `metragem`)
2. ✅ **Atualizar interfaces TypeScript** (localizacao, area_total)
3. ⚠️ **Gerar embeddings** para os 12 imóveis existentes
4. ✅ **Testar função `match_imoveis`** com dados reais
5. ✅ **Validar respostas do agente** com imóveis reais

---

**Status:** 🔴 **BLOQUEADO** - Migration SQL precisa ser corrigida ANTES de testes.
