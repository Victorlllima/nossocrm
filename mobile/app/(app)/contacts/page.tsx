'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  company_name: string | null;
  deal_count: number;
}

const stageLabel: Record<string, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualificado',
  CUSTOMER: 'Cliente',
  INACTIVE: 'Inativo',
};

const stageColor: Record<string, string> = {
  LEAD: 'text-blue-400 bg-blue-400/10',
  QUALIFIED: 'text-violet-400 bg-violet-400/10',
  CUSTOMER: 'text-green-400 bg-green-400/10',
  INACTIVE: 'text-slate-400 bg-slate-400/10',
};

function getInitials(name: string) {
  return (name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from('contacts')
        .select('id, name, phone, stage, company_name')
        .eq('status', 'ACTIVE')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (!data) { setLoading(false); return; }

      // Contar deals por contato
      const ids = data.map((c: any) => c.id);
      const { data: dealsData } = await supabase
        .from('deals')
        .select('contact_id')
        .in('contact_id', ids)
        .eq('is_won', false)
        .eq('is_lost', false)
        .is('deleted_at', null);

      const dealCounts: Record<string, number> = {};
      (dealsData || []).forEach((d: any) => {
        dealCounts[d.contact_id] = (dealCounts[d.contact_id] || 0) + 1;
      });

      setContacts(data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        stage: c.stage || 'LEAD',
        company_name: c.company_name,
        deal_count: dealCounts[c.id] || 0,
      })));

      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [contacts, search]);

  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Contatos</h1>
            <p className="text-xs text-slate-400">
              {loading ? 'Carregando...' : `${contacts.length} contatos`}
            </p>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar contatos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-dark-border bg-dark-card py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary-500"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
          <p className="text-sm text-slate-400">
            {search ? 'Nenhum contato encontrado.' : 'Nenhum contato cadastrado.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-dark-border">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 active:bg-dark-card">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
                {getInitials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stageColor[c.stage] || stageColor.LEAD}`}>
                    {stageLabel[c.stage] || c.stage}
                  </span>
                  {c.company_name && (
                    <span className="text-[10px] text-slate-500 truncate">{c.company_name}</span>
                  )}
                  {c.deal_count > 0 && (
                    <span className="text-[10px] text-slate-500">{c.deal_count} deal{c.deal_count > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                )}
                {c.phone && (
                  <a
                    href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
