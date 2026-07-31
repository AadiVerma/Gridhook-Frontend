import { api } from './api-client'
import { Module, Tool } from './connector-api'

export type McpServerStatus = 'running' | 'stopped'

// Deliberately omits `connectedClients`: the backend has no connection tracking and
// always sends 0, so keeping it off the type stops the UI implying otherwise.
export interface McpServer {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string
  /** Stored and editable, but consumed by nothing server-side yet (reserved for the MCP `initialize` handshake). */
  customInstructions: string
  status: McpServerStatus
  createdAt: string
  updatedAt: string
  /** Computed per request from MCP_PUBLIC_BASE_URL + slug. This is the URL a client points at. */
  endpoint: string
  /** Derived from the attached groups' tools — read-only. */
  connectorIds: string[]
  /** The actual attachment set. */
  toolGroupIds: string[]
  apiKeyCount: number
}

// POST /mcp-servers builds its response before the enrichment query runs, so the two id
// arrays come back null there and [] on every other endpoint. Normalising here means no
// caller has to remember `?? []`.
type RawMcpServer = Omit<McpServer, 'connectorIds' | 'toolGroupIds'> & {
  connectorIds: string[] | null
  toolGroupIds: string[] | null
}

function normalizeServer(raw: RawMcpServer): McpServer {
  return { ...raw, connectorIds: raw.connectorIds ?? [], toolGroupIds: raw.toolGroupIds ?? [] }
}

/** The backend's tool_groups are the same resource the connector screens call "modules". */
export type ToolGroup = Module

// GET /mcp-servers/{id}/tools returns the resolved union across attached groups, with a few
// presentation fields the per-connector tool list doesn't carry.
export interface McpTool extends Tool {
  responseMapping?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  displayTitle?: string
}

export interface McpServerApiKey {
  id: string
  mcpServerId: string
  label: string
  /** `gh_live_`/`gh_test_` plus the first 6 chars — enough to tell keys apart, not a usable credential. */
  keyPrefix: string
  createdAt: string
  /** Omitted entirely while the key is active. Revoked keys stay in the list. */
  revokedAt?: string
}

export interface CreatedApiKey {
  /** Returned exactly once — only its sha256 is stored, so there is no recovery path. */
  key: string
  meta: McpServerApiKey
}

export interface CreateServerInput {
  name: string
  slug?: string
  description?: string
}

export type UpdateServerInput = Partial<{
  name: string
  description: string
  customInstructions: string
  status: McpServerStatus
}>

export const mcpApi = {
  list: async (params?: { status?: McpServerStatus; q?: string }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.q) query.set('q', params.q)
    const suffix = query.toString() ? `?${query}` : ''
    // Bare array, not paginated.
    const raw = await api.get<RawMcpServer[]>(`/mcp-servers${suffix}`)
    return raw.map(normalizeServer)
  },

  get: async (id: string) => normalizeServer(await api.get<RawMcpServer>(`/mcp-servers/${id}`)),

  create: async (input: CreateServerInput) => normalizeServer(await api.post<RawMcpServer>('/mcp-servers', input)),

  // Also the start/stop route — there is no /start or /stop. `slug` is not updatable.
  update: async (id: string, patch: UpdateServerInput) =>
    normalizeServer(await api.patch<RawMcpServer>(`/mcp-servers/${id}`, patch)),

  setStatus: (id: string, status: McpServerStatus) => mcpApi.update(id, { status }),

  delete: (id: string) => api.delete<void>(`/mcp-servers/${id}`),

  /**
   * Full replace of the attachment set — send the complete desired list, `[]` detaches
   * everything. Returns 204 with no body (unlike the connectors shortcut).
   */
  setToolGroups: (id: string, toolGroupIds: string[]) =>
    api.put<void>(`/mcp-servers/${id}/tool-groups`, { toolGroupIds }),

  /** Exactly what the agent will see. Active tools only — inactive ones are filtered out server-side. */
  listTools: (id: string) => api.get<McpTool[]>(`/mcp-servers/${id}/tools`),

  /** Includes revoked keys (with `revokedAt` set); `apiKeyCount` on the server counts active ones only. */
  listApiKeys: (id: string) => api.get<McpServerApiKey[]>(`/mcp-servers/${id}/api-keys`),

  createApiKey: (id: string, input: { label: string; live: boolean }) =>
    api.post<CreatedApiKey>(`/mcp-servers/${id}/api-keys`, input),

  revokeApiKey: (id: string, keyId: string) => api.delete<void>(`/mcp-servers/${id}/api-keys/${keyId}`),

  /** Populates the attachment picker. Bare array, not paginated. */
  listToolGroups: () => api.get<ToolGroup[]>('/tool-groups'),
}

/**
 * Mirrors the server's slug generation closely enough for a create-time preview. The real
 * value comes back on the create response — treat this as a hint, not a promise.
 */
export function previewSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
