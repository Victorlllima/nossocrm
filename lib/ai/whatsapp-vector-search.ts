/**
 * Vector Search for Properties
 * Uses Supabase pgvector for semantic search
 * Migrated from N8n: Supabase Vector Store node
 */

import { createStaticAdminClient } from '@/lib/supabase/server';

/**
 * Generates embedding for a text query using OpenAI
 * 
 * @param text - Query text
 * @returns Embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const OpenAI = (await import('openai')).default;
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;

    } catch (error) {
        console.error('Error generating embedding:', error);
        return [];
    }
}

/**
 * Searches properties using vector similarity
 * 
 * @param query - Search query text
 * @param limit - Maximum number of results
 * @returns Array of matching properties
 */
export async function vectorSearchProperties(query: string, limit: number = 5): Promise<any[]> {
    try {
        const supabase = createStaticAdminClient();

        // Generate embedding for query
        const embedding = await generateEmbedding(query);

        if (embedding.length === 0) {
            return [];
        }

        // Search using pgvector similarity
        const { data, error } = await supabase.rpc('match_imoveis', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: limit,
        });

        if (error) {
            console.error('Vector search error:', error);
            return [];
        }

        return data || [];

    } catch (error) {
        console.error('Error in vector search:', error);
        return [];
    }
}

/**
 * Hybrid search: combines vector search with text search
 * Falls back to text search if vector search fails
 * 
 * @param query - Search query
 * @param limit - Maximum results
 * @returns Array of properties
 */
export async function hybridSearchProperties(query: string, limit: number = 5): Promise<any[]> {
    // Try vector search first
    const vectorResults = await vectorSearchProperties(query, limit);

    if (vectorResults.length > 0) {
        return vectorResults;
    }

    // Fallback to text search
    const supabase = createStaticAdminClient();
    const { data, error } = await supabase
        .from('imoveis_catalogo')
        .select('*')
        .or(`titulo.ilike.%${query}%,descricao.ilike.%${query}%,localizacao.ilike.%${query}%`)
        .limit(limit);

    if (error || !data) {
        return [];
    }

    return data;
}
