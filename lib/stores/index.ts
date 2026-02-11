/**
 * @fileoverview Stores Zustand para Estado Global
 * 
 * Sistema de gerenciamento de estado otimizado usando Zustand.
 * Separado em mÃºltiplos stores especializados para re-renders seletivos.
 * 
 * @module stores
 * 
 * BenefÃ­cios sobre Context API:
 * - SubscriÃ§Ãµes seletivas (componentes re-renderizam apenas quando seu slice muda)
 * - Sem necessidade de aninhamento de providers
 * - Suporte nativo a devtools
 * - Actions assÃ­ncronos mais simples
 * 
 * Stores disponÃ­veis:
 * - {@link useUIStore} - Estado de UI (sidebar, modais, busca)
 * - {@link useFormStore} - Drafts e submissÃ£o de formulÃ¡rios
 * - {@link useNotificationStore} - Sistema de notificaÃ§Ãµes
 * 
 * @example
 * ```tsx
 * import { useSidebarOpen, useUIStore } from '@/lib/stores';
 * 
 * // Seletor fino - sÃ³ re-renderiza quando sidebar muda
 * const sidebarOpen = useSidebarOpen();
 * 
 * // Acesso a actions
 * const { toggleSidebar, openModal } = useUIStore();
 * ```
 */
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

// ============ UI STATE STORE ============

/**
 * Estado de interface do usuÃ¡rio
 * 
 * @interface UIState
 * @property {boolean} sidebarOpen - Se a sidebar estÃ¡ aberta
 * @property {boolean} aiAssistantOpen - Se o assistente de IA estÃ¡ aberto
 * @property {string | null} activeModal - ID do modal ativo
 * @property {Record<string, unknown>} modalData - Dados passados ao modal
 * @property {string} globalSearchQuery - Query de busca global
 * @property {Record<string, boolean>} loadingStates - Estados de loading por chave
 */
interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // AI Assistant
  aiAssistantOpen: boolean;
  setAIAssistantOpen: (open: boolean) => void;
  toggleAIAssistant: () => void;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown>;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Search
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;

  // Loading states
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
}

/**
 * Store de estado de UI
 * 
 * Gerencia estado efÃªmero de interface como sidebar, modais e busca.
 * NÃ£o persiste entre sessÃµes.
 * 
 * @example
 * ```tsx
 * // Usando diretamente
 * const { sidebarOpen, toggleSidebar } = useUIStore();
 * 
 * // Ou com seletores para performance
 * const sidebarOpen = useUIStore(state => state.sidebarOpen);
 * ```
 */
export const useUIStore = create<UIState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      // AI Assistant
      aiAssistantOpen: false,
      setAIAssistantOpen: open => set({ aiAssistantOpen: open }),
      toggleAIAssistant: () => set(state => ({ aiAssistantOpen: !state.aiAssistantOpen })),

      // Modals
      activeModal: null,
      modalData: {},
      openModal: (modalId, data = {}) => set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: {} }),

      // Search
      globalSearchQuery: '',
      setGlobalSearchQuery: query => set({ globalSearchQuery: query }),

      // Loading states
      loadingStates: {},
      setLoading: (key, loading) =>
        set(state => ({
          loadingStates: { ...state.loadingStates, [key]: loading },
        })),
      isLoading: key => get().loadingStates[key] ?? false,
    })),
    { name: 'ui-store' }
  )
);

// ============ FORM STATE STORE ============

/**
 * Rascunho de formulÃ¡rio salvo
 * 
 * @interface FormDraft
 * @property {Record<string, unknown>} data - Dados do formulÃ¡rio
 * @property {number} savedAt - Timestamp do Ãºltimo salvamento
 */
interface FormDraft {
  data: Record<string, unknown>;
  savedAt: number;
}

/**
 * Estado de formulÃ¡rios
 * 
 * @interface FormState
 */
interface FormState {
  /** Rascunhos salvos por formId */
  drafts: Record<string, FormDraft>;
  /** Salva rascunho de formulÃ¡rio */
  saveDraft: (formId: string, data: Record<string, unknown>) => void;
  /** Recupera rascunho existente */
  getDraft: (formId: string) => FormDraft | null;
  /** Limpa rascunho especÃ­fico */
  clearDraft: (formId: string) => void;
  /** Limpa todos os rascunhos */
  clearAllDrafts: () => void;
  /** Status de submissÃ£o por formulÃ¡rio */
  submitting: Record<string, boolean>;
  /** Define status de submissÃ£o */
  setSubmitting: (formId: string, submitting: boolean) => void;
  /** Verifica se estÃ¡ submetendo */
  isSubmitting: (formId: string) => boolean;
}

/**
 * Store de formulÃ¡rios com persistÃªncia
 * 
 * Gerencia rascunhos de formulÃ¡rios e estados de submissÃ£o.
 * Rascunhos sÃ£o persistidos em localStorage para recuperaÃ§Ã£o.
 * 
 * @example
 * ```tsx
 * const { saveDraft, getDraft, isSubmitting } = useFormStore();
 * 
 * // Auto-save em onChange
 * const handleChange = (data) => {
 *   setFormData(data);
 *   saveDraft('deal-form', data);
 * };
 * ```
 */
export const useFormStore = create<FormState>()(
  devtools(
    persist(
      (set, get) => ({
        // Drafts
        drafts: {},
        saveDraft: (formId, data) =>
          set(state => ({
            drafts: {
              ...state.drafts,
              [formId]: { data, savedAt: Date.now() },
            },
          })),
        getDraft: formId => get().drafts[formId] ?? null,
        clearDraft: formId =>
          set(state => {
            const drafts = { ...state.drafts };
            delete drafts[formId];
            return { drafts };
          }),
        clearAllDrafts: () => set({ drafts: {} }),

        // Submission
        submitting: {},
        setSubmitting: (formId, submitting) =>
          set(state => ({
            submitting: { ...state.submitting, [formId]: submitting },
          })),
        isSubmitting: formId => get().submitting[formId] ?? false,
      }),
      {
        name: 'form-drafts',
        partialize: state => ({ drafts: state.drafts }), // Only persist drafts
      }
    ),
    { name: 'form-store' }
  )
);

// ============ NOTIFICATIONS STORE ============

/**
 * NotificaÃ§Ã£o do sistema
 * 
 * @interface Notification
 * @property {string} id - UUID Ãºnico da notificaÃ§Ã£o
 * @property {'success' | 'error' | 'warning' | 'info'} type - Tipo visual
 * @property {string} title - TÃ­tulo da notificaÃ§Ã£o
 * @property {string} [message] - Mensagem detalhada opcional
 * @property {number} [duration] - DuraÃ§Ã£o em ms (0 = persistente)
 * @property {Object} [action] - AÃ§Ã£o clicÃ¡vel opcional
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Estado de notificaÃ§Ãµes
 * @interface NotificationState
 */
interface NotificationState {
  /** Lista de notificaÃ§Ãµes ativas */
  notifications: Notification[];
  /** Adiciona notificaÃ§Ã£o e retorna seu ID */
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  /** Remove notificaÃ§Ã£o por ID */
  removeNotification: (id: string) => void;
  /** Limpa todas as notificaÃ§Ãµes */
  clearAll: () => void;
}

/**
 * Store de notificaÃ§Ãµes com auto-dismiss
 * 
 * Gerencia notificaÃ§Ãµes toast com remoÃ§Ã£o automÃ¡tica apÃ³s duraÃ§Ã£o.
 * 
 * @example
 * ```tsx
 * const { addNotification } = useNotificationStore();
 * 
 * addNotification({
 *   type: 'success',
 *   title: 'Salvo!',
 *   message: 'Deal atualizado com sucesso',
 *   duration: 3000
 * });
 * ```
 */
export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],

      addNotification: notification => {
        const id = crypto.randomUUID();
        set(state => ({
          notifications: [...state.notifications, { ...notification, id }],
        }));

        // Auto-remove after duration
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }

        return id;
      },

      removeNotification: id =>
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    { name: 'notification-store' }
  )
);

// ============ SELECTOR HOOKS ============
// Seletores de granulaÃ§Ã£o fina para performance Ã³tima de re-render

/** @returns {boolean} Se a sidebar estÃ¡ aberta */
export const useSidebarOpen = () => useUIStore(state => state.sidebarOpen);
/** @returns {boolean} Se o assistente de IA estÃ¡ aberto */
export const useAIAssistantOpen = () => useUIStore(state => state.aiAssistantOpen);
/** @returns {string | null} ID do modal ativo */
export const useActiveModal = () => useUIStore(state => state.activeModal);
/** @returns {Record<string, unknown>} Dados do modal ativo */
export const useModalData = () => useUIStore(state => state.modalData);
/** @returns {string} Query de busca global */
export const useGlobalSearch = () => useUIStore(state => state.globalSearchQuery);

/** @returns {FormDraft | null} Rascunho do formulÃ¡rio especificado */
export const useFormDraft = (formId: string) => useFormStore(state => state.drafts[formId] ?? null);
/** @returns {boolean} Se o formulÃ¡rio estÃ¡ sendo submetido */
export const useIsFormSubmitting = (formId: string) =>
  useFormStore(state => state.submitting[formId] ?? false);

/** @returns {Notification[]} Lista de notificaÃ§Ãµes ativas */
export const useNotifications = () => useNotificationStore(state => state.notifications);

// ============ HELPER HOOKS ============

/**
 * Hook para auto-save de rascunhos de formulÃ¡rio
 * 
 * Salva automaticamente os dados do formulÃ¡rio apÃ³s perÃ­odo de debounce.
 * 
 * @param {string} formId - Identificador Ãºnico do formulÃ¡rio
 * @param {Record<string, unknown>} data - Dados atuais do formulÃ¡rio
 * @param {number} [debounceMs=1000] - Delay em ms antes de salvar
 * 
 * @example
 * ```tsx
 * function DealForm() {
 *   const [formData, setFormData] = useState({});
 *   
 *   // Salva automaticamente apÃ³s 1s sem alteraÃ§Ãµes
 *   useFormDraftAutoSave('deal-form', formData);
 *   
 *   return <form>...</form>;
 * }
 * ```
 */
export const useFormDraftAutoSave = (
  formId: string,
  data: Record<string, unknown>,
  debounceMs = 1000
) => {
  const saveDraft = useFormStore(state => state.saveDraft);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(data).length > 0) {
        saveDraft(formId, data);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [formId, data, debounceMs, saveDraft]);
};

// Import React for the hook above
import React from 'react';
