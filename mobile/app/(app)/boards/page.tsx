'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, ChevronDown } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Deal {
  id: string;
  title: string;
  value: number;
  contact_name: string;
  days_idle: number;
  has_followup: boolean;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

interface Board {
  id: string;
  name: string;
  stages: Stage[];
  total_value: number;
  deal_count: number;
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function getInitials(name: string) {
  return (name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBoardPicker, setShowBoardPicker] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      setLoading(true);

      // Buscar boards com stages
      const { data: boardsData } = await supabase
        .from('boards')
        .select('id, name, board_stages(id, name, color)')
        .is('deleted_at', null)
        .order('position', { ascending: true });

      if (!boardsData || boardsData.length === 0) {
        setLoading(false);
        return;
      }

      // Buscar todos os deals abertos
      const { data: dealsData } = await supabase
        .from('deals')
        .select('id, title, value, stage_id, board_id, updated_at, contacts(name)')
        .eq('is_won', false)
        .eq('is_lost', false)
        .is('deleted_at', null);

      // Buscar follow-ups pendentes para marcar deals
      const { data: followUpsData } = await supabase
        .from('scheduled_messages')
        .select('deal_id')
        .eq('status', 'PENDING');

      const followUpDealIds = new Set((followUpsData || []).map((f: any) => f.deal_id));

      const mapped: Board[] = (boardsData as any[]).map((b) => {
        const stages: Stage[] = (b.board_stages || []).map((s: any) => {
          const stageDeals = (dealsData || [])
            .filter((d: any) => d.stage_id === s.id)
            .map((d: any) => ({
              id: d.id,
              title: d.title,
              value: d.value || 0,
              contact_name: d.contacts?.name || 'Sem contato',
              days_idle: daysAgo(d.updated_at),
              has_followup: followUpDealIds.has(d.id),
            }));
          return { id: s.id, name: s.name, color: s.color || 'bg-slate-500', deals: stageDeals };
        });

        const allDeals = stages.flatMap(s => s.deals);
        return {
          id: b.id,
          name: b.name,
          stages,
          total_value: allDeals.reduce((sum, d) => sum + d.value, 0),
          deal_count: allDeals.length,
        };
      });

      setBoards(mapped);
      setActiveBoard(mapped[0] || null);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header
        className="sticky top-0 z-40 border-b border-dark-border bg-dark-bg/90 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center justify-between">
          <div>
            {boards.length > 1 ? (
              <button
                onClick={() => setShowBoardPicker(!showBoardPicker)}
                className="flex items-center gap-1 text-white active:opacity-70"
              >
                <h1 className="font-display text-xl font-bold">{activeBoard?.name || 'Boards'}</h1>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            ) : (
              <h1 className="font-display text-xl font-bold text-white">{activeBoard?.name || 'Boards'}</h1>
            )}
            <p className="text-xs text-slate-400">
              {loading ? 'Carregando...' : `${activeBoard?.deal_count || 0} deals · R$ ${(activeBoard?.total_value || 0).toLocaleString('pt-BR')}`}
            </p>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white active:bg-primary-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Board picker dropdown */}
        {showBoardPicker && boards.length > 1 && (
          <div className="mt-2 rounded-xl border border-dark-border bg-dark-card overflow-hidden">
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => { setActiveBoard(b); setShowBoardPicker(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeBoard?.id === b.id ? 'text-primary-400 bg-primary-500/10' : 'text-white active:bg-dark-hover'}`}
              >
                {b.name}
                <span className="ml-2 text-xs text-slate-500">{b.deal_count} deals</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
        </div>
      ) : !activeBoard ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-8">
          <p className="text-sm text-slate-400">Nenhum board encontrado.</p>
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto px-4 py-4 pb-6 flex-1"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {activeBoard.stages.map((stage) => (
            <div
              key={stage.id}
              className="flex-shrink-0 w-64 rounded-2xl border border-dark-border bg-dark-card p-3"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Stage header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.color || 'bg-slate-500'}`} />
                <span className="text-sm font-semibold text-white truncate flex-1">{stage.name}</span>
                <span className="rounded-full bg-dark-hover px-2 py-0.5 text-[10px] font-bold text-slate-400 flex-shrink-0">
                  {stage.deals.length}
                </span>
              </div>

              {/* Deal cards */}
              <div className="space-y-2">
                {stage.deals.length === 0 ? (
                  <p className="text-center text-xs text-slate-600 py-4">Vazio</p>
                ) : (
                  stage.deals.map((deal) => (
                    <div key={deal.id} className="rounded-xl border border-dark-border bg-dark-bg p-3 active:bg-dark-hover">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-[10px] font-bold text-primary-400">
                          {getInitials(deal.contact_name)}
                        </div>
                        <p className="truncate text-xs font-semibold text-white flex-1">{deal.contact_name}</p>
                        {deal.has_followup && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" title="Follow-up agendado" />
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-400 mb-2">{deal.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary-400">
                          R$ {deal.value.toLocaleString('pt-BR')}
                        </span>
                        {deal.days_idle > 5 && (
                          <span className="text-[10px] text-amber-400">{deal.days_idle}d</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="mt-2 w-full rounded-xl border border-dashed border-dark-border py-2 text-xs text-slate-500 active:bg-dark-hover">
                + Novo deal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
