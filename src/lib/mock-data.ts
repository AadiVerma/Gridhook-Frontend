export type ConnectorType = 'REST' | 'GraphQL' | 'SOAP' | 'Database'
export type AuthType = 'OAuth2' | 'Bearer' | 'API Key' | 'Basic' | 'None'
export type ConnectorStatus = 'active' | 'inactive' | 'error'

export interface Connector {
  id: string
  name: string
  glyph: string
  tint: string
  baseUrl: string
  type: ConnectorType
  authType: AuthType
  toolCount: number
  status: ConnectorStatus
  lastSync: string
  callsToday: number
}

export interface ConnectorTool {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  cached: boolean
}

const resourceNounsByConnector: Record<string, string[]> = {
  con_stripe: ['customer', 'invoice', 'charge', 'refund', 'subscription'],
  con_github: ['repo', 'issue', 'pull_request', 'commit', 'workflow_run'],
  con_postgres: ['orders_table', 'customers_table', 'query'],
  con_hubspot: ['contact', 'deal', 'company', 'ticket'],
  con_zendesk: ['ticket', 'user', 'organization'],
  con_shopify: ['product', 'order', 'customer', 'inventory_item'],
  con_soap_legacy: ['purchase_order', 'shipment'],
  con_slack: ['message', 'channel', 'user'],
  con_snowflake: ['warehouse_query', 'table'],
  con_notion: ['page', 'database', 'block'],
}

const verbsByMethod: { verb: string; method: ConnectorTool['method'] }[] = [
  { verb: 'list', method: 'GET' },
  { verb: 'get', method: 'GET' },
  { verb: 'create', method: 'POST' },
  { verb: 'update', method: 'PUT' },
  { verb: 'delete', method: 'DELETE' },
]

export function toolsForConnector(c: Connector): ConnectorTool[] {
  const nouns = resourceNounsByConnector[c.id] ?? ['record']
  const tools: ConnectorTool[] = []
  for (let i = 0; i < c.toolCount; i++) {
    const noun = nouns[i % nouns.length]
    const { verb, method } = verbsByMethod[i % verbsByMethod.length]
    const path =
      method === 'GET' && verb === 'list'
        ? `/${noun}s`
        : method === 'POST'
          ? `/${noun}s`
          : `/${noun}s/{id}`
    tools.push({
      id: `${c.id}_tool_${i}`,
      name: `${verb}_${noun}`,
      method,
      path,
      cached: method === 'GET' && i % 2 === 0,
    })
  }
  return tools
}

export interface ToolParam {
  name: string
  in: 'path' | 'query' | 'body'
  type: string
  required: boolean
  description: string
}

export function paramsForTool(t: ConnectorTool): ToolParam[] {
  const params: ToolParam[] = []
  const pathParams = [...t.path.matchAll(/{(\w+)}/g)].map((m) => m[1])

  pathParams.forEach((p) =>
    params.push({
      name: p,
      in: 'path',
      type: 'string',
      required: true,
      description: `Unique identifier of the resource to ${t.name.split('_')[0]}.`,
    }),
  )

  if (t.method === 'GET' && pathParams.length === 0) {
    params.push({ name: 'limit', in: 'query', type: 'integer', required: false, description: 'Maximum number of results to return. Defaults to 20.' })
    params.push({ name: 'cursor', in: 'query', type: 'string', required: false, description: 'Opaque pagination cursor from a previous response.' })
  }

  if (t.method === 'POST' || t.method === 'PUT') {
    params.push({ name: 'name', in: 'body', type: 'string', required: t.method === 'POST', description: 'Display name of the resource.' })
    params.push({ name: 'status', in: 'body', type: 'string', required: false, description: 'Lifecycle status, e.g. "active" or "archived".' })
    params.push({ name: 'metadata', in: 'body', type: 'object', required: false, description: 'Arbitrary key/value pairs stored alongside the resource.' })
  }

  return params
}

export function sampleRequestForTool(t: ConnectorTool): Record<string, unknown> {
  if (t.method === 'GET') {
    return t.path.includes('{') ? {} : { limit: 20, cursor: null }
  }
  if (t.method === 'DELETE') return {}
  return { name: 'Example value', status: 'active', metadata: { source: 'mcp' } }
}

export function sampleResponseForTool(t: ConnectorTool): Record<string, unknown> {
  if (t.method === 'DELETE') return { deleted: true, id: 'obj_1a2b3c' }
  if (t.method === 'GET' && !t.path.includes('{')) {
    return { data: [{ id: 'obj_1a2b3c', name: 'Example value', status: 'active' }], has_more: false }
  }
  return { id: 'obj_1a2b3c', name: 'Example value', status: 'active', created_at: '2026-07-25T07:00:00Z' }
}

export const connectors: Connector[] = [
  { id: 'con_stripe', name: 'Stripe Billing', glyph: 'S', tint: 'violet', baseUrl: 'api.stripe.com/v1', type: 'REST', authType: 'Bearer', toolCount: 14, status: 'active', lastSync: '2026-07-25T06:40:00Z', callsToday: 812 },
  { id: 'con_github', name: 'GitHub', glyph: 'GH', tint: 'ink', baseUrl: 'api.github.com', type: 'REST', authType: 'OAuth2', toolCount: 22, status: 'active', lastSync: '2026-07-25T07:10:00Z', callsToday: 1204 },
  { id: 'con_postgres', name: 'Primary Postgres', glyph: 'PG', tint: 'info', baseUrl: 'db.internal:5432', type: 'Database', authType: 'Basic', toolCount: 9, status: 'active', lastSync: '2026-07-25T07:20:00Z', callsToday: 3021 },
  { id: 'con_hubspot', name: 'HubSpot CRM', glyph: 'HS', tint: 'signal', baseUrl: 'api.hubapi.com', type: 'REST', authType: 'OAuth2', toolCount: 18, status: 'active', lastSync: '2026-07-25T05:55:00Z', callsToday: 445 },
  { id: 'con_zendesk', name: 'Zendesk', glyph: 'ZD', tint: 'ok', baseUrl: 'company.zendesk.com/api/v2', type: 'REST', authType: 'API Key', toolCount: 11, status: 'error', lastSync: '2026-07-24T22:15:00Z', callsToday: 0 },
  { id: 'con_shopify', name: 'Shopify Storefront', glyph: 'SF', tint: 'ok', baseUrl: 'shop.myshopify.com/admin/api', type: 'GraphQL', authType: 'API Key', toolCount: 16, status: 'active', lastSync: '2026-07-25T06:58:00Z', callsToday: 267 },
  { id: 'con_soap_legacy', name: 'Legacy ERP', glyph: 'ERP', tint: 'muted', baseUrl: 'erp.corp.local/soap', type: 'SOAP', authType: 'Basic', toolCount: 6, status: 'inactive', lastSync: '2026-07-20T11:02:00Z', callsToday: 0 },
  { id: 'con_slack', name: 'Slack', glyph: 'SL', tint: 'violet', baseUrl: 'slack.com/api', type: 'REST', authType: 'OAuth2', toolCount: 13, status: 'active', lastSync: '2026-07-25T07:22:00Z', callsToday: 598 },
  { id: 'con_snowflake', name: 'Snowflake DW', glyph: 'SN', tint: 'info', baseUrl: 'org-acct.snowflakecomputing.com', type: 'Database', authType: 'OAuth2', toolCount: 7, status: 'active', lastSync: '2026-07-25T04:30:00Z', callsToday: 132 },
  { id: 'con_notion', name: 'Notion', glyph: 'N', tint: 'ink', baseUrl: 'api.notion.com/v1', type: 'REST', authType: 'Bearer', toolCount: 10, status: 'active', lastSync: '2026-07-25T06:10:00Z', callsToday: 341 },
]

export interface MarketplaceAdapter {
  id: string
  name: string
  glyph: string
  tint: string
  category: string
  region: string
  description: string
  toolCount: number
  authType: AuthType
  installs: number
}

export const marketplaceAdapters: MarketplaceAdapter[] = [
  { id: 'mk_salesforce', name: 'Salesforce', glyph: 'SF', tint: 'info', category: 'CRM', region: 'Global', description: 'Full CRUD across leads, opportunities, accounts, and custom objects.', toolCount: 28, authType: 'OAuth2', installs: 18400 },
  { id: 'mk_jira', name: 'Jira', glyph: 'JR', tint: 'info', category: 'Dev Tools', region: 'Global', description: 'Create, transition, and query issues across projects and boards.', toolCount: 19, authType: 'OAuth2', installs: 15200 },
  { id: 'mk_stripe', name: 'Stripe', glyph: 'S', tint: 'violet', category: 'Payments', region: 'Global', description: 'Charges, subscriptions, invoices, and payouts as callable tools.', toolCount: 14, authType: 'Bearer', installs: 22100 },
  { id: 'mk_twilio', name: 'Twilio', glyph: 'TW', tint: 'bad', category: 'Communications', region: 'Global', description: 'Send SMS, place voice calls, and manage phone numbers.', toolCount: 9, authType: 'API Key', installs: 9800 },
  { id: 'mk_postgres', name: 'PostgreSQL', glyph: 'PG', tint: 'info', category: 'Database', region: 'Self-hosted', description: 'Schema-aware SQL tool generation with read/write scoping.', toolCount: 9, authType: 'Basic', installs: 31200 },
  { id: 'mk_gcal', name: 'Google Calendar', glyph: 'GC', tint: 'ok', category: 'Productivity', region: 'Global', description: 'Read and schedule events across shared calendars.', toolCount: 8, authType: 'OAuth2', installs: 26700 },
  { id: 'mk_sap', name: 'SAP OData', glyph: 'SAP', tint: 'warn', category: 'ERP', region: 'EU', description: 'Expose SAP OData services as typed MCP tools.', toolCount: 12, authType: 'Basic', installs: 4100 },
  { id: 'mk_zendesk', name: 'Zendesk', glyph: 'ZD', tint: 'ok', category: 'Support', region: 'Global', description: 'Tickets, macros, and satisfaction ratings as tools.', toolCount: 11, authType: 'API Key', installs: 8300 },
  { id: 'mk_workday', name: 'Workday', glyph: 'WD', tint: 'violet', category: 'HR', region: 'US', description: 'Worker records, time-off, and org-chart lookups.', toolCount: 15, authType: 'OAuth2', installs: 2900 },
  { id: 'mk_mongo', name: 'MongoDB', glyph: 'MG', tint: 'ok', category: 'Database', region: 'Self-hosted', description: 'Collection-aware query and aggregation tool builder.', toolCount: 7, authType: 'Basic', installs: 14600 },
  { id: 'mk_shopify', name: 'Shopify', glyph: 'SF', tint: 'ok', category: 'Commerce', region: 'Global', description: 'Products, orders, and inventory as MCP tools.', toolCount: 16, authType: 'API Key', installs: 11400 },
  { id: 'mk_linear', name: 'Linear', glyph: 'LN', tint: 'violet', category: 'Dev Tools', region: 'Global', description: 'Issues, cycles, and projects with GraphQL under the hood.', toolCount: 13, authType: 'API Key', installs: 7600 },
]

export type McpServerStatus = 'running' | 'stopped'

export interface McpServer {
  id: string
  name: string
  slug: string
  status: McpServerStatus
  connectedClients: number
  endpoint: string
  connectorIds: string[]
  apiKeyCount: number
  description: string
}

export const mcpServers: McpServer[] = [
  {
    id: 'srv_core',
    name: 'Core Operations',
    slug: 'core-ops',
    status: 'running',
    connectedClients: 6,
    endpoint: 'https://gw.gridhook.dev/mcp/core-ops',
    connectorIds: ['con_stripe', 'con_hubspot', 'con_slack'],
    apiKeyCount: 3,
    description: 'Billing, CRM, and messaging tools for the ops assistant.',
  },
  {
    id: 'srv_data',
    name: 'Data Analyst',
    slug: 'data-analyst',
    status: 'running',
    connectedClients: 2,
    endpoint: 'https://gw.gridhook.dev/mcp/data-analyst',
    connectorIds: ['con_postgres', 'con_snowflake'],
    apiKeyCount: 1,
    description: 'Read-scoped warehouse access for reporting agents.',
  },
  {
    id: 'srv_support',
    name: 'Support Copilot',
    slug: 'support-copilot',
    status: 'stopped',
    connectedClients: 0,
    endpoint: 'https://gw.gridhook.dev/mcp/support-copilot',
    connectorIds: ['con_zendesk', 'con_notion'],
    apiKeyCount: 2,
    description: 'Ticket triage and knowledge-base lookups.',
  },
  {
    id: 'srv_dev',
    name: 'Dev Assistant',
    slug: 'dev-assistant',
    status: 'running',
    connectedClients: 9,
    endpoint: 'https://gw.gridhook.dev/mcp/dev-assistant',
    connectorIds: ['con_github', 'con_slack'],
    apiKeyCount: 4,
    description: 'Repository and CI tools wired into engineering IDEs.',
  },
]

export const mcpClients = [
  { id: 'cursor', name: 'Cursor' },
  { id: 'vscode', name: 'VS Code' },
  { id: 'claude', name: 'Claude Desktop' },
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'windsurf', name: 'Windsurf' },
  { id: 'zed', name: 'Zed' },
  { id: 'raycast', name: 'Raycast' },
  { id: 'custom', name: 'Custom (OAuth/API key)' },
]

export type LogStatus = 'success' | 'error' | 'timeout'

export interface AuditLogEntry {
  id: string
  time: string
  tool: string
  connector: string
  server: string
  code: number
  durationMs: number
  status: LogStatus
  input: string
  output: string
}

const toolPool = [
  ['create_customer', 'con_stripe', 'srv_core'],
  ['list_invoices', 'con_stripe', 'srv_core'],
  ['create_issue', 'con_github', 'srv_dev'],
  ['search_repos', 'con_github', 'srv_dev'],
  ['query_orders_table', 'con_postgres', 'srv_data'],
  ['upsert_contact', 'con_hubspot', 'srv_core'],
  ['post_message', 'con_slack', 'srv_core'],
  ['get_ticket', 'con_zendesk', 'srv_support'],
  ['run_warehouse_query', 'con_snowflake', 'srv_data'],
  ['search_pages', 'con_notion', 'srv_support'],
] as const

function seededLogs(n: number): AuditLogEntry[] {
  const out: AuditLogEntry[] = []
  for (let i = 0; i < n; i++) {
    const [tool, connectorId, serverId] = toolPool[i % toolPool.length]
    const connector = connectors.find((c) => c.id === connectorId)!
    const server = mcpServers.find((s) => s.id === serverId)!
    const roll = (i * 37) % 100
    const status: LogStatus = roll > 92 ? 'error' : roll > 88 ? 'timeout' : 'success'
    const code = status === 'success' ? 200 : status === 'timeout' ? 504 : 400 + (i % 3) * 10
    out.push({
      id: `log_${i}`,
      time: new Date(Date.now() - i * 1000 * 60 * (3 + (i % 7))).toISOString(),
      tool,
      connector: connector.name,
      server: server.name,
      code,
      durationMs: 40 + ((i * 53) % 900),
      status,
      input: JSON.stringify({ limit: 10, id: `obj_${1000 + i}` }),
      output:
        status === 'success'
          ? JSON.stringify({ ok: true, count: (i % 9) + 1 })
          : JSON.stringify({ error: status === 'timeout' ? 'upstream timeout' : 'validation failed' }),
    })
  }
  return out
}

export const auditLogs = seededLogs(64)

export const dailyInvocations = [
  { day: 'Mon', calls: 4210, errors: 62 },
  { day: 'Tue', calls: 5120, errors: 44 },
  { day: 'Wed', calls: 4790, errors: 88 },
  { day: 'Thu', calls: 6130, errors: 51 },
  { day: 'Fri', calls: 6980, errors: 73 },
  { day: 'Sat', calls: 3010, errors: 20 },
  { day: 'Sun', calls: 2540, errors: 18 },
]

export const monthlyCost = [
  { day: 'W1', cost: 128 },
  { day: 'W2', cost: 156 },
  { day: 'W3', cost: 141 },
  { day: 'W4', cost: 183 },
]

export const topTools = [
  { tool: 'query_orders_table', calls: 9840 },
  { tool: 'create_issue', calls: 6210 },
  { tool: 'upsert_contact', calls: 5480 },
  { tool: 'post_message', calls: 4310 },
  { tool: 'run_warehouse_query', calls: 3120 },
]

export interface KgNode {
  id: string
  label: string
  kind: 'connector' | 'entity' | 'field'
  x: number
  y: number
  layer: 'STATIC' | 'OBSERVED' | 'MANUAL' | 'LLM'
}

export interface KgEdge {
  id: string
  from: string
  to: string
  label: string
  layer: 'STATIC' | 'OBSERVED' | 'MANUAL' | 'LLM'
  confidence: number
  status: 'confirmed' | 'suggested'
}

export const kgNodes: KgNode[] = [
  { id: 'n_stripe', label: 'Stripe', kind: 'connector', x: 120, y: 90, layer: 'STATIC' },
  { id: 'n_customer', label: 'Customer', kind: 'entity', x: 320, y: 60, layer: 'STATIC' },
  { id: 'n_invoice', label: 'Invoice', kind: 'entity', x: 320, y: 180, layer: 'STATIC' },
  { id: 'n_hubspot', label: 'HubSpot', kind: 'connector', x: 120, y: 260, layer: 'STATIC' },
  { id: 'n_contact', label: 'Contact', kind: 'entity', x: 320, y: 300, layer: 'OBSERVED' },
  { id: 'n_email', label: 'email', kind: 'field', x: 540, y: 60, layer: 'STATIC' },
  { id: 'n_customer_id', label: 'customer_id', kind: 'field', x: 540, y: 180, layer: 'OBSERVED' },
  { id: 'n_postgres', label: 'Postgres', kind: 'connector', x: 120, y: 420, layer: 'STATIC' },
  { id: 'n_order', label: 'Order', kind: 'entity', x: 320, y: 430, layer: 'MANUAL' },
  { id: 'n_amount', label: 'amount_cents', kind: 'field', x: 540, y: 430, layer: 'LLM' },
  { id: 'n_github', label: 'GitHub', kind: 'connector', x: 750, y: 90, layer: 'STATIC' },
  { id: 'n_repo', label: 'Repository', kind: 'entity', x: 950, y: 90, layer: 'STATIC' },
  { id: 'n_issue', label: 'Issue', kind: 'entity', x: 950, y: 210, layer: 'STATIC' },
]

export const kgEdges: KgEdge[] = [
  { id: 'e1', from: 'n_stripe', to: 'n_customer', label: 'exposes', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e2', from: 'n_stripe', to: 'n_invoice', label: 'exposes', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e3', from: 'n_customer', to: 'n_email', label: 'has field', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e4', from: 'n_invoice', to: 'n_customer_id', label: 'has field', layer: 'OBSERVED', confidence: 0.86, status: 'confirmed' },
  { id: 'e5', from: 'n_hubspot', to: 'n_contact', label: 'exposes', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e6', from: 'n_contact', to: 'n_email', label: 'matches on', layer: 'OBSERVED', confidence: 0.74, status: 'suggested' },
  { id: 'e7', from: 'n_customer', to: 'n_contact', label: 'same entity as', layer: 'LLM', confidence: 0.68, status: 'suggested' },
  { id: 'e8', from: 'n_postgres', to: 'n_order', label: 'exposes', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e9', from: 'n_order', to: 'n_amount', label: 'has field', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e10', from: 'n_order', to: 'n_customer', label: 'references', layer: 'MANUAL', confidence: 0.95, status: 'confirmed' },
  { id: 'e11', from: 'n_github', to: 'n_repo', label: 'exposes', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e12', from: 'n_repo', to: 'n_issue', label: 'has many', layer: 'STATIC', confidence: 1, status: 'confirmed' },
  { id: 'e13', from: 'n_issue', to: 'n_order', label: 'referenced by ticket', layer: 'LLM', confidence: 0.41, status: 'suggested' },
]

export const kgSkills = [
  { id: 'sk1', name: 'reconcile_customer_identity', description: 'Cross-reference Stripe customers with HubSpot contacts by email to resolve identity conflicts.', usedBy: 6, confidence: 0.91 },
  { id: 'sk2', name: 'flag_overdue_invoice_orders', description: 'Join overdue Stripe invoices against Postgres orders to flag at-risk fulfillment.', usedBy: 3, confidence: 0.83 },
  { id: 'sk3', name: 'link_support_ticket_to_repo_issue', description: 'Correlate Zendesk tickets mentioning error codes with matching GitHub issues.', usedBy: 4, confidence: 0.67 },
  { id: 'sk4', name: 'summarize_weekly_pipeline_health', description: 'Roll up connector call volume and error rate into a weekly digest.', usedBy: 9, confidence: 0.95 },
]

export interface OrgUser {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer'
  status: 'active' | 'invited'
  lastActive: string
}

export const orgUsers: OrgUser[] = [
  { id: 'u1', name: 'Aditya Verma', email: 'aditya.verma@procol.in', role: 'Owner', status: 'active', lastActive: '2026-07-25T07:05:00Z' },
  { id: 'u2', name: 'Priya Nair', email: 'priya.nair@procol.in', role: 'Admin', status: 'active', lastActive: '2026-07-25T02:20:00Z' },
  { id: 'u3', name: 'Marcus Lee', email: 'marcus.lee@procol.in', role: 'Developer', status: 'active', lastActive: '2026-07-24T19:40:00Z' },
  { id: 'u4', name: 'Sara Ahmed', email: 'sara.ahmed@procol.in', role: 'Developer', status: 'invited', lastActive: '2026-07-22T09:00:00Z' },
  { id: 'u5', name: 'Ilya Petrov', email: 'ilya.petrov@procol.in', role: 'Viewer', status: 'active', lastActive: '2026-07-20T14:12:00Z' },
]

export const roles = [
  { id: 'r1', name: 'Owner', description: 'Full control of workspace, billing, and org settings.', members: 1, system: true },
  { id: 'r2', name: 'Admin', description: 'Manage connectors, MCP servers, and users. No billing access.', members: 1, system: true },
  { id: 'r3', name: 'Developer', description: 'Create and edit connectors and tools. Read-only settings.', members: 2, system: true },
  { id: 'r4', name: 'Viewer', description: 'Read-only access to dashboards, logs, and configuration.', members: 1, system: true },
]
