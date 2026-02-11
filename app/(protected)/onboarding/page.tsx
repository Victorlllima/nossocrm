'use client'

import React, { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Building2, User, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { initializeAccount, setupFormSchema, type SetupFormData, type SetupState } from '@/features/setup'

/**
 * PÃ¡gina de Onboarding para usuÃ¡rios que acabaram de se cadastrar
 * Permite configurar a organizaÃ§Ã£o e perfil do usuÃ¡rio
 */
export default function OnboardingPage() {
    const router = useRouter()
    const { user, profile, loading: authLoading, refreshProfile } = useAuth()

    const [state, formAction, isPending] = useActionState<SetupState | null, FormData>(
        initializeAccount,
        null
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        setValue,
    } = useForm<SetupFormData>({
        resolver: zodResolver(setupFormSchema),
        defaultValues: {
            organizationName: '',
            fullName: '',
        },
    })

    // Preenche o nome se tiver no user metadata
    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setValue('fullName', user.user_metadata.full_name)
        }
    }, [user, setValue])

    // Redireciona se jÃ¡ tem organizaÃ§Ã£o configurada
    useEffect(() => {
        if (!authLoading && profile?.organization_id) {
            router.replace('/dashboard')
        }
    }, [authLoading, profile, router])

    // Sincroniza erros do servidor
    useEffect(() => {
        if (state?.errors) {
            if (state.errors.organizationName) {
                setError('organizationName', { message: state.errors.organizationName[0] })
            }
            if (state.errors.fullName) {
                setError('fullName', { message: state.errors.fullName[0] })
            }
        }
    }, [state?.errors, setError])

    // Sucesso: atualiza profile e redireciona
    useEffect(() => {
        if (state?.success) {
            refreshProfile().then(() => {
                router.push('/dashboard')
                router.refresh()
            })
        }
    }, [state?.success, refreshProfile, router])

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
                <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
            </div>
        )
    }

    // Se nÃ£o estÃ¡ logado, redireciona para login
    if (!user) {
        router.replace('/login')
        return null
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full relative z-10 px-4">
                {/* Header com Ã­cone */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/30">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight mb-2">
                        Quase lÃ¡!
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Configure sua conta para comeÃ§ar a usar o Max Lima.
                    </p>
                </div>

                {/* Card do formulÃ¡rio */}
                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
                    <form
                        action={formAction}
                        onSubmit={handleSubmit(() => {
                            const form = document.querySelector('form') as HTMLFormElement
                            if (form) {
                                const formData = new FormData(form)
                                formAction(formData)
                            }
                        })}
                        className="space-y-5"
                    >
                        {/* Nome da Empresa */}
                        <div>
                            <label htmlFor="organizationName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Nome da sua empresa
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    {...register('organizationName')}
                                    id="organizationName"
                                    name="organizationName"
                                    type="text"
                                    aria-invalid={errors.organizationName ? 'true' : 'false'}
                                    aria-describedby={errors.organizationName ? 'org-error' : undefined}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.organizationName
                                            ? 'border-red-500 dark:border-red-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    placeholder="Ex: Acme Corp"
                                />
                            </div>
                            {errors.organizationName && (
                                <p id="org-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.organizationName.message}
                                </p>
                            )}
                        </div>

                        {/* Nome Completo */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Seu nome completo
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    {...register('fullName')}
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    aria-invalid={errors.fullName ? 'true' : 'false'}
                                    aria-describedby={errors.fullName ? 'name-error' : undefined}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.fullName
                                            ? 'border-red-500 dark:border-red-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    placeholder="JoÃ£o Silva"
                                />
                            </div>
                            {errors.fullName && (
                                <p id="name-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.fullName.message}
                                </p>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/20 text-primary-700 dark:text-primary-300 text-sm">
                            <p className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    VocÃª serÃ¡ o administrador da sua organizaÃ§Ã£o e poderÃ¡ convidar outros membros da equipe.
                                </span>
                            </p>
                        </div>

                        {/* Erro geral */}
                        {state?.message && !state.success && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center"
                            >
                                {state.message}
                            </div>
                        )}

                        {/* BotÃ£o de submit */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {isPending ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    ComeÃ§ar a usar o Max Lima
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    &copy; {new Date().getFullYear()} Max Lima CRM. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
