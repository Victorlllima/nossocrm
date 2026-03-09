/**
 * @fileoverview Contexto de AutenticaÃ§Ã£o
 * 
 * Provider React que gerencia autenticaÃ§Ã£o Supabase e perfil do usuÃ¡rio.
 * Fornece sessÃ£o, usuÃ¡rio, perfil e organizationId para toda a aplicaÃ§Ã£o.
 * 
 * @module context/AuthContext
 * 
 * @example
 * ```tsx
 * // No App.tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * 
 * // Em qualquer componente
 * function UserInfo() {
 *   const { user, profile, organizationId, signOut } = useAuth();
 *   
 *   return (
 *     <div>
 *       <span>{profile?.first_name}</span>
 *       <button onClick={signOut}>Sair</button>
 *     </div>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { OrganizationId } from '../types';

/**
 * Perfil do usuÃ¡rio no sistema
 * 
 * @interface Profile
 * @property {string} id - UUID do usuÃ¡rio (= auth.users.id)
 * @property {string} email - Email do usuÃ¡rio
 * @property {OrganizationId} organization_id - ID da organizaÃ§Ã£o (tenant)
 * @property {'admin' | 'vendedor'} role - Papel do usuÃ¡rio
 * @property {string | null} [first_name] - Primeiro nome
 * @property {string | null} [last_name] - Sobrenome
 * @property {string | null} [nickname] - Apelido
 * @property {string | null} [phone] - Telefone
 * @property {string | null} [avatar_url] - URL do avatar
 * @property {string} [created_at] - Data de criaÃ§Ã£o
 */
interface Profile {
    id: string;
    email: string;
    organization_id: OrganizationId;
    role: 'admin' | 'vendedor';
    first_name?: string | null;
    last_name?: string | null;
    nickname?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    created_at?: string;
    /** Se TRUE, usuÃ¡rio deve trocar a senha antes de acessar o sistema */
    must_change_password?: boolean;
}

/**
 * Tipo do contexto de autenticaÃ§Ã£o
 * 
 * @interface AuthContextType
 */
interface AuthContextType {
    /** SessÃ£o Supabase ativa */
    session: Session | null;
    /** UsuÃ¡rio Supabase autenticado */
    user: User | null;
    /** Perfil do usuÃ¡rio com dados da organizaÃ§Ã£o */
    profile: Profile | null;
    /** Getter de conveniÃªncia para profile.organization_id */
    organizationId: OrganizationId | null;
    /** Se estÃ¡ carregando dados iniciais */
    loading: boolean;
    /** Se a instÃ¢ncia foi inicializada (setup feito) */
    isInitialized: boolean | null;
    /** Se o usuÃ¡rio precisa completar o onboarding (tem user mas nÃ£o tem org) */
    needsOnboarding: boolean;
    /** Se o usuÃ¡rio precisa trocar a senha (must_change_password = true) */
    requiresPasswordChange: boolean;
    /** Verifica se instÃ¢ncia foi inicializada */
    checkInitialization: () => Promise<void>;
    /** Faz logout do usuÃ¡rio */
    signOut: () => Promise<void>;
    /** Recarrega dados do perfil */
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider de autenticaÃ§Ã£o
 * 
 * Gerencia sessÃ£o Supabase e mantÃ©m perfil do usuÃ¡rio sincronizado.
 * Escuta mudanÃ§as de estado de autenticaÃ§Ã£o automaticamente.
 * 
 * @param {Object} props - Props do componente
 * @param {React.ReactNode} props.children - Componentes filhos
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes>...</Routes>
 *       </Router>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

    // Supabase client pode ser null quando envs nÃ£o estÃ£o configuradas.
    // O app real exige Supabase configurado, mas este guard evita falha no build.
    const sb = supabase;

    const checkInitialization = async () => {
        try {
            if (!sb) {
                setIsInitialized(true);
                return;
            }

            const { data, error } = await sb.rpc('is_instance_initialized');
            if (error) throw error;
            setIsInitialized(data);
        } catch (error) {
            console.error('Error checking initialization:', error);
            setIsInitialized(true);
        }
    };

    const fetchProfile = async (userId: string) => {
        try {
            if (!sb) {
                setProfile(null);
                return;
            }

            const { data, error } = await sb
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        // BYPASS: Se DEV_MODE estiver ativo, fazer login automatico com credenciais dev
        if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && sb) {
            console.log('[AuthContext] DEV_MODE: iniciando sessao automatica...');

            const doDevLogin = async () => {
                // Reutilizar sessao ativa se existir
                const { data: { session: existingSession } } = await sb.auth.getSession();
                if (existingSession?.user) {
                    setSession(existingSession);
                    setUser(existingSession.user);
                    await fetchProfile(existingSession.user.id);
                    setIsInitialized(true);
                    return;
                }

                const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL || 'victorlllima@gmail.com';
                const devPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD || '';

                const { data, error } = await sb.auth.signInWithPassword({ email: devEmail, password: devPassword });
                if (error) {
                    console.error('[AuthContext] DEV_MODE login error:', error.message);
                    setLoading(false);
                    return;
                }

                setSession(data.session);
                setUser(data.user);
                await fetchProfile(data.user.id);
                setIsInitialized(true);
            };

            doDevLogin();
            return;
        }

        if (!sb) {
            // Sem Supabase configurado: mantÃ©m app em estado "deslogado".
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsInitialized(true);
            setLoading(false);
            return;
        }

        checkInitialization();

        sb.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        if (sb) await sb.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    // Calcula se precisa de onboarding
    const needsOnboarding = !loading && !!user && !profile?.organization_id;

    // Calcula se precisa trocar a senha
    const requiresPasswordChange = !loading && !!user && !!profile?.must_change_password;

    const value = {
        session,
        user,
        profile,
        organizationId: profile?.organization_id ?? null,
        loading,
        isInitialized,
        needsOnboarding,
        requiresPasswordChange,
        checkInitialization,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook para acessar contexto de autenticaÃ§Ã£o
 * 
 * Fornece acesso ao usuÃ¡rio autenticado, perfil e funÃ§Ãµes de auth.
 * Deve ser usado dentro de um AuthProvider.
 * 
 * @returns {AuthContextType} Contexto de autenticaÃ§Ã£o
 * @throws {Error} Se usado fora do AuthProvider
 * 
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const { user, profile, organizationId, loading, signOut } = useAuth();
 *   
 *   if (loading) return <Spinner />;
 *   if (!user) return <Navigate to="/login" />;
 *   
 *   return (
 *     <div>
 *       OlÃ¡, {profile?.first_name}!
 *       Org: {organizationId}
 *     </div>
 *   );
 * }
 * ```
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
