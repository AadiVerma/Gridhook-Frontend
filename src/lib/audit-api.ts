import { api } from './api-client'

export type InvocationStatus = 'success' | 'error' | 'timeout'

/**
 * One tool invocation. Note the JSON keys don't match the column names: `tool` is tool_id,
 * `connector` is connector_id, `server` is mcp_server_id, `code` is http_code, `time` is
 * created_at — and the three id fields are opaque ids, NOT names.
 */
export interface AuditLogEntry {
  id: string
  tool: string
  connector: string
  connectorApiId: string
  /** null for invocations that didn't come through an MCP server (e.g. a control-plane test run). */
  server: string | null
  status: InvocationStatus
  code: number
  durationMs: number
  /** Opaque user/vendor payloads — not id-translated, and arbitrary JSON rather than strings. */
  input?: unknown
  output?: unknown
  /** Omitted when empty. */
  error?: string
  time: string
}

export interface Paginated<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

export interface AuditFilter {
  status?: InvocationStatus
  connector?: string
  server?: string
  tool?: string
  /** RFC3339. An unparseable value is silently ignored server-side, so validate before sending. */
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

function toQuery(filter: AuditFilter) {
  const query = new URLSearchParams()
  if (filter.status) query.set('status', filter.status)
  if (filter.connector) query.set('connector', filter.connector)
  if (filter.server) query.set('server', filter.server)
  if (filter.tool) query.set('tool', filter.tool)
  if (filter.from) query.set('from', filter.from)
  if (filter.to) query.set('to', filter.to)
  if (filter.page) query.set('page', String(filter.page))
  // Out-of-range pageSize falls back to 50 server-side rather than clamping to the 200 max.
  if (filter.pageSize) query.set('pageSize', String(filter.pageSize))
  return query.toString()
}

export const auditApi = {
  list: (filter: AuditFilter = {}) => {
    const query = toQuery(filter)
    return api.get<Paginated<AuditLogEntry>>(`/audit-logs${query ? `?${query}` : ''}`)
  },

  get: (id: string) => api.get<AuditLogEntry>(`/audit-logs/${id}`),

  exportCsv: (filter: AuditFilter = {}) => {
    const query = toQuery({ ...filter, page: undefined, pageSize: undefined })
    return api.getBlob(`/audit-logs/export${query ? `?${query}` : ''}`)
  },
}

/** `input`/`output` are arbitrary JSON; render them as pretty-printed text. */
export function formatPayload(value: unknown) {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
