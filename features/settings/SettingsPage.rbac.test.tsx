import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./hooks/useSettingsController', () => ({
  useSettingsController: () => ({
    defaultRoute: '/boards',
    setDefaultRoute: vi.fn(),

    customFieldDefinitions: [],
    newFieldLabel: '',
    setNewFieldLabel: vi.fn(),
    newFieldType: 'text',
    setNewFieldType: vi.fn(),
    newFieldOptions: '',
    setNewFieldOptions: vi.fn(),
    editingId: null,
    startEditingField: vi.fn(),
    cancelEditingField: vi.fn(),
    handleSaveField: vi.fn(),
    removeCustomField: vi.fn(),

    availableTags: ['VIP'],
    newTagName: '',
    setNewTagName: vi.fn(),
    handleAddTag: vi.fn(),
    removeTag: vi.fn(),
  }),
}))

// Evita depender de providers (Toast/Boards/Supabase) ao renderizar a aba IntegraÃ§Ãµes no teste.
vi.mock('./components/ApiKeysSection', () => ({
  ApiKeysSection: () => (
    <div>
      <h3>API (IntegraÃ§Ãµes)</h3>
    </div>
  ),
}))

vi.mock('./components/WebhooksSection', () => ({
  WebhooksSection: () => (
    <div>
      <h3>Webhooks</h3>
    </div>
  ),
}))

vi.mock('./components/McpSection', () => ({
  McpSection: () => (
    <div>
      <h3>MCP</h3>
    </div>
  ),
}))

import SettingsPage from './SettingsPage'
import { useAuth } from '@/context/AuthContext'

const useAuthMock = vi.mocked(useAuth)

describe('SettingsPage RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('vendedor nÃ£o vÃª seÃ§Ãµes de configuraÃ§Ã£o do sistema', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'vendedor' },
    } as any)

    render(<SettingsPage />)

    expect(
      screen.queryByRole('heading', { name: /^Gerenciamento de Tags$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /^Campos Personalizados$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /^API \(IntegraÃ§Ãµes\)$/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^Webhooks$/i })).not.toBeInTheDocument()

    // PreferÃªncias pessoais seguem visÃ­veis
    expect(screen.getByText(/pÃ¡gina inicial/i)).toBeInTheDocument()
    // Tabs pessoais seguem visÃ­veis
    expect(screen.getByRole('button', { name: /central de i\.a/i })).toBeInTheDocument()
  })

  it('admin vÃª seÃ§Ãµes de configuraÃ§Ã£o do sistema', async () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'admin' },
    } as any)

    render(<SettingsPage />)

    expect(
      screen.getByRole('heading', { name: /^Gerenciamento de Tags$/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^Campos Personalizados$/i })
    ).toBeInTheDocument()
    // Admin tambÃ©m vÃª as abas extras
    const integrationsTab = screen.getByRole('button', { name: /integraÃ§Ãµes/i })
    expect(integrationsTab).toBeInTheDocument()
    fireEvent.click(integrationsTab)

    // Sub-tabs dentro de IntegraÃ§Ãµes
    const apiSubTab = await screen.findByRole('button', { name: /^API$/i })
    const webhooksSubTab = await screen.findByRole('button', { name: /^Webhooks$/i })
    const mcpSubTab = await screen.findByRole('button', { name: /^MCP$/i })
    expect(apiSubTab).toBeInTheDocument()
    expect(webhooksSubTab).toBeInTheDocument()
    expect(mcpSubTab).toBeInTheDocument()

    // Default Ã© API
    expect(await screen.findByRole('heading', { name: /^API \(IntegraÃ§Ãµes\)$/i })).toBeInTheDocument()

    fireEvent.click(webhooksSubTab)
    expect(await screen.findByRole('heading', { name: /^Webhooks$/i })).toBeInTheDocument()

    fireEvent.click(mcpSubTab)
    expect(await screen.findByRole('heading', { name: /^MCP$/i })).toBeInTheDocument()
  })
})
