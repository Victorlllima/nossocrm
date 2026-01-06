'use client'

import React, { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock, ShieldCheck, ArrowRight } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { updatePassword } from '@/features/auth'

/**
 * Schema de validação para o formulário
 */
const updatePasswordFormSchema = z.object({
    newPassword: z
        .string()
        .min(6, 'Senha deve ter no mínimo 6 caracteres')
        .max(72, 'Senha deve ter no máximo 72 caracteres'),
    confirmPassword: z
        .string()
        .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

type FormDataValues = z.infer<typeof updatePasswordFormSchema>

/**
 * Página de atualização obrigatória de senha
 * Exibida quando profile.must_change_password = true
 */
export default function UpdatePasswordPage() {
    const router = useRouter()
    const { user, loading: authLoading, requiresPasswordChange, refreshProfile } = useAuth()

    // Deixamos o TypeScript inferir os tipos para evitar conflitos de FormData vs Object
    const [state, formAction, isPending] = useActionState(updatePassword, null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<FormDataValues>({
        resolver: zodResolver(updatePasswordFormSchema),
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
    })

    // Sincroniza erros do servidor
    useEffect(() => {
        if (state?.errors) {
            if (state.errors.newPassword) {
                setError('newPassword', { message: state.errors.newPassword[0] })
            }
            if (state.errors.confirmPassword) {
                setError('confirmPassword', { message: state.errors.confirmPassword[0] })
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

    // Se não precisa trocar senha, redireciona para dashboard
    useEffect(() => {
        if (!authLoading && !requiresPasswordChange && user) {
            router.replace('/dashboard')
        }
    }, [authLoading, requiresPasswordChange, user, router])

    // Função helper para submeter o form via react-hook-form + server action
    const onSubmit = (evt: React.FormEvent) => {
        evt.preventDefault();
        handleSubmit(() => {
            // Cria um FormData manualmente do formulário HTML
            const formElement = document.querySelector('form') as HTMLFormElement
            if (formElement) {
                // Envia para a server action via startTransition (implícito no formAction do useActionState)
                const formData = new FormData(formElement)
                React.startTransition(() => {
                    formAction(formData)
                })
            }
        })(evt);
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
                <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
            </div>
        )
    }

    // Se não está logado, redireciona para login
    if (!user) {
        router.replace('/login')
        return null
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-amber-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full relative z-10 px-4">
                {/* Header com ícone */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight mb-2">
                        Atualize sua senha
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Por segurança, você precisa criar uma nova senha para continuar.
                    </p>
                </div>

                {/* Card do formulário */}
                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
                    <form
                        onSubmit={onSubmit}
                        className="space-y-5"
                    >
                        {/* Nova Senha */}
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Nova senha
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    {...register('newPassword')}
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={errors.newPassword ? 'true' : 'false'}
                                    aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.newPassword
                                            ? 'border-red-500 dark:border-red-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            {errors.newPassword && (
                                <p id="newPassword-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.newPassword.message}
                                </p>
                            )}
                        </div>

                        {/* Confirmar Senha */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Confirmar nova senha
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    {...register('confirmPassword')}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                                    aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.confirmPassword
                                            ? 'border-red-500 dark:border-red-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    placeholder="Digite novamente"
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm">
                            <p>
                                <strong>Dica:</strong> Use uma senha forte com letras, números e símbolos.
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

                        {/* Botão de submit */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {isPending ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    Atualizar senha
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
