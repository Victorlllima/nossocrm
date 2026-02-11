import React from 'react';
import { Plus, Search, LayoutGrid, Table as TableIcon, User, Settings, Lightbulb, Download, CalendarClock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Board } from '@/types';
import { BoardSelector } from '../BoardSelector';
import { PeriodFilter, PERIOD_LABELS } from '@/features/dashboard/hooks/useDashboardMetrics';

interface KanbanHeaderProps {
    // Boards
    boards: Board[];
    activeBoard: Board;
    onSelectBoard: (id: string) => void;
    onCreateBoard: () => void;
    onEditBoard?: (board: Board) => void;
    onDeleteBoard?: (id: string) => void;
    onExportTemplates?: () => void;
    // View
    viewMode: 'kanban' | 'list';
    setViewMode: (mode: 'kanban' | 'list') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    ownerFilter: 'all' | 'mine';
    setOwnerFilter: (filter: 'all' | 'mine') => void;
    statusFilter: 'open' | 'won' | 'lost' | 'all';
    setStatusFilter: (filter: 'open' | 'won' | 'lost' | 'all') => void;
    conversationPeriodFilter?: PeriodFilter;
    setConversationPeriodFilter?: (filter: PeriodFilter) => void;
    onNewDeal: () => void;
}

/**
 * Componente React `KanbanHeader`.
 *
 * @param {KanbanHeaderProps} {
    boards,
    activeBoard,
    onSelectBoard,
    onCreateBoard,
    onEditBoard,
    onDeleteBoard,
    onExportTemplates,
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter,
    statusFilter, setStatusFilter,
    onNewDeal
} - ParÃ¢metro `{
    boards,
    activeBoard,
    onSelectBoard,
    onCreateBoard,
    onEditBoard,
    onDeleteBoard,
    onExportTemplates,
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter,
    statusFilter, setStatusFilter,
    onNewDeal
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const KanbanHeader: React.FC<KanbanHeaderProps> = ({
    boards,
    activeBoard,
    onSelectBoard,
    onCreateBoard,
    onEditBoard,
    onDeleteBoard,
    onExportTemplates,
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter,
    statusFilter, setStatusFilter,
    conversationPeriodFilter,
    setConversationPeriodFilter,
    onNewDeal
}) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                {/* Board Selector */}
                <BoardSelector
                    boards={boards}
                    activeBoard={activeBoard}
                    onSelectBoard={onSelectBoard}
                    onCreateBoard={onCreateBoard}
                    onEditBoard={onEditBoard}
                    onDeleteBoard={onDeleteBoard}
                />

                {/* Edit Board Button */}
                {onEditBoard && (
                    <button
                        onClick={() => onEditBoard(activeBoard)}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="ConfiguraÃ§Ãµes do Board"
                    >
                        <Settings size={20} />
                    </button>
                )}

                {/* Export Template Button */}
                {onExportTemplates && (
                    <button
                        onClick={onExportTemplates}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Exportar template (comunidade)"
                    >
                        <Download size={20} />
                    </button>
                )}

                {/* Automation Guide Button */}
                {activeBoard.automationSuggestions && activeBoard.automationSuggestions.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className="p-2 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors relative group"
                                title="AutomaÃ§Ãµes Sugeridas"
                            >
                                <Lightbulb size={20} className="fill-current" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
                                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Lightbulb size={16} className="text-yellow-500" />
                                    AutomaÃ§Ãµes Sugeridas
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Dicas da IA para otimizar este processo.
                                </p>
                            </div>
                            <div className="p-2">
                                <ul className="space-y-1">
                                    {activeBoard.automationSuggestions.map((suggestion, idx) => (
                                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md flex gap-2 items-start">
                                            <span className="text-slate-400 mt-0.5">â€¢</span>
                                            <span>{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* VIEW TOGGLE */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => setViewMode('kanban')}
                        aria-label="VisualizaÃ§Ã£o em quadro Kanban"
                        aria-pressed={viewMode === 'kanban'}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        <LayoutGrid size={16} aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        aria-label="VisualizaÃ§Ã£o em lista"
                        aria-pressed={viewMode === 'list'}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        <TableIcon size={16} aria-hidden="true" />
                    </button>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2 hidden sm:block"></div>
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Filtrar negÃ³cios ou empresas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white backdrop-blur-sm"
                    />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        aria-label="Filtrar por status"
                        className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white backdrop-blur-sm appearance-none cursor-pointer"
                    >
                        <option value="open">Em Aberto</option>
                        <option value="won">Ganhos</option>
                        <option value="lost">Perdidos</option>
                        <option value="all">Todos</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className={`w-2 h-2 rounded-full ${statusFilter === 'open' ? 'bg-blue-500' :
                            statusFilter === 'won' ? 'bg-green-500' :
                                statusFilter === 'lost' ? 'bg-red-500' : 'bg-slate-400'
                            }`} />
                    </div>
                </div>

                <div className="relative">
                    <select
                        value={ownerFilter}
                        onChange={(e) => setOwnerFilter(e.target.value as 'all' | 'mine')}
                        aria-label="Filtrar negÃ³cios por proprietÃ¡rio"
                        className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white backdrop-blur-sm appearance-none cursor-pointer"
                    >
                        <option value="all">Todos os Donos</option>
                        <option value="mine">Meus NegÃ³cios</option>
                    </select>
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>

                {/* CONVERSATION PERIOD FILTER */}
                {setConversationPeriodFilter && (
                    <div className="relative">
                        <select
                            value={conversationPeriodFilter || 'all'}
                            onChange={(e) => setConversationPeriodFilter(e.target.value as PeriodFilter)}
                            aria-label="Filtrar por perÃ­odo de conversas"
                            className="pl-9 pr-4 py-2 rounded-lg border border-primary-300/30 dark:border-primary-500/20 bg-primary-50/50 dark:bg-primary-900/10 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white backdrop-blur-sm appearance-none cursor-pointer"
                        >
                            <option value="all">Todo PerÃ­odo</option>
                            <option value="today">Conversas de Hoje</option>
                            <option value="last_7_days">Ãšltimos 7 dias</option>
                            <option value="last_30_days">Ãšltimos 30 dias</option>
                            <option value="this_month">Este MÃªs</option>
                        </select>
                        <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 dark:text-primary-400 pointer-events-none" size={16} />
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onNewDeal}
                    className="bg-primary-700 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary-700/20"
                >
                    <Plus size={18} aria-hidden="true" /> Novo NegÃ³cio
                </button>
            </div>
        </div>
    );
};
