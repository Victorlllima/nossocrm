// Setup especÃ­fico para testes com DOM (React Testing Library, etc.)
// Importa matchers do jest-dom apenas quando existe `document`.

const hasDom = typeof document !== 'undefined'

if (hasDom) {
  // Alguns helpers (ex: @testing-library/user-event) esperam `window`/`navigator`
  // disponÃ­veis na "view" atual.
  const g = globalThis as typeof globalThis & { window?: unknown; navigator?: unknown; IS_REACT_ACT_ENVIRONMENT?: boolean }

  if (typeof g.window === 'undefined') {
    g.window = globalThis
  }

  if (typeof g.navigator === 'undefined') {
    g.navigator = { userAgent: 'vitest' }
  }

  // Top-level await Ã© suportado neste projeto (ESM). Em ambiente node puro, `hasDom` Ã© false.
  await import('@testing-library/jest-dom/vitest')

  // Ajuda a evitar warnings do React sobre act() em alguns cenÃ¡rios.
  g.IS_REACT_ACT_ENVIRONMENT = true
}
