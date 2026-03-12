'use client';

import { useEffect, useState } from 'react';
import { Plus, Clock, ChevronRight, CalendarClock, Loader2, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface ScheduledMessage {
  id: string;
  deal_id: string;
  scheduled_at: string;
  message_content: string;
  status: string;
  deal_title?: string;
  contact_name?: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDay.getTime() === today.getTime()) return 'Hoje';
  if (msgDay.getTime() === tomorrow.getTime()) return 'Amanhã';

  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date();
}

export default function FollowUpPage() {
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('scheduled_messages')
          .select(`
            id,
            deal_id,
            scheduled_at,
            message_content,
            status,
            deals(title, contacts(name))
          `)
          .eq('status', 'PENDING')
          .order('scheduled_at', { ascending: true });

        if (error) throw error;

        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          deal_id: row.deal_id,
          scheduled_at: row.scheduled_at,
          message_content: row.message_content,
          status: row.status,
          deal_title: row.deals?.title,
          contact_name: row.deals?.contacts?.name,
        }));

        setItems(mapped);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const today = items.filter((i) => formatDate(i.scheduled_at) === 'Hoje');
  const upcoming = items.filter((i) => formatDate(i.scheduled_at) !== 'Hoje');
  const overdue = items.filter((i) => isOverdue(i.scheduled_at));

  const pendingToday = today.length;

  return (
    <div className="flex flex-col">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Follow-up</h1>
          <p className="text-xs text-slate-400">
            {loading ? 'Carregando...' : `${pendingToday} hoje · ${upcoming.length} próximos`}
          </p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
              <CalendarClock className="h-8 w-8 text-primary-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Nenhum follow-up pendente</h2>
              <p className="mt-1 text-sm text-slate-400">Todos os agendamentos foram enviados.</p>
            </div>
          </div>
        )}

        {/* Atrasados */}
        {!loading && overdue.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" /> Atrasados
            </h2>
            <div className="space-y-2.5">
              {overdue.map((f) => (
                <FollowUpCard key={f.id} item={f} highlight="overdue" />
              ))}
            </div>
          </section>
        )}

        {/* Hoje */}
        {!loading && today.filter((i) => !isOverdue(i.scheduled_at)).length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Hoje</h2>
            <div className="space-y-2.5">
              {today.filter((i) => !isOverdue(i.scheduled_at)).map((f) => (
                <FollowUpCard key={f.id} item={f} highlight="today" />
              ))}
            </div>
          </section>
        )}

        {/* Próximos */}
        {!loading && upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Próximos</h2>
            <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden divide-y divide-dark-border">
              {upcoming.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 active:bg-dark-hover">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-xs font-bold text-primary-400">
                    {getInitials(f.contact_name || f.deal_title || '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{f.contact_name || 'Sem contato'}</p>
                    <p className="text-xs text-slate-500 truncate">{f.deal_title}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-300">{formatDate(f.scheduled_at)}</span>
                    <span className="text-[10px] text-slate-500">{formatTime(f.scheduled_at)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function FollowUpCard({ item, highlight }: { item: ScheduledMessage; highlight: 'today' | 'overdue' }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${highlight === 'overdue' ? 'border-red-500/40 bg-red-500/5' : 'border-dark-border bg-dark-card'}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
          {getInitials(item.contact_name || item.deal_title || '?')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{item.contact_name || 'Sem contato'}</p>
          <p className="text-xs text-slate-400 truncate">{item.deal_title}</p>
        </div>
        <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${highlight === 'overdue' ? 'text-red-400' : 'text-primary-400'}`}>
          <Clock className="h-3 w-3" />
          {formatTime(item.scheduled_at)}
          {highlight === 'overdue' && <span className="font-bold">· Atrasado</span>}
        </div>
      </div>
      <p className="text-xs text-slate-400 bg-dark-bg rounded-xl px-3 py-2 leading-relaxed line-clamp-2">
        {item.message_content}
      </p>
    </div>
  );
}
