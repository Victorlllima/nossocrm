'use client';

import { CalendarClock, Plus } from 'lucide-react';

export default function FollowUpPage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/80 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Follow-up</h1>
          <p className="text-xs text-slate-400">Agendamentos e lembretes</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
          <CalendarClock className="h-8 w-8 text-primary-400" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Follow-up em construção</h2>
          <p className="mt-1 text-sm text-slate-400">
            Agendamento de follow-ups com notificação push em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
