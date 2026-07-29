import { api } from './api-client'
import { BackendEngineType, BackendAuthType, ConnectorListItem } from './connectors-store'

// GET /connectors/{id} returns the same aggregate shape as one item from the list.
export type ConnectorDetail = ConnectorListItem

export interface Module {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string
  kind: 'manual' | 'synced'
  toolCount?: number
  createdAt: string
  updatedAt: string
}

export interface ConnectorApi {
  id: string
  connectorId: string
  groupId: string | null
  name: string
  engineType: BackendEngineType
  baseUrl: string
  authType: BackendAuthType
  specUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ModuleWithApis {
  module: Module
  apis: ConnectorApi[]
}

export interface Tool {
  id: string
  connectorApiId: string
  groupId: string | null
  engineType: BackendEngineType
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description?: string
  parameters?: unknown
  endpointMapping?: Record<string, unknown>
  status: string
  cached: boolean
  cacheTtlSeconds: number
  version: string
  displayOnFrontend: boolean
  createdAt: string
  updatedAt: string
}

// Shape depends on authType — send only the relevant fields. authType itself is
// required even though the fields it selects are optional (omitting it 500s server-side).
export interface CredentialsInput {
  authType: BackendAuthType
  bearerToken?: string
  clientId?: string
  clientSecret?: string
  tokenUrl?: string
  apiKeyHeader?: string
  apiKeyValue?: string
  basicUsername?: string
  basicPassword?: string
  headers?: Record<string, string>
}

export interface CreateApiInput {
  name: string
  engineType: BackendEngineType
  baseUrl: string
  authType: BackendAuthType
  specUrl?: string
  groupId?: string | null
  credentials?: CredentialsInput
}

export interface CreateModuleInput {
  name: string
  description: string
  apis: Omit<CreateApiInput, 'groupId'>[]
}

export interface CreateConnectorInput {
  name: string
  glyph: string
  description: string
  modules: CreateModuleInput[]
}

export interface CreateConnectorResult {
  connector: ConnectorDetail
  modules: ModuleWithApis[]
}

export const connectorApi = {
  get: (id: string) => api.get<ConnectorDetail>(`/connectors/${id}`),
  create: (input: CreateConnectorInput) => api.post<CreateConnectorResult>('/connectors', input),
  patch: (id: string, patch: Partial<{ name: string; description: string; status: string }>) =>
    api.patch<ConnectorDetail>(`/connectors/${id}`, patch),
  toggle: (id: string, active: boolean) => api.post<ConnectorDetail>(`/connectors/${id}/toggle`, { active }),
  healthCheck: (id: string) => api.post<ConnectorDetail>(`/connectors/${id}/health-check`),
  delete: (id: string) => api.delete<void>(`/connectors/${id}`),

  listModules: (connectorId: string) => api.get<ModuleWithApis[]>(`/connectors/${connectorId}/modules`),
  createModule: (connectorId: string, input: CreateModuleInput) =>
    api.post<ModuleWithApis>(`/connectors/${connectorId}/modules`, input),

  listApis: (connectorId: string) => api.get<ConnectorApi[]>(`/connectors/${connectorId}/apis`),
  createApi: (connectorId: string, input: CreateApiInput) => api.post<ConnectorApi>(`/connectors/${connectorId}/apis`, input),
  patchApi: (
    connectorId: string,
    apiId: string,
    patch: Partial<{ name: string; baseUrl: string; authType: BackendAuthType; isActive: boolean; groupId: string | null }>,
  ) => api.patch<ConnectorApi>(`/connectors/${connectorId}/apis/${apiId}`, patch),
  putCredentials: (connectorId: string, apiId: string, input: CredentialsInput) =>
    api.put<void>(`/connectors/${connectorId}/apis/${apiId}/credentials`, input),

  listTools: (connectorId: string, apiId?: string) =>
    api.get<Tool[]>(`/connectors/${connectorId}/tools${apiId ? `?apiId=${apiId}` : ''}`),
  createTool: (
    connectorId: string,
    apiId: string,
    input: {
      name: string
      method: string
      path: string
      description?: string
      parameters?: unknown
      endpointMapping?: Record<string, unknown>
      groupId?: string | null
    },
  ) => api.post<Tool>(`/connectors/${connectorId}/tools?apiId=${apiId}`, input),
  patchTool: (
    connectorId: string,
    toolId: string,
    patch: Partial<{
      name: string
      method: string
      path: string
      description: string
      parameters: unknown
      endpointMapping: Record<string, unknown>
      cacheTtlSeconds: number
      groupId: string | null
    }>,
  ) => api.patch<Tool>(`/connectors/${connectorId}/tools/${toolId}`, patch),
  deleteTool: (connectorId: string, toolId: string) => api.delete<void>(`/connectors/${connectorId}/tools/${toolId}`),
  runTool: (connectorId: string, toolId: string, input: unknown) =>
    api.post<unknown>(`/connectors/${connectorId}/tools/${toolId}/run`, input),
}

export const ENGINE_TYPE_OPTIONS: { value: BackendEngineType; label: string; desc: string }[] = [
  { value: 'REST', label: 'REST API', desc: 'OpenAPI / Swagger or manual endpoints' },
  { value: 'GRAPHQL', label: 'GraphQL', desc: 'Schema introspection over HTTP' },
  { value: 'SOAP', label: 'SOAP / XML', desc: 'WSDL-described legacy services' },
]

export const AUTH_TYPE_OPTIONS: { value: BackendAuthType; label: string }[] = [
  { value: 'oauth2', label: 'OAuth2' },
  { value: 'bearer', label: 'Bearer' },
  { value: 'api_key', label: 'API Key' },
  { value: 'basic', label: 'Basic' },
  { value: 'none', label: 'None' },
]
