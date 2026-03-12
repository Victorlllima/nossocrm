'use client';

import { Plus } from 'lucide-react';

const COLUMNS = [
  {
    id: 'lead',
    label: 'Lead',
    color: 'bg-slate-500',
    deals: [
      { id: 1, name: 'Marcos Vinicius', property: 'Apto 2q Mooca', value: 'R$ 380k', avatar: 'MV', daysIdle: 5 },
      { id: 2, name: 'Juliana Ferraz', property: 'Sala comercial Centro', value: 'R$ 220k', avatar: 'JF', daysIdle: 1 },
    ],
  },
  {
    id: 'contato',
    label: 'Contato feito',
    color: 'bg-blue-500',
    deals: [
      { id: 3, name: 'Carlos Mendonça', property: 'Apto 3q Moema', value: 'R$ 680k', avatar: 'CM', daysIdle: 2 },
      { id: 4, name: 'Letícia Yamamoto', property: 'Casa Granja Viana', value: 'R$ 890k', avatar: 'LY', daysIdle: 0 },
      { id: 5, name: 'Diego Santos', property: 'Studio Consolação', value: 'R$ 295k', avatar: 'DS', daysIdle: 3 },
    ],
  },
  {
    id: 'visita',
    label: 'Visita',
    color: 'bg-violet-500',
    deals: [
      { id: 6, name: 'Patrícia Souza', property: 'Casa Alphaville', value: 'R$ 1.2M', avatar: 'PS', daysIdle: 0 },
      { id: 7, name: 'Fábio Rodrigues', property: 'Flat Pinheiros', value: 'R$ 310k', avatar: 'FR', daysIdle: 0 },
    ],
  },
  {
    id: 'proposta',
    label: 'Proposta',
    color: 'bg-amber-500',
    deals: [
      { id: 8, name: 'Ana Beatriz Costa', property: 'Cobertura Itaim', value: 'R$ 2.1M', avatar: 'AC', daysIdle: 2 },
    ],
  },
  {
    id: 'fechado',
    label: 'Fechado',
    color: 'bg-green-500',
    deals: [
      { id: 9, name: 'Roberto Lima', property: 'Studio Vila Olímpia', value: 'R$ 420k', avatar: 'RL', daysIdle: 0 },
    ],
  },
];

export default function BoardsPage() {
  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Boards</h1>
          <p className="text-xs text-slate-400">9 deals ativos · R$ 6.5M</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Kanban horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 py-4 pb-6" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-64 rounded-2xl border border-dark-border bg-dark-card p-3"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="text-sm font-semibold text-white">{col.label}</span>
              <span className="ml-auto rounded-full bg-dark-hover px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {col.deals.length}
              </span>
            </div>

            {/* Deal cards */}
            <div className="space-y-2">
              {col.deals.map((deal) => (
                <div key={deal.id} className="rounded-xl border border-dark-border bg-dark-bg p-3 active:bg-dark-hover">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-[10px] font-bold text-primary-400">
                      {deal.avatar}
                    </div>
                    <p className="truncate text-xs font-semibold text-white">{deal.name}</p>
                  </div>
                  <p className="truncate text-[11px] text-slate-400 mb-2">{deal.property}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary-400">{deal.value}</span>
                    {deal.daysIdle > 0 && (
                      <span className="text-[10px] text-amber-400">{deal.daysIdle}d</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add deal */}
            <button className="mt-2 w-full rounded-xl border border-dashed border-dark-border py-2 text-xs text-slate-500 active:bg-dark-hover">
              + Novo deal
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
