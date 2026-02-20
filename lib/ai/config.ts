/**
 * @fileoverview ConfiguraÃ§Ã£o de provedores de IA para o CRM.
 * 
 * Este mÃ³dulo abstrai a criaÃ§Ã£o de clientes de diferentes provedores de IA
 * (Google Gemini, OpenAI, Anthropic Claude), permitindo trocar entre eles
 * de forma transparente.
 * 
 * @module services/ai/config
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Provedores de IA suportados pelo sistema.
 * 
 * @typedef {'google' | 'openai' | 'anthropic'} AIProvider
 */
export type AIProvider = 'google' | 'openai' | 'anthropic';

/**
 * Cria e retorna uma instÃ¢ncia do modelo de IA configurada.
 * 
 * Suporta mÃºltiplos provedores com modelos padrÃ£o:
 * - Google: gemini-1.5-flash
 * - OpenAI: gpt-4o
 * - Anthropic: claude-3-5-sonnet-20240620
 * 
 * @param provider - Provedor de IA a ser utilizado.
 * @param apiKey - Chave de API do provedor.
 * @param modelId - ID do modelo especÃ­fico (opcional, usa padrÃ£o se nÃ£o informado).
 * @returns InstÃ¢ncia configurada do modelo de IA.
 * @throws Error se a API key nÃ£o for fornecida ou provedor nÃ£o for suportado.
 * 
 * @example
 * ```typescript
 * // Usando Google Gemini
 * const model = getModel('google', 'sua-api-key', 'gemini-1.5-pro');
 * 
 * // Usando OpenAI com modelo padrÃ£o
 * const model = getModel('openai', 'sua-api-key', '');
 * ```
 */
export const getModel = (provider: AIProvider, apiKey: string, modelId: string) => {
    if (!apiKey) {
        throw new Error('API Key is missing');
    }

    switch (provider) {
        case 'google':
            const google = createGoogleGenerativeAI({ apiKey });
            return google(modelId || 'gemini-1.5-flash') as any;

        case 'openai':
            const openai = createOpenAI({ apiKey });
            return openai(modelId || 'gpt-4o') as any;

        case 'anthropic':
            const anthropic = createAnthropic({ apiKey });
            return anthropic(modelId || 'claude-3-5-sonnet-20240620') as any;

        default:
            throw new Error(`Provider ${provider} not supported`);
    }
};
