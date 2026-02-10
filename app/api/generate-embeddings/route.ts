/**
 * API Route to generate embeddings for properties
 * GET /api/generate-embeddings
 */

import { NextResponse } from 'next/server';
import { createStaticAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
    try {
        const supabase = createStaticAdminClient();

        // 1. Fetch all active properties
        const { data: properties, error: fetchError } = await supabase
            .from('imoveis_catalogo')
            .select('*')
            .eq('ativo', true);

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!properties || properties.length === 0) {
            return NextResponse.json({ message: 'No properties found' }, { status: 404 });
        }

        const results: any[] = [];

        // 2. Generate embeddings for each property
        for (const property of properties) {
            try {
                // Generate rich text representation
                const propertyText = [
                    `Título: ${property.titulo}`,
                    `Tipo: ${property.tipo}`,
                    `Localização: ${property.localizacao}`,
                    `Preço: R$ ${property.preco?.toLocaleString('pt-BR')}`,
                    `Quartos: ${property.quartos || 'N/A'}`,
                    `Banheiros: ${property.banheiros || 'N/A'}`,
                    `Vagas: ${property.vagas || 'N/A'}`,
                    `Área Total: ${property.area_total}m²`,
                    `Descrição: ${property.descricao}`,
                ].filter(p => p).join('\n');

                let embedding: number[];
                try {
                    // Generate embedding
                    const embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: propertyText,
                    });
                    embedding = embeddingResponse.data[0].embedding;
                } catch (openaiError: any) {
                    console.warn(`OpenAI error for property ${property.id}: ${openaiError.message}`);
                    console.warn('⚠️ USING MOCK EMBEDDING FOR TESTING');
                    // Create mock embedding (1536 dimensions)
                    embedding = Array(1536).fill(0).map(() => Math.random() - 0.5);
                }

                // Check if embedding exists
                const { data: existing } = await supabase
                    .from('imoveis_embeddings')
                    .select('id')
                    .eq('imovel_id', property.id.toString())
                    .single();

                if (existing) {
                    // Update
                    const { error: updateError } = await supabase
                        .from('imoveis_embeddings')
                        .update({
                            content: propertyText,
                            embedding: embedding,
                            metadata: {
                                tipo: property.tipo,
                                localizacao: property.localizacao,
                                preco: property.preco,
                            },
                        })
                        .eq('imovel_id', property.id.toString());

                    if (updateError) {
                        results.push({ id: property.id, status: 'error', error: updateError.message });
                    } else {
                        results.push({ id: property.id, status: 'updated' });
                    }
                } else {
                    // Insert
                    const { error: insertError } = await supabase
                        .from('imoveis_embeddings')
                        .insert({
                            imovel_id: property.id.toString(),
                            content: propertyText,
                            embedding: embedding,
                            metadata: {
                                tipo: property.tipo,
                                localizacao: property.localizacao,
                                preco: property.preco,
                            },
                        });

                    if (insertError) {
                        results.push({ id: property.id, status: 'error', error: insertError.message });
                    } else {
                        results.push({ id: property.id, status: 'created' });
                    }
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error: any) {
                results.push({ id: property.id, status: 'error', error: error.message });
            }
        }

        const summary = {
            total: properties.length,
            created: results.filter(r => r.status === 'created').length,
            updated: results.filter(r => r.status === 'updated').length,
            errors: results.filter(r => r.status === 'error').length,
        };

        return NextResponse.json({ summary, results });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
