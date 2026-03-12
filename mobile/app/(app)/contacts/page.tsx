'use client';

import { Plus, Search, Phone, MessageCircle } from 'lucide-react';

const CONTACTS = [
  { id: 1, name: 'Ana Beatriz Costa', phone: '(11) 98001-1234', tag: 'Comprador', deals: 1, avatar: 'AC', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 2, name: 'Carlos Mendonça', phone: '(11) 99821-4432', tag: 'Comprador', deals: 2, avatar: 'CM', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 3, name: 'Diego Santos', phone: '(11) 97001-5566', tag: 'Investidor', deals: 1, avatar: 'DS', tagColor: 'text-violet-400 bg-violet-400/10' },
  { id: 4, name: 'Fábio Rodrigues', phone: '(11) 96543-2211', tag: 'Comprador', deals: 1, avatar: 'FR', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 5, name: 'Juliana Ferraz', phone: '(11) 98123-9988', tag: 'Locatário', deals: 1, avatar: 'JF', tagColor: 'text-green-400 bg-green-400/10' },
  { id: 6, name: 'Letícia Yamamoto', phone: '(11) 99654-7743', tag: 'Comprador', deals: 1, avatar: 'LY', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 7, name: 'Marcos Vinicius', phone: '(11) 98777-3300', tag: 'Locatário', deals: 2, avatar: 'MV', tagColor: 'text-green-400 bg-green-400/10' },
  { id: 8, name: 'Patrícia Souza', phone: '(11) 98765-3321', tag: 'Comprador', deals: 1, avatar: 'PS', tagColor: 'text-blue-400 bg-blue-400/10' },
  { id: 9, name: 'Roberto Lima', phone: '(11) 97654-2210', tag: 'Investidor', deals: 3, avatar: 'RL', tagColor: 'text-violet-400 bg-violet-400/10' },
];

export default function ContactsPage() {
  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Contatos</h1>
            <p className="text-xs text-slate-400">9 contatos</p>
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
            className="w-full rounded-xl border border-dark-border bg-dark-card py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary-500"
          />
        </div>
      </header>

      <div className="divide-y divide-dark-border">
        {CONTACTS.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 active:bg-dark-card">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
              {c.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{c.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.tagColor}`}>{c.tag}</span>
                <span className="text-[10px] text-slate-500">{c.deals} deal{c.deals > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
                <Phone className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
