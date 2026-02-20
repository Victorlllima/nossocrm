/**
 * @fileoverview ServiÃ§o de registro de templates de jornadas do CRM.
 * 
 * Este serviÃ§o busca definiÃ§Ãµes de templates de boards e jornadas
 * de um repositÃ³rio externo no GitHub, permitindo templates prÃ©-configurados
 * para diferentes tipos de negÃ³cio.
 * 
 * @module services/registryService
 */

import { RegistryIndex, JourneyDefinition } from '@/types';

/**
 * URL base do repositÃ³rio de templates no GitHub.
 * @constant
 */
const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/thaleslaray/crm-templates/main';

/**
 * Busca o Ã­ndice de templates disponÃ­veis.
 * 
 * O Ã­ndice contÃ©m metadados sobre todos os templates de jornada
 * disponÃ­veis no repositÃ³rio, incluindo nome, descriÃ§Ã£o e caminho.
 * 
 * @returns Promise com o Ã­ndice de templates disponÃ­veis.
 * @throws Error se nÃ£o for possÃ­vel buscar o registro.
 * 
 * @example
 * ```typescript
 * const registry = await fetchRegistry();
 * console.log(registry.templates); // Lista de templates disponÃ­veis
 * ```
 */
export const fetchRegistry = async (): Promise<RegistryIndex> => {
    try {
        const response = await fetch(`${REGISTRY_BASE_URL}/registry.json`);
        if (!response.ok) throw new Error('Failed to fetch registry');
        return await response.json();
    } catch (error) {
        console.error('Error fetching registry:', error);
        throw error;
    }
};

/**
 * Busca a definiÃ§Ã£o de uma jornada especÃ­fica pelo caminho do template.
 * 
 * @param templatePath - Caminho relativo do template no repositÃ³rio.
 * @returns Promise com a definiÃ§Ã£o completa da jornada.
 * @throws Error se nÃ£o for possÃ­vel buscar o template.
 * 
 * @example
 * ```typescript
 * const journey = await fetchTemplateJourney('sales/b2b-saas');
 * console.log(journey.stages); // EstÃ¡gios da jornada
 * ```
 */
export const fetchTemplateJourney = async (templatePath: string): Promise<JourneyDefinition> => {
    try {
        const response = await fetch(`${REGISTRY_BASE_URL}/${templatePath}/journey.json`);
        if (!response.ok) throw new Error('Failed to fetch template journey');
        return await response.json();
    } catch (error) {
        console.error('Error fetching template journey:', error);
        throw error;
    }
};
