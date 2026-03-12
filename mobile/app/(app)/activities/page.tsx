'use client';

import { Plus, Filter, Phone, Mail, MapPin, CheckCircle2, Clock } from 'lucide-react';

const ACTIVITIES = [
  {
    id: 1, type: 'call', icon: Phone, color: 'text-blue-400 bg-blue-400/10',
    title: 'Ligar para Carlos Mendonça', contact: 'Carlos Mendonça',
    deal: 'Apto 3q Moema', time: 'Hoje 10:00', done: false, overdue: false,
  },
  {
    id: 2, type: 'visit', icon: MapPin, color: 'text-violet-400 bg-violet-400/10',
    title: 'Visita — Casa Alphaville', contact: 'Patrícia Souza',
    deal: 'Casa Alphaville', time: 'Hoje 14:30', done: false, overdue: false,
  },
  {
    id: 3, type: 'email', icon: Mail, color: 'text-amber-400 bg-amber-400/10',
    title: 'Enviar proposta atualizada', contact: 'Ana Beatriz Costa',
    deal: 'Cobertura Itaim', time: 'Ontem 17:00', done: false, overdue: true,
  },
  {
    id: 4, type: 'call', icon: Phone, color: 'text-blue-400 bg-blue-400/10',
    title: 'Follow-up pós visita', contact: 'Fábio Rodrigues',
    deal: 'Flat Pinheiros', time: 'Amanhã 09:00', done: false, overdue: false,
  },
  {
    id: 5, type: 'call', icon: Phone, color: 'text-blue-400 bg-blue-400/10',
    title: 'Confirmar interesse', contact: 'Diego Santos',
    deal: 'Studio Consolação', time: 'Seg 11:00', done: true, overdue: false,
  },
  {
    id: 6, type: 'visit', icon: MapPin, color: 'text-violet-400 bg-violet-400/10',
    title: 'Apresentar imóvel', contact: 'Letícia Yamamoto',
    deal: 'Casa Granja Viana', time: 'Sex 15:00', done: true, overdue: false,
  },
];

const pending = ACTIVITIES.filter((a) => !a.done);
const done = ACTIVITIES.filter((a) => a.done);

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Atividades</h1>
          <p className="text-xs text-slate-400">{pending.length} pendentes · {done.length} concluídas</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
            <Filter className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-5 pb-4">
        {/* Pendentes */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Pendentes</h2>
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className={`flex items-start gap-3 rounded-2xl border p-3 active:bg-dark-hover ${a.overdue ? 'border-red-500/40 bg-red-500/5' : 'border-dark-border bg-dark-card'}`}>
                <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${a.color}`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="text-xs text-slate-400 truncate">{a.contact} · {a.deal}</p>
                  <div className={`mt-1.5 flex items-center gap-1 text-xs ${a.overdue ? 'text-red-400' : 'text-slate-500'}`}>
                    <Clock className="h-3 w-3" />
                    {a.time}
                    {a.overdue && <span className="ml-1 font-semibold">· Atrasado</span>}
                  </div>
                </div>
                <button className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-dark-border text-slate-600 active:bg-dark-hover">
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Concluídas */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Concluídas</h2>
          <div className="space-y-2">
            {done.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-dark-border bg-dark-card/50 p-3 opacity-60">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-green-400/10">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-400 line-through">{a.title}</p>
                  <p className="text-xs text-slate-500 truncate">{a.contact} · {a.deal}</p>
                  <p className="mt-1 text-xs text-slate-600">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
