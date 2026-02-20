'use client'

import React, { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock, ShieldCheck, ArrowRight } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { updatePassword } from '@/features/auth/actions/update-password'

const updatePasswordFormSchema = z.object({
    newPassword: z
        .string()
        .min(6, 'Senha deve ter no mÃ­nimo 6 caracteres')
        .max(72, 'Senha deve ter no mÃ¡ximo 72 caracteres'),
    confirmPassword: z
        .string()
        .min(1, 'ConfirmaÃ§Ã£o de senha Ã© obrigatÃ³ria'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas nÃ£o coincidem',
    path: ['confirmPassword'],
})

type FormDataValues = z.infer<typeof updatePasswordFormSchema>

export default function UpdatePasswordClient() {
    const router = useRouter()
    const { user, loading: authLoading, requiresPasswordChange, refreshProfile } = useAuth()
    const [state, formAction, isPending] = useActionState(updatePassword, null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<FormDataValues>({
        resolver: zodResolver(updatePasswordFormSchema as any) as any,
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
    })

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

    useEffect(() => {
        if (state?.success) {
            refreshProfile().then(() => {
                router.push('/dashboard')
                router.refresh()
            })
        }
    }, [state?.success, refreshProfile, router])

    useEffect(() => {
        if (!authLoading && !requiresPasswordChange && user) {
            router.replace('/dashboard')
        }
    }, [authLoading, requiresPasswordChange, user, router])

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login')
        }
    }, [authLoading, user, router])

    const onSubmit = (evt: React.FormEvent) => {
        evt.preventDefault();
        handleSubmit(() => {
            const formElement = document.querySelector('form') as HTMLFormElement
            if (formElement) {
                const formData = new FormData(formElement)
                React.startTransition(() => {
                    formAction(formData)
                })
            }
        })(evt);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
                <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-amber-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full relative z-10 px-4">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight mb-2">
                        Atualize sua senha
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Por seguranÃ§a, vocÃª precisa criar uma nova senha para continuar.
                    </p>
                </div>

                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
                    <form onSubmit={onSubmit} className="space-y-5">
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
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.newPassword ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="MÃ­nimo 6 caracteres"
                                />
                            </div>
                            {errors.newPassword && <p className="mt-1.5 text-sm text-red-500">{errors.newPassword.message}</p>}
                        </div>

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
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm ${errors.confirmPassword ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="Digite novamente"
                                />
                            </div>
                            {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 transition-all"
                        >
                            {isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Atualizar senha'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
