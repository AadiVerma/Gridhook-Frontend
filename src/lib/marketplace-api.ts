import { api } from './api-client'
import { BackendEngineType, BackendAuthType } from './connectors-store'
import { ConnectorDetail, ConnectorApi, Tool } from './connector-api'

export type TemplateCategory =
  | 'crm'
  | 'dev_tools'
  | 'payments'
  | 'communications'
  | 'database'
  | 'productivity'
  | 'erp'
  | 'support'
  | 'hr'
  | 'commerce'

export interface AdapterTemplate {
  id: string
  key: string
  name: string
  glyph?: string
  category: TemplateCategory
  description: string
  engineType: BackendEngineType
  authType: BackendAuthType
  baseUrl: string
  toolCount: number
  installCount: number
  createdAt: string
  updatedAt: string
}

export interface InstallTemplateResult {
  connector: ConnectorDetail
  api: ConnectorApi
  tools: Tool[]
}

// The pre-install preview — nothing is persisted yet, so this has none of MCPTool's
// server-assigned fields (id, connectorApiId, endpointMapping, status, version…).
export interface TemplateToolPreview {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description?: string
  parameters?: unknown
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  crm: 'CRM',
  dev_tools: 'Dev tools',
  payments: 'Payments',
  communications: 'Communications',
  database: 'Database',
  productivity: 'Productivity',
  erp: 'ERP',
  support: 'Support',
  hr: 'HR',
  commerce: 'Commerce',
}

export const marketplaceApi = {
  list: (params?: { category?: string; q?: string }) => {
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.q) qs.set('q', params.q)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return api.get<{ templates: AdapterTemplate[] }>(`/marketplace${suffix}`).then((res) => res.templates)
  },
  get: (key: string) => api.get<AdapterTemplate>(`/marketplace/${key}`),
  previewTools: (key: string) =>
    api.get<{ tools: TemplateToolPreview[] }>(`/marketplace/${key}/tools`).then((res) => res.tools),
  // The key is a stable slug, not the opaque id — it's what identifies the template in the URL.
  install: (key: string, name?: string) =>
    api.post<InstallTemplateResult>(`/marketplace/${key}/install`, name?.trim() ? { name: name.trim() } : {}),
}
