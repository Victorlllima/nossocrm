/**
 * @fileoverview ServiÃ§o Supabase para gerenciamento de contatos e empresas CRM.
 * 
 * Este mÃ³dulo fornece operaÃ§Ãµes CRUD para contatos e empresas (crm_companies),
 * com transformaÃ§Ã£o automÃ¡tica entre o formato do banco e o formato da aplicaÃ§Ã£o.
 * 
 * ## Conceitos Multi-Tenant
 * 
 * - Contatos sÃ£o isolados por `organization_id` (tenant)
 * - `client_company_id` vincula o contato a uma empresa cadastrada no CRM
 * 
 * @module lib/supabase/contacts
 */

import { supabase } from './client';
import { Contact, CRMCompany, OrganizationId, PaginationState, PaginatedResponse, ContactsServerFilters } from '@/types';
import { sanitizeUUID, sanitizeText, sanitizeNumber } from './utils';
import { normalizePhoneE164 } from '@/lib/phone';

// ============================================
// CONTACTS SERVICE
// ============================================

/**
 * RepresentaÃ§Ã£o de contato no banco de dados.
 * 
 * @interface DbContact
 */
export interface DbContact {
  /** ID Ãºnico do contato (UUID). */
  id: string;
  /** ID da organizaÃ§Ã£o/tenant (para RLS). */
  organization_id: string;
  /** Nome completo do contato. */
  name: string;
  /** Email do contato. */
  email: string | null;
  /** Telefone do contato. */
  phone: string | null;
  /** Cargo/funÃ§Ã£o do contato. */
  role: string | null;
  /** Nome da empresa (texto livre, deprecado). */
  company_name: string | null;
  /** ID da empresa CRM vinculada. */
  client_company_id: string | null;
  /** URL do avatar. */
  avatar: string | null;
  /** ObservaÃ§Ãµes sobre o contato. */
  notes: string | null;
  /** Status do contato (ACTIVE, INACTIVE). */
  status: string;
  /** EstÃ¡gio no funil (LEAD, MQL, etc). */
  stage: string;
  /** Fonte de origem do contato. */
  source: string | null;
  /** Data de aniversÃ¡rio. */
  birth_date: string | null;
  /** Data da Ãºltima interaÃ§Ã£o. */
  last_interaction: string | null;
  /** Data da Ãºltima compra. */
  last_purchase_date: string | null;
  /** Valor total de compras. */
  total_value: number;
  /** Data de criaÃ§Ã£o. */
  created_at: string;
  /** Data de atualizaÃ§Ã£o. */
  updated_at: string;
  /** ID do dono/responsÃ¡vel. */
  owner_id: string | null;
}

/**
 * RepresentaÃ§Ã£o de empresa CRM no banco de dados.
 * 
 * @interface DbCRMCompany
 */
export interface DbCRMCompany {
  /** ID Ãºnico da empresa (UUID). */
  id: string;
  /** ID da organizaÃ§Ã£o/tenant. */
  organization_id: string;
  /** Nome da empresa. */
  name: string;
  /** Setor/indÃºstria. */
  industry: string | null;
  /** Website da empresa. */
  website: string | null;
  /** Data de criaÃ§Ã£o. */
  created_at: string;
  /** Data de atualizaÃ§Ã£o. */
  updated_at: string;
  /** ID do dono/responsÃ¡vel. */
  owner_id: string | null;
}

/**
 * Transforma contato do formato DB para o formato da aplicaÃ§Ã£o.
 * 
 * @param db - Contato no formato do banco.
 * @returns Contato no formato da aplicaÃ§Ã£o.
 */
const transformContact = (db: DbContact): Contact => ({
  id: db.id,
  organizationId: db.organization_id,
  name: db.name,
  email: db.email || '',
  phone: normalizePhoneE164(db.phone),
  role: db.role || '',
  clientCompanyId: db.client_company_id || undefined,
  companyId: db.client_company_id || '', // @deprecated - backwards compatibility
  avatar: db.avatar || '',
  notes: db.notes || '',
  status: db.status as Contact['status'],
  stage: db.stage,
  source: db.source as Contact['source'] || undefined,
  birthDate: db.birth_date || undefined,
  lastInteraction: db.last_interaction || undefined,
  lastPurchaseDate: db.last_purchase_date || undefined,
  totalValue: db.total_value || 0,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/**
 * Transforma empresa CRM do formato DB para o formato da aplicaÃ§Ã£o.
 * 
 * @param db - Empresa no formato do banco.
 * @returns Empresa no formato da aplicaÃ§Ã£o.
 */
const transformCRMCompany = (db: DbCRMCompany): CRMCompany => ({
  id: db.id,
  organizationId: db.organization_id,
  name: db.name,
  industry: db.industry || undefined,
  website: db.website || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/**
 * Transforma contato do formato da aplicaÃ§Ã£o para o formato DB.
 * 
 * @param contact - Contato parcial no formato da aplicaÃ§Ã£o.
 * @returns Contato parcial no formato do banco.
 */
const transformContactToDb = (contact: Partial<Contact>): Partial<DbContact> => {
  const db: Partial<DbContact> = {};

  if (contact.name !== undefined) db.name = contact.name;
  if (contact.email !== undefined) db.email = contact.email || null;
  if (contact.phone !== undefined) {
    const e164 = normalizePhoneE164(contact.phone);
    db.phone = e164 ? e164 : null;
  }
  if (contact.role !== undefined) db.role = contact.role || null;
  // Support both new clientCompanyId and deprecated companyId
  if (contact.clientCompanyId !== undefined) db.client_company_id = contact.clientCompanyId || null;
  else if (contact.companyId !== undefined) db.client_company_id = contact.companyId || null;
  if (contact.avatar !== undefined) db.avatar = contact.avatar || null;
  if (contact.notes !== undefined) db.notes = contact.notes || null;
  if (contact.status !== undefined) db.status = contact.status;
  if (contact.stage !== undefined) db.stage = contact.stage;
  if (contact.source !== undefined) db.source = contact.source || null;
  if (contact.birthDate !== undefined) db.birth_date = contact.birthDate || null;
  if (contact.lastInteraction !== undefined) db.last_interaction = contact.lastInteraction || null;
  if (contact.lastPurchaseDate !== undefined) db.last_purchase_date = contact.lastPurchaseDate || null;
  if (contact.totalValue !== undefined) db.total_value = contact.totalValue;

  return db;
};

/**
 * ServiÃ§o de contatos do Supabase.
 * 
 * Fornece operaÃ§Ãµes CRUD para a tabela `contacts`.
 * Todos os dados sÃ£o filtrados por RLS baseado no `organization_id`.
 * 
 * @example
 * ```typescript
 * // Buscar todos os contatos
 * const { data, error } = await contactsService.getAll();
 * 
 * // Criar um novo contato
 * const { data, error } = await contactsService.create(
 *   { name: 'JoÃ£o', email: 'joao@email.com', status: 'ACTIVE', stage: 'LEAD' },
 *   organizationId
 * );
 * ```
 */
export const contactsService = {
  /**
   * Busca contagens de contatos por estÃ¡gio do funil.
   * Usa RPC para query eficiente no servidor.
   * 
   * @returns Promise com objeto de contagens por estÃ¡gio.
   * 
   * @example
   * ```typescript
   * const { data } = await contactsService.getStageCounts();
   * // data = { LEAD: 1500, MQL: 2041, PROSPECT: 800, ... }
   * ```
   */
  async getStageCounts(): Promise<{ data: Record<string, number> | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nÃ£o configurado') };
      }
      const { data, error } = await supabase.rpc('get_contact_stage_counts');

      if (error) return { data: null, error };

      // Transform array to object
      const counts: Record<string, number> = {};
      if (data) {
        for (const row of data as Array<{ stage: string; count: number }>) {
          counts[row.stage] = row.count;
        }
      }

      return { data: counts, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca todos os contatos da organizaÃ§Ã£o.
   * 
   * @returns Promise com array de contatos ou erro.
   */
  async getAll(): Promise<{ data: Contact[] | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nÃ£o configurado') };
      }
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };
      return { data: (data || []).map(c => transformContact(c as DbContact)), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca contatos com paginaÃ§Ã£o e filtros server-side.
   * 
   * @param pagination - Estado de paginaÃ§Ã£o { pageIndex, pageSize }.
   * @param filters - Filtros opcionais (search, stage, status, dateRange).
   * @returns Promise com resposta paginada ou erro.
   * 
   * @example
   * ```typescript
   * const { data, error } = await contactsService.getAllPaginated(
   *   { pageIndex: 0, pageSize: 50 },
   *   { search: 'JoÃ£o', stage: 'LEAD' }
   * );
   * // data.data = Contact[]
   * // data.totalCount = 10000
   * // data.hasMore = true
   * ```
   */
  async getAllPaginated(
    pagination: PaginationState,
    filters?: ContactsServerFilters
  ): Promise<{ data: PaginatedResponse<Contact> | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nÃ£o configurado') };
      }
      const { pageIndex, pageSize } = pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      // Build query with count
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters) {
        // T007: Search filter (name OR email)
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        // T008: Stage filter
        if (filters.stage && filters.stage !== 'ALL') {
          query = query.eq('stage', filters.stage);
        }

        // T009 & T010: Status filter (including RISK logic)
        if (filters.status && filters.status !== 'ALL') {
          if (filters.status === 'RISK') {
            // T010: RISK = ACTIVE + lastPurchaseDate > 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query
              .eq('status', 'ACTIVE')
              .lt('last_purchase_date', thirtyDaysAgo.toISOString());
          } else {
            query = query.eq('status', filters.status);
          }
        }

        // T011: Date range filters
        if (filters.dateStart) {
          query = query.gte('created_at', filters.dateStart);
        }
        if (filters.dateEnd) {
          query = query.lte('created_at', filters.dateEnd);
        }

        // Client company filter
        if (filters.clientCompanyId) {
          query = query.eq('client_company_id', filters.clientCompanyId);
        }
      }

      // Apply pagination and ordering
      const sortColumn = filters?.sortBy || 'created_at';
      const sortAscending = filters?.sortOrder === 'asc';

      const { data, count, error } = await query
        .order(sortColumn, { ascending: sortAscending })
        .range(from, to);

      if (error) return { data: null, error };

      const totalCount = count ?? 0;
      const contacts = (data || []).map(c => transformContact(c as DbContact));
      const hasMore = (pageIndex + 1) * pageSize < totalCount;

      return {
        data: {
          data: contacts,
          totalCount,
          pageIndex,
          pageSize,
          hasMore,
        },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Cria um novo contato.
   * 
   * @param contact - Dados do contato (sem id e createdAt).
   * @returns Promise com contato criado ou erro.
   */
  async create(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<{ data: Contact | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nÃ£o configurado') };
      }
      const phoneE164 = normalizePhoneE164(contact.phone);
      const insertData = {
        name: contact.name,
        email: sanitizeText(contact.email),
        phone: sanitizeText(phoneE164),
        role: sanitizeText(contact.role),
        client_company_id: sanitizeUUID(contact.clientCompanyId || contact.companyId),
        avatar: sanitizeText(contact.avatar),
        notes: sanitizeText(contact.notes),
        status: contact.status || 'ACTIVE',
        stage: contact.stage || 'LEAD',
        source: sanitizeText(contact.source),
        birth_date: sanitizeText(contact.birthDate),
        last_interaction: sanitizeText(contact.lastInteraction),
        last_purchase_date: sanitizeText(contact.lastPurchaseDate),
        total_value: sanitizeNumber(contact.totalValue, 0),
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();

      if (error) return { data: null, error };

      return { data: transformContact(data as DbContact), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Atualiza um contato existente.
   * 
   * @param id - ID do contato a ser atualizado.
   * @param updates - Campos a serem atualizados.
   * @returns Promise com erro, se houver.
   */
  async update(id: string, updates: Partial<Contact>): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase nÃ£o configurado') };
      }
      const dbUpdates = transformContactToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('contacts')
        .update(dbUpdates)
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Exclui um contato.
   * 
   * @param id - ID do contato a ser excluÃ­do.
   * @returns Promise com erro, se houver.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase nÃ£o configurado') };
      }
      // UX: ao excluir contato, tambÃ©m removemos atividades "contact-only"
      // (FK em activities.contact_id Ã© SET NULL, entÃ£o deletamos explicitamente
      // para evitar tarefas Ã³rfÃ£s aparecerem no Inbox/Focus.)
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('contact_id', id);
      if (activitiesError) return { error: activitiesError };

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Verifica se o contato tem deals associados.
   * 
   * @param contactId - ID do contato.
   * @returns Promise com informaÃ§Ãµes sobre os deals associados.
   */
  async hasDeals(contactId: string): Promise<{ hasDeals: boolean; dealCount: number; deals: Array<{ id: string; title: string }>; error: Error | null }> {
    try {
      if (!supabase) {
        return {
          hasDeals: false,
          dealCount: 0,
          deals: [],
          error: new Error('Supabase nÃ£o configurado'),
        };
      }
      const { data, count, error } = await supabase
        .from('deals')
        .select('id, title', { count: 'exact' })
        .eq('contact_id', contactId);

      if (error) return { hasDeals: false, dealCount: 0, deals: [], error };
      const deals = (data || []).map(d => ({ id: d.id, title: d.title }));
      return { hasDeals: (count || 0) > 0, dealCount: count || 0, deals, error: null };
    } catch (e) {
      return { hasDeals: false, dealCount: 0, deals: [], error: e as Error };
    }
  },

  /**
   * Exclui contato e todos os deals associados (cascade).
   * 
   * @param contactId - ID do contato.
   * @returns Promise com erro, se houver.
   */
  async deleteWithDeals(contactId: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase nÃ£o configurado') };
      }
      // First delete all deals for this contact
      const { error: dealsError } = await supabase
        .from('deals')
        .delete()
        .eq('contact_id', contactId);

      if (dealsError) return { error: dealsError };

      // Then delete the contact
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      return { error: contactError };
    } catch (e) {
      return { error: e as Error };
    }
  },
};

/**
 * ServiÃ§o de empresas CRM do Supabase.
 * 
 * Fornece operaÃ§Ãµes CRUD para a tabela `crm_companies`.
 * Empresas CRM sÃ£o as empresas dos clientes, nÃ£o o tenant.
 * 
 * @example
 * ```typescript
 * const { data, error } = await companiesService.getAll();
 * ```
 */
export const companiesService = {
  /**
   * Busca todas as empresas CRM da organizaÃ§Ã£o.
   * 
   * @returns Promise com array de empresas ou erro.
   */
  async getAll(): Promise<{ data: CRMCompany[] | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nÃ£o configurado') };
      }
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };
      return { data: (data || []).map(c => transformCRMCompany(c as DbCRMCompany)), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Cria uma nova empresa CRM.
   * 
   * @param company - Dados da empresa.
   * @returns Promise com empresa criada ou erro.
   */
  async create(company: Omit<CRMCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: CRMCompany | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nÃ£o configurado') };
      }
      const insertData = {
        name: company.name,
        industry: sanitizeText(company.industry),
        website: sanitizeText(company.website),
      };

      const { data, error } = await supabase
        .from('crm_companies')
        .insert(insertData)
        .select()
        .single();

      if (error) return { data: null, error };
      return { data: transformCRMCompany(data as DbCRMCompany), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Atualiza uma empresa CRM existente.
   * 
   * @param id - ID da empresa.
   * @param updates - Campos a serem atualizados.
   * @returns Promise com erro, se houver.
   */
  async update(id: string, updates: Partial<CRMCompany>): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase nÃ£o configurado') };
      }
      const dbUpdates: Partial<DbCRMCompany> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry || null;
      if (updates.website !== undefined) dbUpdates.website = updates.website || null;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('crm_companies')
        .update(dbUpdates)
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Exclui uma empresa CRM.
   * 
   * @param id - ID da empresa.
   * @returns Promise com erro, se houver.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase nÃ£o configurado') };
      }

      // Primeiro, remove vÃ­nculo para evitar erro de FK.
      const { error: contactsUpdateError } = await supabase
        .from('contacts')
        .update({ client_company_id: null })
        .eq('client_company_id', id);
      if (contactsUpdateError) return { error: contactsUpdateError };

      const { error: dealsUpdateError } = await supabase
        .from('deals')
        .update({ client_company_id: null })
        .eq('client_company_id', id);
      if (dealsUpdateError) return { error: dealsUpdateError };

      const { error } = await supabase
        .from('crm_companies')
        .delete()
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },
};
