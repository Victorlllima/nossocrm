'use client';

import { Bell, Sparkles, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const FOLLOW_UPS = [
  { id: 1, name: 'Carlos Mendonça', phone: '(11) 99821-4432', deal: 'Apto 3q Moema', value: 'R$ 680k', time: 'Hoje 10:00', priority: 'high', avatar: 'CM' },
  { id: 2, name: 'Patrícia Souza', phone: '(11) 98765-3321', deal: 'Casa Alphaville', value: 'R$ 1.2M', time: 'Hoje 14:30', priority: 'high', avatar: 'PS' },
  { id: 3, name: 'Roberto Lima', phone: '(11) 97654-2210', deal: 'Studio Vila Olímpia', value: 'R$ 420k', time: 'Amanhã 09:00', priority: 'medium', avatar: 'RL' },
];

const DEALS_HOT = [
  { id: 1, name: 'Ana Beatriz Costa', deal: 'Cobertura Itaim', value: 'R$ 2.1M', stage: 'Proposta enviada', daysIdle: 2, avatar: 'AC' },
  { id: 2, name: 'Fábio Rodrigues', deal: 'Flat Pinheiros', value: 'R$ 310k', stage: 'Visita agendada', daysIdle: 0, avatar: 'FR' },
];

const priorityColor: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-500',
};

export default function InboxPage() {
  return (
    <div className="flex flex-col pb-2">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Inbox</h1>
          <p className="text-xs text-slate-400">3 follow-ups hoje</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
            <Sparkles className="h-4 w-4" />
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5">
        {/* Follow-ups de hoje */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-semibold text-white">Follow-ups de hoje</h2>
            <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">3</span>
          </div>
          <div className="space-y-2.5">
            {FOLLOW_UPS.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-dark-border bg-dark-card p-3 active:bg-dark-hover">
                <div className="relative flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
                    {f.avatar}
                  </div>
                  <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-dark-card ${priorityColor[f.priority]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{f.name}</p>
                  <p className="truncate text-xs text-slate-400">{f.deal} · {f.value}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-medium text-primary-400">{f.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Deals quentes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-semibold text-white">Deals quentes</h2>
          </div>
          <div className="space-y-2.5">
            {DEALS_HOT.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-dark-border bg-dark-card p-3 active:bg-dark-hover">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
                  {d.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{d.name}</p>
                  <p className="truncate text-xs text-slate-400">{d.deal}</p>
                  <span className="mt-1 inline-block rounded-full bg-dark-hover px-2 py-0.5 text-[10px] text-slate-300">{d.stage}</span>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-white">{d.value}</p>
                  {d.daysIdle > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      {d.daysIdle}d parado
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
