import React from 'react'
import Link from 'next/link'
import { Rocket, KanbanSquare, Users, ArrowRight, Sparkles } from 'lucide-react'

interface EmptyStateProps {
    hasNoDeals?: boolean
    hasNoContacts?: boolean
}

/**
 * Componente de Empty State para o Dashboard
 * Exibido quando o usuÃ¡rio nÃ£o tem dados (novo usuÃ¡rio pÃ³s-onboarding)
 */
export function DashboardEmptyState({ hasNoDeals = true, hasNoContacts = true }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center px-4">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30">
                <Rocket className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight mb-3">
                Bem-vindo ao Max Lima!
            </h1>

            {/* Subtitle */}
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                Seu CRM estÃ¡ pronto. Comece adicionando seus primeiros negÃ³cios e contatos para ver suas mÃ©tricas aqui.
            </p>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                {hasNoDeals && (
                    <Link
                        href="/boards"
                        className="group p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary-500/50 transition-all"
                    >
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <KanbanSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            Criar NegÃ³cio
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            Adicione seu primeiro deal no pipeline de vendas.
                        </p>
                        <span className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 font-medium group-hover:gap-2 transition-all">
                            Ir para Pipeline
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                    </Link>
                )}

                {hasNoContacts && (
                    <Link
                        href="/contacts"
                        className="group p-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-lg hover:border-primary-500/50 transition-all"
                    >
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            Adicionar Contato
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            Cadastre clientes e prospects.
                        </p>
                        <span className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 font-medium group-hover:gap-2 transition-all">
                            Ir para Contatos
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                    </Link>
                )}
            </div>

            {/* Tip */}
            <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/20 rounded-xl max-w-lg">
                <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                    <div className="text-left">
                        <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            Dica do Max Lima
                        </p>
                        <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                            Use o assistente de IA (Ã­cone âœ¨ no header) para tirar dÃºvidas e criar conteÃºdos como emails e scripts de vendas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
