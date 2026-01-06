'use client'

import React, { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Lock, UserPlus, CheckCircle, ArrowRight } from 'lucide-react'
import { signup, signupFormSchema, type SignupFormData, type SignupState } from '@/features/auth'

/**
 * Página de cadastro de usuário
 * Usa Server Actions com React Hook Form para validação client-side
 */
export default function SignupPage() {
    const [state, formAction, isPending] = useActionState<SignupState | null, FormData>(
        signup,
        null
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupFormSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
        },
    })

    // Sincroniza erros do servidor com o formulário
    useEffect(() => {
        if (state?.errors) {
            if (state.errors.email) {
                setError('email', { message: state.errors.email[0] })
            }
            if (state.errors.password) {
                setError('password', { message: state.errors.password[0] })
            }
            if (state.errors.confirmPassword) {
                setError('confirmPassword', { message: state.errors.confirmPassword[0] })
            }
        }
    }, [state?.errors, setError])

    // Se cadastro foi bem sucedido, mostra mensagem de verificação de email
    if (state?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-green-500/20 rounded-full blur-[120px]" />
                    <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-md w-full relative z-10 px-4">
                    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur-sm text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight mb-2">
                            Verifique seu email
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Enviamos um link de confirmação para o seu email.
                            Clique no link para ativar sua conta.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                        >
                            Voltar para o login
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full relative z-10 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight mb-2">
                        Crie sua conta
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Comece a usar o Max Lima gratuitamente.
                    </p>
                </div>

                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
                    <form
                        action={formAction}
                        onSubmit={handleSubmit(() => {
                            // Submete via Server Action
                            const form = document.querySelector('form') as HTMLFormElement
                            if (form) {
                                const formData = new FormData(form)
                                formAction(formData)
                            }
                        })}
                        className="space-y-5"
                    >
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    {...register('email')}
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    aria-invalid={errors.email ? 'true' : 'false'}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.email
                                            ? 'border-red-500 dark:border-red-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    placeholder="seu@email.com"
                                />
                            </div>
                            {errors.email && (
                                <p id="email-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Senha */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Senha
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    {...register('password')}
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={errors.password ? 'true' : 'false'}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.password
                                            ? 'border-red-500 dark:border-red-500'
                                            : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            {errors.password && (
                                <p id="password-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Confirmar Senha */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Confirmar senha
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
                                    placeholder="Digite a senha novamente"
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {/* Erro geral do servidor */}
                        {state?.message && !state.success && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center"
                            >
                                {state.message}
                            </div>
                        )}

                        {/* Botão de submissão */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {isPending ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Criar conta
                                </>
                            )}
                        </button>
                    </form>

                    {/* Link para login */}
                    <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Já tem uma conta?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors"
                        >
                            Faça login
                        </Link>
                    </p>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    &copy; {new Date().getFullYear()} Max Lima CRM. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
