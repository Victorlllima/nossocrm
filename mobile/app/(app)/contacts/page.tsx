'use client';

import { Users, Search, Plus } from 'lucide-react';

export default function ContactsPage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b border-dark-border bg-dark-bg/80 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold text-white">Contatos</h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar contatos..."
            className="w-full rounded-xl border border-dark-border bg-dark-card py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary-500"
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
          <Users className="h-8 w-8 text-primary-400" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Contatos em construção</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lista de contatos otimizada para mobile em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
