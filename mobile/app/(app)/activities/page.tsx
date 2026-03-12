'use client';

import { useEffect, useState } from 'react';
import { Plus, Filter, Phone, Mail, Calendar, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Activity {
  id: string;
  title: string;
  type: string;
  date: string;
  completed: boolean;
  deal_title: string | null;
  contact_name: string | null;
}

const typeIcon: Record<string, any> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
};

const typeColor: Record<string, string> = {
  CALL: 'text-blue-400 bg-blue-400/10',
  EMAIL: 'text-amber-400 bg-amber-400/10',
  MEETING: 'text-violet-400 bg-violet-400/10',
};

function isOverdue(iso: string, completed: boolean) {
  return !completed && new Date(iso) < new Date();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `Hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) {
    return `Amanhã ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      setLoading(true);

      let query = supabase
        .from('activities')
        .select('id, title, type, date, completed, deals(title), contacts(name)')
        .is('deleted_at', null)
        .order('date', { ascending: true })
        .limit(50);

      if (filter === 'pending') {
        query = query.eq('completed', false);
      }

      const { data } = await query;

      if (data) {
        setActivities(data.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          date: a.date,
          completed: a.completed,
          deal_title: a.deals?.title || null,
          contact_name: a.contacts?.name || null,
        })));
      }

      setLoading(false);
    }

    load();
  }, [filter]);

  const pending = activities.filter(a => !a.completed);
  const done = activities.filter(a => a.completed);

  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Atividades</h1>
          <p className="text-xs text-slate-400">
            {loading ? 'Carregando...' : `${pending.length} pendentes · ${done.length} concluídas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter(f => f === 'pending' ? 'all' : 'pending')}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${filter === 'all' ? 'bg-primary-500 text-white' : 'bg-dark-card text-slate-400'} active:opacity-70`}
          >
            <Filter className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-8">
          <CheckCircle2 className="h-10 w-10 text-primary-400/40" />
          <p className="text-sm text-slate-400">Nenhuma atividade encontrada.</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-5 pb-4">
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Pendentes</h2>
              <div className="space-y-2">
                {pending.map(a => {
                  const overdue = isOverdue(a.date, a.completed);
                  const Icon = typeIcon[a.type] || Calendar;
                  const color = typeColor[a.type] || typeColor.MEETING;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-start gap-3 rounded-2xl border p-3 active:bg-dark-hover ${overdue ? 'border-red-500/40 bg-red-500/5' : 'border-dark-border bg-dark-card'}`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{a.title}</p>
                        {(a.contact_name || a.deal_title) && (
                          <p className="text-xs text-slate-400 truncate">
                            {[a.contact_name, a.deal_title].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <div className={`mt-1.5 flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                          <Clock className="h-3 w-3" />
                          {formatDate(a.date)}
                          {overdue && <span className="font-semibold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Atrasado</span>}
                        </div>
                      </div>
                      <button className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-dark-border text-slate-600 active:bg-dark-hover">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Concluídas</h2>
              <div className="space-y-2">
                {done.map(a => (
                  <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-dark-border bg-dark-card/50 p-3 opacity-60">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-green-400/10">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-400 line-through">{a.title}</p>
                      {(a.contact_name || a.deal_title) && (
                        <p className="text-xs text-slate-500 truncate">
                          {[a.contact_name, a.deal_title].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-600">{formatDate(a.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
