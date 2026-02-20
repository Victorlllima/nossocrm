/**
 * @fileoverview MigraÃ§Ã£o de Dados do LocalStorage
 * 
 * Script de migraÃ§Ã£o one-time para atualizar estrutura de dados
 * legados armazenados em localStorage para o formato atual.
 * 
 * @module utils/migrateLocalStorage
 * 
 * MigraÃ§Ãµes realizadas:
 * - Converte Leads antigos para Contacts com stage LEAD
 * - Cria Board padrÃ£o se nÃ£o existir
 * 
 * @remarks
 * Este script Ã© executado automaticamente na inicializaÃ§Ã£o do app
 * e marca a migraÃ§Ã£o como concluÃ­da em localStorage para nÃ£o
 * executar novamente.
 */

import { Contact, ContactStage, Lead, Board, DEFAULT_BOARD_STAGES } from '@/types';

/** Chave no localStorage que marca migraÃ§Ã£o como concluÃ­da */
const MIGRATION_KEY = 'crm_migration_v1_completed';

/**
 * Executa migraÃ§Ã£o v1 de dados do localStorage
 * 
 * Converte estrutura de dados legada para o formato atual:
 * 1. Migra Leads para Contacts com stage=LEAD
 * 2. Garante existÃªncia do Board padrÃ£o de vendas
 * 
 * A migraÃ§Ã£o sÃ³ executa uma vez (idempotente).
 * 
 * @example
 * ```tsx
 * // No inÃ­cio do App
 * useEffect(() => {
 *   migrateLocalStorage();
 * }, []);
 * ```
 */
export const migrateLocalStorage = () => {
  try {
    const isMigrated = localStorage.getItem(MIGRATION_KEY);
    if (isMigrated) return;

    // 1. Migrar Leads para Contacts
    const storedLeads = localStorage.getItem('crm_leads');
    const storedContacts = localStorage.getItem('crm_contacts');

    const leads: Lead[] = storedLeads ? JSON.parse(storedLeads) : [];
    let contacts: Contact[] = storedContacts ? JSON.parse(storedContacts) : [];

    if (leads.length > 0) {
      const newContactsFromLeads: Contact[] = leads.map(lead => ({
        id: lead.id,
        companyId: crypto.randomUUID(), // Gera um ID temporÃ¡rio, idealmente buscaria empresa pelo nome
        name: lead.name,
        email: lead.email,
        phone: '',
        role: lead.role,
        source: lead.source,
        status: 'ACTIVE',
        stage: ContactStage.LEAD, // Define como LEAD no funil
        createdAt: lead.createdAt,
        notes: lead.notes,
        lastPurchaseDate: '',
        totalValue: 0
      }));

      // Adiciona aos contatos existentes
      contacts = [...contacts, ...newContactsFromLeads];

      // Salva contatos atualizados
      localStorage.setItem('crm_contacts', JSON.stringify(contacts));

      // Limpa leads antigos (opcional, pode manter por seguranÃ§a)
      // localStorage.removeItem('crm_leads'); 
    }

    // 2. Garantir Board PadrÃ£o
    const storedBoards = localStorage.getItem('crm_boards');
    if (!storedBoards) {
      const defaultBoard: Board = {
        id: 'default-sales',
        name: 'Pipeline de Vendas',
        description: 'Funil principal de oportunidades',
        linkedStage: ContactStage.PROSPECT,
        stages: DEFAULT_BOARD_STAGES,
        isDefault: true,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('crm_boards', JSON.stringify([defaultBoard]));
    }

    // Marca migraÃ§Ã£o como concluÃ­da
    localStorage.setItem(MIGRATION_KEY, 'true');

  } catch (error) {
    console.error('Erro na migraÃ§Ã£o v1:', error);
  }
};
