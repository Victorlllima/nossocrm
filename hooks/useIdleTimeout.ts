/**
 * @fileoverview Hook de Timeout por Inatividade
 * 
 * Hook de seguranÃ§a que automaticamente faz logout do usuÃ¡rio
 * apÃ³s perÃ­odo de inatividade, protegendo contra sessÃµes abandonadas.
 * 
 * @module hooks/useIdleTimeout
 * 
 * Funcionalidades:
 * - DetecÃ§Ã£o de atividade (mouse, teclado, scroll, touch)
 * - Alerta antes do logout automÃ¡tico
 * - VerificaÃ§Ã£o ao retornar Ã  aba
 * - PersistÃªncia do motivo de logout
 * 
 * @example
 * ```tsx
 * function App() {
 *   useIdleTimeout({
 *     timeout: 30 * 60 * 1000, // 30 minutos
 *     warningTime: 5 * 60 * 1000, // Aviso 5 min antes
 *     onWarning: () => toast.warning('SessÃ£o expirando...'),
 *     onTimeout: () => toast.info('SessÃ£o expirada'),
 *   });
 *   
 *   return <MainApp />;
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * OpÃ§Ãµes de configuraÃ§Ã£o do hook de idle timeout
 * 
 * @interface UseIdleTimeoutOptions
 * @property {number} [timeout=1800000] - Tempo em ms atÃ© logout (padrÃ£o: 30 min)
 * @property {number} [warningTime=300000] - Tempo em ms antes do logout para aviso (padrÃ£o: 5 min)
 * @property {() => void} [onWarning] - Callback ao exibir aviso
 * @property {() => void} [onTimeout] - Callback antes do logout
 * @property {string[]} [events] - Eventos DOM que resetam o timer
 * @property {boolean} [enabled=true] - Se o hook estÃ¡ ativo
 */
interface UseIdleTimeoutOptions {
  timeout?: number;
  warningTime?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
  events?: string[];
  enabled?: boolean;
}

/** Timeout padrÃ£o: 30 minutos */
const DEFAULT_TIMEOUT = 30 * 60 * 1000;
/** Tempo de aviso padrÃ£o: 5 minutos antes */
const DEFAULT_WARNING_TIME = 5 * 60 * 1000;
/** Eventos padrÃ£o que indicam atividade */
const DEFAULT_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'focus',
];

/**
 * Hook para logout automÃ¡tico por inatividade
 * 
 * Monitora atividade do usuÃ¡rio e executa logout automÃ¡tico apÃ³s
 * perÃ­odo configurado sem interaÃ§Ã£o. Inclui aviso prÃ©vio opcional.
 * 
 * @param {UseIdleTimeoutOptions} options - ConfiguraÃ§Ãµes do timeout
 * @returns {Object} FunÃ§Ãµes de controle do timer
 * @returns {() => void} return.resetTimer - Reseta manualmente o timer
 * @returns {() => number} return.getRemainingTime - Retorna tempo restante em ms
 * @returns {() => boolean} return.isWarningShown - Se o aviso foi exibido
 * @returns {() => Promise<void>} return.forceLogout - ForÃ§a logout imediato
 * 
 * @example
 * ```tsx
 * function IdleWarningModal() {
 *   const [showWarning, setShowWarning] = useState(false);
 *   
 *   const { resetTimer, getRemainingTime } = useIdleTimeout({
 *     onWarning: () => setShowWarning(true),
 *   });
 *   
 *   return showWarning ? (
 *     <Modal>
 *       <p>SessÃ£o expira em {Math.floor(getRemainingTime() / 1000)}s</p>
 *       <button onClick={() => { resetTimer(); setShowWarning(false); }}>
 *         Continuar
 *       </button>
 *     </Modal>
 *   ) : null;
 * }
 * ```
 */
export function useIdleTimeout(options: UseIdleTimeoutOptions = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    warningTime = DEFAULT_WARNING_TIME,
    onWarning,
    onTimeout,
    events = DEFAULT_EVENTS,
    enabled = true,
  } = options;

  const { signOut } = useAuth();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
      warningIdRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    onTimeout?.();
    
    // Store message for login page
    sessionStorage.setItem('logoutReason', 'idle');
    
    await signOut();
  }, [signOut, onTimeout]);

  const handleWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      onWarning?.();
    }
  }, [onWarning]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    clearTimers();

    // Set warning timer
    if (onWarning && warningTime > 0 && warningTime < timeout) {
      warningIdRef.current = setTimeout(handleWarning, timeout - warningTime);
    }

    // Set logout timer
    timeoutIdRef.current = setTimeout(handleLogout, timeout);
  }, [enabled, timeout, warningTime, onWarning, handleWarning, handleLogout, clearTimers]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initial timer setup
    resetTimer();

    // Add event listeners
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also reset on visibility change (user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we've been away too long
        const now = Date.now();
        const elapsed = now - lastActivityRef.current;
        
        if (elapsed >= timeout) {
          handleLogout();
        } else if (elapsed >= timeout - warningTime) {
          handleWarning();
        } else {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimers();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, events, resetTimer, timeout, warningTime, handleLogout, handleWarning, clearTimers]);

  // Return functions to manually control the timer
  return {
    /** Reset the idle timer (call on user activity) */
    resetTimer,
    /** Get time remaining before logout (in ms) */
    getRemainingTime: () => {
      const elapsed = Date.now() - lastActivityRef.current;
      return Math.max(0, timeout - elapsed);
    },
    /** Check if warning has been shown */
    isWarningShown: () => warningShownRef.current,
    /** Force immediate logout */
    forceLogout: handleLogout,
  };
}

export default useIdleTimeout;
