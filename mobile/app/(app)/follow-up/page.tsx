'use client';

import { Plus, CalendarClock, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

const TODAY = [
  { id: 1, name: 'Carlos Mendonça', deal: 'Apto 3q Moema', time: '10:00', note: 'Verificar se ainda tem interesse após visita da semana passada', avatar: 'CM', done: false },
  { id: 2, name: 'Patrícia Souza', deal: 'Casa Alphaville', time: '14:30', note: 'Apresentar contraproposta — ela pediu desconto de 5%', avatar: 'PS', done: false },
  { id: 3, name: 'Juliana Ferraz', deal: 'Sala comercial Centro', time: '16:00', note: 'Confirmar documentação para assinatura', avatar: 'JF', done: true },
];

const UPCOMING = [
  { id: 4, name: 'Roberto Lima', deal: 'Studio Vila Olímpia', date: 'Amanhã', time: '09:00', avatar: 'RL' },
  { id: 5, name: 'Diego Santos', deal: 'Studio Consolação', date: 'Quinta', time: '11:30', avatar: 'DS' },
  { id: 6, name: 'Marcos Vinicius', deal: 'Apto 2q Mooca', date: 'Sex', time: '15:00', avatar: 'MV' },
  { id: 7, name: 'Ana Beatriz Costa', deal: 'Cobertura Itaim', date: 'Seg', time: '10:00', avatar: 'AC' },
];

export default function FollowUpPage() {
  const pending = TODAY.filter((f) => !f.done);
  const done = TODAY.filter((f) => f.done);

  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Follow-up</h1>
          <p className="text-xs text-slate-400">{pending.length} hoje · {UPCOMING.length} esta semana</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="px-4 pt-4 space-y-5 pb-4">
        {/* Hoje */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Hoje</h2>
          <div className="space-y-2.5">
            {TODAY.map((f) => (
              <div key={f.id} className={`rounded-2xl border p-3.5 ${f.done ? 'border-dark-border bg-dark-card/40 opacity-60' : 'border-dark-border bg-dark-card'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${f.done ? 'bg-green-400/10 text-green-400' : 'bg-primary-500/20 text-primary-400'}`}>
                    {f.done ? <CheckCircle2 className="h-5 w-5" /> : f.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${f.done ? 'text-slate-400 line-through' : 'text-white'}`}>{f.name}</p>
                    <p className="text-xs text-slate-400 truncate">{f.deal}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary-400 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {f.time}
                  </div>
                </div>
                {!f.done && f.note && (
                  <p className="text-xs text-slate-400 bg-dark-bg rounded-xl px-3 py-2 leading-relaxed">
                    {f.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Próximos */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Próximos</h2>
          <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden divide-y divide-dark-border">
            {UPCOMING.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 active:bg-dark-hover">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-xs font-bold text-primary-400">
                  {f.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{f.name}</p>
                  <p className="text-xs text-slate-500 truncate">{f.deal}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-300">{f.date}</span>
                  <span className="text-[10px] text-slate-500">{f.time}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
