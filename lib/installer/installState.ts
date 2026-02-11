/**
 * Sistema de estado persistente para instalaÃ§Ã£o resumÃ­vel.
 * Salva progresso em localStorage para permitir retomar em caso de falha.
 */

export interface InstallStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount?: number;
}

export interface InstallState {
  version: number;
  sessionId: string;
  startedAt: number;
  lastUpdatedAt: number;
  currentStep: string | null;
  steps: InstallStep[];
  config: {
    vercelProjectId?: string;
    supabaseProjectRef?: string;
    supabaseUrl?: string;
    adminEmail?: string;
  };
  completedSuccessfully: boolean;
  error?: string;
}

const STORAGE_KEY = 'nossocrm_install_state';
const STATE_VERSION = 1;
const MAX_RETRY_COUNT = 3;

/**
 * Gera um ID de sessÃ£o Ãºnico
 */
function generateSessionId(): string {
  return `install_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Carrega o estado da instalaÃ§Ã£o do localStorage
 */
export function loadInstallState(): InstallState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const state = JSON.parse(raw) as InstallState;
    
    // Verifica versÃ£o do estado
    if (state.version !== STATE_VERSION) {
      console.log('[installState] State version mismatch, clearing');
      clearInstallState();
      return null;
    }
    
    // Verifica se o estado Ã© muito antigo (mais de 1 hora)
    const ageMs = Date.now() - state.lastUpdatedAt;
    if (ageMs > 60 * 60 * 1000) {
      console.log('[installState] State too old, clearing');
      clearInstallState();
      return null;
    }
    
    return state;
  } catch (err) {
    console.error('[installState] Failed to load state:', err);
    return null;
  }
}

/**
 * Salva o estado da instalaÃ§Ã£o no localStorage
 */
export function saveInstallState(state: InstallState): void {
  if (typeof window === 'undefined') return;
  
  try {
    state.lastUpdatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[installState] Failed to save state:', err);
  }
}

/**
 * Limpa o estado da instalaÃ§Ã£o
 */
export function clearInstallState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Cria um novo estado de instalaÃ§Ã£o
 */
export function createInstallState(config: InstallState['config']): InstallState {
  const defaultSteps: InstallStep[] = [
    { id: 'health_check', name: 'AnÃ¡lise do destino', status: 'pending' },
    { id: 'resolve_keys', name: 'CalibraÃ§Ã£o de coordenadas', status: 'pending' },
    { id: 'setup_envs', name: 'ConfiguraÃ§Ã£o de ambiente', status: 'pending' },
    { id: 'wait_project', name: 'Aguardando sinal', status: 'pending' },
    { id: 'migrations', name: 'ConstruÃ§Ã£o da estaÃ§Ã£o', status: 'pending' },
    { id: 'edge_functions', name: 'AtivaÃ§Ã£o de comunicadores', status: 'pending' },
    { id: 'bootstrap', name: 'Primeiro contato', status: 'pending' },
    { id: 'redeploy', name: 'PreparaÃ§Ã£o do pouso', status: 'pending' },
  ];

  return {
    version: STATE_VERSION,
    sessionId: generateSessionId(),
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    currentStep: null,
    steps: defaultSteps,
    config,
    completedSuccessfully: false,
  };
}

/**
 * Atualiza o status de um passo
 */
export function updateStepStatus(
  state: InstallState,
  stepId: string,
  status: InstallStep['status'],
  error?: string
): InstallState {
  const newState = { ...state };
  const stepIndex = newState.steps.findIndex(s => s.id === stepId);
  
  if (stepIndex === -1) {
    console.warn('[installState] Step not found:', stepId);
    return state;
  }
  
  const step = { ...newState.steps[stepIndex] };
  step.status = status;
  
  if (status === 'running') {
    step.startedAt = Date.now();
    newState.currentStep = stepId;
  } else if (status === 'completed' || status === 'skipped') {
    step.completedAt = Date.now();
  } else if (status === 'failed') {
    step.error = error;
    step.retryCount = (step.retryCount || 0) + 1;
    newState.error = error;
  }
  
  newState.steps[stepIndex] = step;
  saveInstallState(newState);
  
  return newState;
}

/**
 * Marca um passo como pulado
 */
export function skipStep(state: InstallState, stepId: string): InstallState {
  return updateStepStatus(state, stepId, 'skipped');
}

/**
 * Verifica se um passo pode ser retentado
 */
export function canRetryStep(state: InstallState, stepId: string): boolean {
  const step = state.steps.find(s => s.id === stepId);
  if (!step) return false;
  return (step.retryCount || 0) < MAX_RETRY_COUNT;
}

/**
 * ObtÃ©m o prÃ³ximo passo pendente
 */
export function getNextPendingStep(state: InstallState): InstallStep | null {
  return state.steps.find(s => s.status === 'pending') || null;
}

/**
 * ObtÃ©m o Ãºltimo passo que falhou (para retry)
 */
export function getLastFailedStep(state: InstallState): InstallStep | null {
  return state.steps.find(s => s.status === 'failed') || null;
}

/**
 * Verifica se a instalaÃ§Ã£o pode ser resumida
 */
export function canResumeInstallation(state: InstallState | null): boolean {
  if (!state) return false;
  if (state.completedSuccessfully) return false;
  
  // Pode resumir se tem passos pendentes ou falhos que podem ser retentados
  const hasPending = state.steps.some(s => s.status === 'pending');
  const hasRetryableFailed = state.steps.some(
    s => s.status === 'failed' && (s.retryCount || 0) < MAX_RETRY_COUNT
  );
  
  return hasPending || hasRetryableFailed;
}

/**
 * ObtÃ©m um resumo do progresso
 */
export function getProgressSummary(state: InstallState): {
  completed: number;
  total: number;
  percentage: number;
  currentStepName: string | null;
} {
  const completed = state.steps.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  ).length;
  const total = state.steps.length;
  const percentage = Math.round((completed / total) * 100);
  
  const currentStep = state.steps.find(s => s.id === state.currentStep);
  
  return {
    completed,
    total,
    percentage,
    currentStepName: currentStep?.name || null,
  };
}

/**
 * Marca a instalaÃ§Ã£o como completa
 */
export function markInstallationComplete(state: InstallState): InstallState {
  const newState = {
    ...state,
    completedSuccessfully: true,
    currentStep: null,
  };
  saveInstallState(newState);
  return newState;
}

/**
 * ObtÃ©m os passos completados para possÃ­vel rollback
 */
export function getCompletedStepsForRollback(state: InstallState): InstallStep[] {
  return state.steps.filter(s => s.status === 'completed').reverse();
}
