'use client';

import { useEffect, useState } from 'react';
import { Bell, Sparkles, Clock, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface FollowUpItem {
  id: string;
  deal_id: string;
  scheduled_at: string;
  contact_name: string;
  deal_title: string;
  deal_value: number;
  priority: string;
}

interface HotDeal {
  id: string;
  title: string;
  contact_name: string;
  value: number;
  stage_name: string;
  days_idle: number;
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Hoje ${formatTime(iso)}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Amanhã ${formatTime(iso)}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' + formatTime(iso);
}

function getInitials(name: string) {
  return (name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function InboxPage() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [hotDeals, setHotDeals] = useState<HotDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      setLoading(true);

      const until = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data: smData } = await supabase
        .from('scheduled_messages')
        .select('id, deal_id, scheduled_at, deals(title, value, priority, contacts(name))')
        .eq('status', 'PENDING')
        .lte('scheduled_at', until)
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (smData) {
        setFollowUps(smData.map((r: any) => ({
          id: r.id,
          deal_id: r.deal_id,
          scheduled_at: r.scheduled_at,
          contact_name: r.deals?.contacts?.name || 'Sem contato',
          deal_title: r.deals?.title || '',
          deal_value: r.deals?.value || 0,
          priority: r.deals?.priority || 'medium',
        })));
      }

      const { data: dealsData } = await supabase
        .from('deals')
        .select('id, title, value, updated_at, contacts(name), board_stages(name)')
        .eq('is_won', false)
        .eq('is_lost', false)
        .is('deleted_at', null)
        .order('updated_at', { ascending: true })
        .limit(5);

      if (dealsData) {
        setHotDeals(dealsData.map((d: any) => ({
          id: d.id,
          title: d.title,
          contact_name: d.contacts?.name || 'Sem contato',
          value: d.value || 0,
          stage_name: d.board_stages?.name || '',
          days_idle: daysAgo(d.updated_at),
        })));
      }

      setLoading(false);
    }

    load();
  }, []);

  const priorityDot: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-500',
  };

  return (
    <div className="flex flex-col pb-2">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div>
          <h1 className="font-display text-xl font-bold text-white">Inbox</h1>
          <p className="text-xs text-slate-400">
            {loading ? 'Carregando...' : `${followUps.length} follow-ups pendentes`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
            <Sparkles className="h-4 w-4" />
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-dark-card text-slate-400 active:bg-dark-hover">
            <Bell className="h-4 w-4" />
            {followUps.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-5">
          {followUps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary-400" />
                <h2 className="text-sm font-semibold text-white">Follow-ups agendados</h2>
                <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  {followUps.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {followUps.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-dark-border bg-dark-card p-3 active:bg-dark-hover">
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-400">
                        {getInitials(f.contact_name)}
                      </div>
                      <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-dark-card ${priorityDot[f.priority] || priorityDot.medium}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{f.contact_name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {f.deal_title} · R$ {f.deal_value.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <p className="flex-shrink-0 text-xs font-medium text-primary-400">{formatDate(f.scheduled_at)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hotDeals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary-400" />
                <h2 className="text-sm font-semibold text-white">Deals ativos</h2>
              </div>
              <div className="space-y-2.5">
                {hotDeals.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-dark-border bg-dark-card p-3 active:bg-dark-hover">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
                      {getInitials(d.contact_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{d.contact_name}</p>
                      <p className="truncate text-xs text-slate-400">{d.title}</p>
                      {d.stage_name && (
                        <span className="mt-1 inline-block rounded-full bg-dark-hover px-2 py-0.5 text-[10px] text-slate-300">
                          {d.stage_name}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-white">R$ {d.value.toLocaleString('pt-BR')}</p>
                      {d.days_idle > 2 && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          {d.days_idle}d parado
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {followUps.length === 0 && hotDeals.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
                <Sparkles className="h-8 w-8 text-primary-400" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Tudo em dia</h2>
                <p className="mt-1 text-sm text-slate-400">Nenhum follow-up pendente.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
