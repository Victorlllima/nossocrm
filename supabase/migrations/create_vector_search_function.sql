-- Vector Search Function for Properties
-- This function should be created in Supabase SQL Editor

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function to match properties by embedding similarity
CREATE OR REPLACE FUNCTION match_imoveis(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  titulo text,
  descricao text,
  localizacao text,
  preco numeric,
  quartos int,
  area_total numeric,
  tipo text,
  link text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    imoveis_embeddings.imovel_id::BIGINT,
    imoveis_catalogo.titulo,
    imoveis_catalogo.descricao,
    imoveis_catalogo.localizacao,
    imoveis_catalogo.preco,
    imoveis_catalogo.quartos,
    imoveis_catalogo.area_total,
    imoveis_catalogo.tipo,
    imoveis_catalogo.link,
    1 - (imoveis_embeddings.embedding <=> query_embedding) AS similarity
  FROM imoveis_embeddings
  JOIN imoveis_catalogo ON imoveis_embeddings.imovel_id::INTEGER = imoveis_catalogo.id
  WHERE 1 - (imoveis_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY imoveis_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_imoveis TO authenticated;
GRANT EXECUTE ON FUNCTION match_imoveis TO anon;
