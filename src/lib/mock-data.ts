export type ConnectorType = 'REST' | 'GraphQL' | 'SOAP' | 'Database'
export type AuthType = 'OAuth2' | 'Bearer' | 'API Key' | 'Basic' | 'None'
export type ApiStatus = 'active' | 'inactive' | 'error'
// Same 3-state domain as ApiStatus, but a Connector's status is always derived
// (see connectorStatus below) — a connector has no status field of its own.
export type ConnectorStatus = ApiStatus

export interface OAuth2AuthConfig {
  clientId: string
  scopes?: string[]
}
export interface ApiKeyAuthConfig {
  header: string
}
export interface BasicAuthConfig {
  username: string
}
// Bearer/None carry no non-secret config worth modeling. Secret values
// (client secret, api key, password) are write-only — captured by forms,
// never stored here or returned by a GET; `hasCredentials` is the only
// thing on Api that reflects "is a secret configured."
export type AuthConfig = OAuth2AuthConfig | ApiKeyAuthConfig | BasicAuthConfig | undefined

export interface Api {
  id: string
  moduleId: string
  name: string
  description: string
  type: ConnectorType
  baseUrl: string
  authType: AuthType
  authConfig?: AuthConfig
  hasCredentials: boolean
  toolCount: number
  status: ApiStatus
  lastSync: string
  callsToday: number
}

export interface Module {
  id: string
  name: string
  description: string
  apis: Api[]
}

export interface Connector {
  id: string
  name: string
  glyph: string
  tint: string
  description: string
  modules: Module[]
}

export interface ConnectorTool {
  id: string
  apiId: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' // only meaningful when the owning api's type is REST
  path: string // only meaningful when the owning api's type is REST
  cached: boolean
  operation?: string // SOAP action / GraphQL operation name / DB query-or-function name — used when api.type !== 'REST'
  operationKind?: 'query' | 'mutation' // GraphQL only
  params?: ToolParam[] // authored params; falls back to the path/method heuristic below when absent
  sampleRequest?: Record<string, unknown>
  sampleResponse?: Record<string, unknown>
}

export function allApis(c: Connector): Api[] {
  return c.modules.flatMap((m) => m.apis)
}

// error always wins (never mask a real problem behind healthy siblings);
// inactive only wins when every child is inactive (one disabled legacy api
// shouldn't hide that the connector is otherwise live); else active.
export function connectorStatus(c: Connector): ConnectorStatus {
  const apis = allApis(c)
  if (apis.length === 0) return 'inactive'
  if (apis.some((a) => a.status === 'error')) return 'error'
  if (apis.every((a) => a.status === 'inactive')) return 'inactive'
  return 'active'
}

export function totalTools(c: Connector): number {
  return allApis(c).reduce((sum, a) => sum + a.toolCount, 0)
}

export function totalCallsToday(c: Connector): number {
  return allApis(c).reduce((sum, a) => sum + a.callsToday, 0)
}

export function connectorLastSync(c: Connector): string | null {
  const apis = allApis(c)
  if (apis.length === 0) return null
  return apis.reduce((latest, a) => (a.lastSync > latest ? a.lastSync : latest), apis[0].lastSync)
}

export function uniqueApiTypes(c: Connector): ConnectorType[] {
  return [...new Set(allApis(c).map((a) => a.type))]
}

export function uniqueAuthTypes(c: Connector): AuthType[] {
  return [...new Set(allApis(c).map((a) => a.authType))]
}

const resourceNounsByApi: Record<string, string[]> = {
  con_stripe_api_rest: ['customer', 'invoice', 'charge', 'refund', 'subscription'],
  con_github_api_rest: ['repo', 'issue', 'pull_request', 'commit', 'workflow_run'],
  con_postgres_api_sql: ['orders_table', 'customers_table', 'query'],
  con_hubspot_api_rest: ['contact', 'deal', 'company', 'ticket'],
  con_zendesk_api_rest: ['ticket', 'user', 'organization'],
  con_shopify_api_storefront: ['product', 'collection', 'cart'],
  con_shopify_api_admin: ['order', 'customer', 'inventory_item'],
  con_soap_legacy_api_bidding_soap: ['bid_request', 'bid_response'],
  con_soap_legacy_api_awarding_soap: ['award', 'contract'],
  con_soap_legacy_api_awarding_reports: ['award_summary'],
  con_soap_legacy_api_vendor_soap: ['vendor_master'],
  con_slack_api_rest: ['message', 'channel', 'user'],
  con_snowflake_api_sql: ['warehouse_query', 'table'],
  con_notion_api_rest: ['page', 'database', 'block'],
}

const verbsByMethod: { verb: string; method: ConnectorTool['method'] }[] = [
  { verb: 'list', method: 'GET' },
  { verb: 'get', method: 'GET' },
  { verb: 'create', method: 'POST' },
  { verb: 'update', method: 'PUT' },
  { verb: 'delete', method: 'DELETE' },
]

export function toolsForApi(api: Api): ConnectorTool[] {
  const nouns = resourceNounsByApi[api.id] ?? ['record']
  const tools: ConnectorTool[] = []
  for (let i = 0; i < api.toolCount; i++) {
    const noun = nouns[i % nouns.length]
    const { verb, method } = verbsByMethod[i % verbsByMethod.length]
    const path =
      method === 'GET' && verb === 'list'
        ? `/${noun}s`
        : method === 'POST'
          ? `/${noun}s`
          : `/${noun}s/{id}`
    tools.push({
      id: `${api.id}_tool_${i}`,
      apiId: api.id,
      name: `${verb}_${noun}`,
      method,
      path,
      cached: method === 'GET' && i % 2 === 0,
    })
  }
  return tools
}

export function allTools(c: Connector): ConnectorTool[] {
  return allApis(c).flatMap(toolsForApi)
}

export interface ToolParam {
  name: string
  in: 'path' | 'query' | 'body' | 'header'
  type: string
  required: boolean
  description: string
}

export function paramsForTool(t: ConnectorTool): ToolParam[] {
  if (t.params) return t.params
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
  if (t.sampleRequest) return t.sampleRequest
  if (t.method === 'GET') {
    return t.path.includes('{') ? {} : { limit: 20, cursor: null }
  }
  if (t.method === 'DELETE') return {}
  return { name: 'Example value', status: 'active', metadata: { source: 'mcp' } }
}

export function sampleResponseForTool(t: ConnectorTool): Record<string, unknown> {
  if (t.sampleResponse) return t.sampleResponse
  if (t.method === 'DELETE') return { deleted: true, id: 'obj_1a2b3c' }
  if (t.method === 'GET' && !t.path.includes('{')) {
    return { data: [{ id: 'obj_1a2b3c', name: 'Example value', status: 'active' }], has_more: false }
  }
  return { id: 'obj_1a2b3c', name: 'Example value', status: 'active', created_at: '2026-07-25T07:00:00Z' }
}

// --- Tool import: parse a pasted/uploaded spec into candidate tools -------
// Which format is expected depends on the owning api's type — this is the
// "smart" branch. REST accepts OpenAPI/Swagger JSON, GraphQL accepts SDL
// text, SOAP/Database accept a generic JSON array of operations (SOAP also
// falls back to a best-effort WSDL operation-name scrape).

export interface ImportedOperation {
  name: string
  description?: string
  method?: ConnectorTool['method'] // REST only
  path?: string // REST only
  operation?: string // SOAP / GraphQL / Database
  operationKind?: 'query' | 'mutation' // GraphQL only
  params: ToolParam[]
  sampleRequest?: Record<string, unknown>
  sampleResponse?: Record<string, unknown>
}

function toSnakeCase(raw: string): string {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete'])

function parseOpenApiOperations(spec: any): ImportedOperation[] {
  const ops: ImportedOperation[] = []
  const paths = spec?.paths ?? {}
  for (const [path, pathItem] of Object.entries<any>(paths)) {
    for (const [method, op] of Object.entries<any>(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue
      const httpMethod = method.toUpperCase() as ConnectorTool['method']
      const name = toSnakeCase(op?.operationId ?? `${method}_${path}`)
      const params: ToolParam[] = (op?.parameters ?? []).map((p: any) => ({
        name: p.name,
        in: p.in === 'header' ? 'header' : p.in === 'path' ? 'path' : 'query',
        type: p.schema?.type ?? 'string',
        required: !!p.required,
        description: p.description ?? '',
      }))
      const bodySchema = op?.requestBody?.content?.['application/json']?.schema
      if (bodySchema?.properties) {
        const required: string[] = bodySchema.required ?? []
        for (const [propName, propSchema] of Object.entries<any>(bodySchema.properties)) {
          params.push({
            name: propName,
            in: 'body',
            type: propSchema?.type ?? 'string',
            required: required.includes(propName),
            description: propSchema?.description ?? '',
          })
        }
      }
      const responseContent =
        op?.responses?.['200']?.content?.['application/json'] ?? op?.responses?.['201']?.content?.['application/json']
      ops.push({
        name,
        description: op?.summary ?? op?.description ?? '',
        method: httpMethod,
        path,
        params,
        sampleRequest: op?.requestBody?.content?.['application/json']?.example,
        sampleResponse: responseContent?.example,
      })
    }
  }
  return ops
}

function parseGraphQlOperations(sdl: string): ImportedOperation[] {
  const ops: ImportedOperation[] = []
  for (const kind of ['query', 'mutation'] as const) {
    const blockMatch = sdl.match(new RegExp(`type\\s+${kind}\\s*\\{([^}]*)\\}`, 'i'))
    if (!blockMatch) continue
    const fieldRegex = /(\w+)\s*(\(([^)]*)\))?\s*:\s*([\w!\[\]]+)/g
    let m: RegExpExecArray | null
    while ((m = fieldRegex.exec(blockMatch[1]))) {
      const [, fieldName, , argsStr] = m
      const params: ToolParam[] = (argsStr ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((argStr) => {
          const [argName, argType] = argStr.split(':').map((s) => s.trim())
          return {
            name: argName,
            in: 'body' as const,
            type: (argType ?? 'String').replace('!', ''),
            required: (argType ?? '').includes('!'),
            description: '',
          }
        })
      ops.push({ name: toSnakeCase(fieldName), operation: fieldName, operationKind: kind, params })
    }
  }
  return ops
}

function parseGenericOperationsJson(arr: any[]): ImportedOperation[] {
  return arr.map((o) => ({
    name: toSnakeCase(o?.name ?? o?.operation ?? 'operation'),
    description: o?.description ?? '',
    operation: o?.operation ?? o?.name,
    params: Array.isArray(o?.params)
      ? o.params.map((p: any) => ({
          name: p.name,
          in: p.in ?? 'body',
          type: p.type ?? 'string',
          required: !!p.required,
          description: p.description ?? '',
        }))
      : [],
    sampleRequest: o?.sampleRequest,
    sampleResponse: o?.sampleResponse,
  }))
}

function parseWsdlOperationNames(text: string): ImportedOperation[] {
  const matches = [...text.matchAll(/<[\w:]*operation[^>]*name=["']([^"']+)["']/gi)]
  const seen = new Set<string>()
  const ops: ImportedOperation[] = []
  for (const m of matches) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    ops.push({ name: toSnakeCase(m[1]), operation: m[1], params: [] })
  }
  return ops
}

export function parseToolsSpec(text: string, apiType: ConnectorType): { operations: ImportedOperation[]; error?: string } {
  const trimmed = text.trim()
  if (!trimmed) return { operations: [], error: 'Paste or upload a spec first.' }

  if (apiType === 'REST') {
    try {
      const ops = parseOpenApiOperations(JSON.parse(trimmed))
      return ops.length ? { operations: ops } : { operations: [], error: 'No operations found under "paths" in this spec.' }
    } catch {
      return { operations: [], error: 'Could not parse this as OpenAPI/Swagger JSON.' }
    }
  }

  if (apiType === 'GraphQL') {
    const ops = parseGraphQlOperations(trimmed)
    return ops.length ? { operations: ops } : { operations: [], error: 'No Query/Mutation fields found in this schema.' }
  }

  // SOAP + Database: generic JSON array of operations, SOAP also falls back to a WSDL scrape
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      const ops = parseGenericOperationsJson(parsed)
      return ops.length ? { operations: ops } : { operations: [], error: 'That JSON array had no operations in it.' }
    }
  } catch {
    // fall through to WSDL scrape / error below
  }
  if (apiType === 'SOAP') {
    const ops = parseWsdlOperationNames(trimmed)
    if (ops.length) return { operations: ops }
  }
  return {
    operations: [],
    error: 'Paste a JSON array of operations: [{ "operation": "...", "params": [...] }]' + (apiType === 'SOAP' ? ', or WSDL XML.' : '.'),
  }
}

export const initialConnectors: Connector[] = [
  {
    id: 'con_stripe', name: 'Stripe Billing', glyph: 'S', tint: 'violet',
    description: 'Payments, invoicing, and subscription billing.',
    modules: [{
      id: 'con_stripe_mod_billing', name: 'Billing', description: 'Charges, invoices, subscriptions, and refunds.',
      apis: [{
        id: 'con_stripe_api_rest', moduleId: 'con_stripe_mod_billing', name: 'Billing REST API',
        description: 'Core Stripe REST surface.', type: 'REST', baseUrl: 'api.stripe.com/v1', authType: 'Bearer',
        hasCredentials: true, toolCount: 14, status: 'active', lastSync: '2026-07-25T06:40:00Z', callsToday: 812,
      }],
    }],
  },
  {
    id: 'con_github', name: 'GitHub', glyph: 'GH', tint: 'ink',
    description: 'Source control, issues, and CI workflows.',
    modules: [{
      id: 'con_github_mod_dev', name: 'Developer Platform', description: 'Repos, issues, pull requests, and Actions.',
      apis: [{
        id: 'con_github_api_rest', moduleId: 'con_github_mod_dev', name: 'GitHub REST API',
        description: 'api.github.com surface.', type: 'REST', baseUrl: 'api.github.com', authType: 'OAuth2',
        authConfig: { clientId: 'gh_client_9f2a', scopes: ['repo', 'workflow'] }, hasCredentials: true,
        toolCount: 22, status: 'active', lastSync: '2026-07-25T07:10:00Z', callsToday: 1204,
      }],
    }],
  },
  {
    id: 'con_postgres', name: 'Primary Postgres', glyph: 'PG', tint: 'info',
    description: 'Primary transactional database.',
    modules: [{
      id: 'con_postgres_mod_data', name: 'Data Access', description: 'Direct table and query access.',
      apis: [{
        id: 'con_postgres_api_sql', moduleId: 'con_postgres_mod_data', name: 'Postgres SQL API',
        description: 'Read/write scoped SQL surface.', type: 'Database', baseUrl: 'db.internal:5432', authType: 'Basic',
        authConfig: { username: 'gridhook_ro' }, hasCredentials: true,
        toolCount: 9, status: 'active', lastSync: '2026-07-25T07:20:00Z', callsToday: 3021,
      }],
    }],
  },
  {
    id: 'con_hubspot', name: 'HubSpot CRM', glyph: 'HS', tint: 'signal',
    description: 'Contacts, deals, and pipeline CRM.',
    modules: [{
      id: 'con_hubspot_mod_crm', name: 'CRM', description: 'Contacts, companies, deals, and support tickets.',
      apis: [{
        id: 'con_hubspot_api_rest', moduleId: 'con_hubspot_mod_crm', name: 'CRM REST API',
        description: 'api.hubapi.com surface.', type: 'REST', baseUrl: 'api.hubapi.com', authType: 'OAuth2',
        authConfig: { clientId: 'hs_client_7d1c', scopes: ['crm.objects.contacts.read'] }, hasCredentials: true,
        toolCount: 18, status: 'active', lastSync: '2026-07-25T05:55:00Z', callsToday: 445,
      }],
    }],
  },
  {
    id: 'con_zendesk', name: 'Zendesk', glyph: 'ZD', tint: 'ok',
    description: 'Customer support ticketing.',
    modules: [{
      id: 'con_zendesk_mod_support', name: 'Support', description: 'Tickets, users, and organizations.',
      apis: [{
        id: 'con_zendesk_api_rest', moduleId: 'con_zendesk_mod_support', name: 'Support REST API',
        description: 'company.zendesk.com surface.', type: 'REST', baseUrl: 'company.zendesk.com/api/v2', authType: 'API Key',
        authConfig: { header: 'X-API-Key' }, hasCredentials: true,
        toolCount: 11, status: 'error', lastSync: '2026-07-24T22:15:00Z', callsToday: 0,
      }],
    }],
  },
  {
    // 2 apis in 1 module — mixed protocol/auth for the same business area
    id: 'con_shopify', name: 'Shopify Storefront', glyph: 'SF', tint: 'ok',
    description: 'Commerce storefront and back-office.',
    modules: [{
      id: 'con_shopify_mod_commerce', name: 'Commerce', description: 'Storefront browsing plus back-office admin operations.',
      apis: [
        {
          id: 'con_shopify_api_storefront', moduleId: 'con_shopify_mod_commerce', name: 'Storefront GraphQL API',
          description: 'Customer-facing catalog browsing.', type: 'GraphQL', baseUrl: 'shop.myshopify.com/api/2026-01/graphql',
          authType: 'API Key', authConfig: { header: 'X-Shopify-Storefront-Access-Token' }, hasCredentials: true,
          toolCount: 9, status: 'active', lastSync: '2026-07-25T06:58:00Z', callsToday: 180,
        },
        {
          id: 'con_shopify_api_admin', moduleId: 'con_shopify_mod_commerce', name: 'Admin REST API',
          description: 'Back-office order/inventory management.', type: 'REST', baseUrl: 'shop.myshopify.com/admin/api',
          authType: 'API Key', authConfig: { header: 'X-Shopify-Access-Token' }, hasCredentials: true,
          toolCount: 7, status: 'active', lastSync: '2026-07-25T06:50:00Z', callsToday: 87,
        },
      ],
    }],
  },
  {
    // Flagship multi-module example: an ERP where bidding/awarding/vendor
    // management are separate modules, and Awarding itself mixes a legacy
    // SOAP core with a newer REST reporting api on different auth.
    id: 'con_soap_legacy', name: 'Legacy ERP', glyph: 'ERP', tint: 'muted',
    description: 'On-prem ERP covering the full procure-to-pay lifecycle.',
    modules: [
      {
        id: 'con_soap_legacy_mod_bidding', name: 'Bidding', description: 'RFQ creation and supplier bid collection.',
        apis: [{
          id: 'con_soap_legacy_api_bidding_soap', moduleId: 'con_soap_legacy_mod_bidding', name: 'Bidding SOAP API',
          description: 'WSDL-described bid intake service.', type: 'SOAP', baseUrl: 'erp.corp.local/soap/bidding',
          authType: 'Basic', authConfig: { username: 'erp_svc' }, hasCredentials: true,
          toolCount: 2, status: 'inactive', lastSync: '2026-07-20T11:02:00Z', callsToday: 0,
        }],
      },
      {
        id: 'con_soap_legacy_mod_awarding', name: 'Awarding', description: 'Bid evaluation and contract award workflow.',
        apis: [
          {
            id: 'con_soap_legacy_api_awarding_soap', moduleId: 'con_soap_legacy_mod_awarding', name: 'Awarding SOAP API',
            description: 'Legacy contract-award SOAP service.', type: 'SOAP', baseUrl: 'erp.corp.local/soap/awarding',
            authType: 'Basic', authConfig: { username: 'erp_svc' }, hasCredentials: true,
            toolCount: 2, status: 'inactive', lastSync: '2026-07-20T11:02:00Z', callsToday: 0,
          },
          {
            // Different protocol AND auth than its sibling above, and its
            // own error status — this is what makes connectorStatus()
            // report 'error' for the whole connector even though the SOAP
            // apis are merely inactive.
            id: 'con_soap_legacy_api_awarding_reports', moduleId: 'con_soap_legacy_mod_awarding', name: 'Awarding Reports REST API',
            description: 'Newer read-only reporting layer bolted onto the SOAP core.', type: 'REST', baseUrl: 'erp.corp.local/reports/v1',
            authType: 'API Key', authConfig: { header: 'X-Report-Key' }, hasCredentials: false,
            toolCount: 1, status: 'error', lastSync: '2026-07-18T09:00:00Z', callsToday: 0,
          },
        ],
      },
      {
        id: 'con_soap_legacy_mod_vendor', name: 'Vendor Management', description: 'Vendor master data and qualification records.',
        apis: [{
          id: 'con_soap_legacy_api_vendor_soap', moduleId: 'con_soap_legacy_mod_vendor', name: 'Vendor Master SOAP API',
          description: 'Vendor master/qualification SOAP service.', type: 'SOAP', baseUrl: 'erp.corp.local/soap/vendor',
          authType: 'Basic', authConfig: { username: 'erp_svc' }, hasCredentials: true,
          toolCount: 1, status: 'inactive', lastSync: '2026-07-20T11:02:00Z', callsToday: 0,
        }],
      },
    ],
  },
  {
    id: 'con_slack', name: 'Slack', glyph: 'SL', tint: 'violet',
    description: 'Team messaging and channel automation.',
    modules: [{
      id: 'con_slack_mod_messaging', name: 'Messaging', description: 'Channels, messages, and users.',
      apis: [{
        id: 'con_slack_api_rest', moduleId: 'con_slack_mod_messaging', name: 'Web API',
        description: 'slack.com/api surface.', type: 'REST', baseUrl: 'slack.com/api', authType: 'OAuth2',
        authConfig: { clientId: 'slack_client_4b8e', scopes: ['chat:write', 'channels:read'] }, hasCredentials: true,
        toolCount: 13, status: 'active', lastSync: '2026-07-25T07:22:00Z', callsToday: 598,
      }],
    }],
  },
  {
    id: 'con_snowflake', name: 'Snowflake DW', glyph: 'SN', tint: 'info',
    description: 'Cloud data warehouse for analytics workloads.',
    modules: [{
      id: 'con_snowflake_mod_warehouse', name: 'Warehouse', description: 'Query execution and table introspection.',
      apis: [{
        id: 'con_snowflake_api_sql', moduleId: 'con_snowflake_mod_warehouse', name: 'Snowflake SQL API',
        description: 'org-acct.snowflakecomputing.com surface.', type: 'Database', baseUrl: 'org-acct.snowflakecomputing.com',
        authType: 'OAuth2', authConfig: { clientId: 'sf_client_2e91' }, hasCredentials: true,
        toolCount: 7, status: 'active', lastSync: '2026-07-25T04:30:00Z', callsToday: 132,
      }],
    }],
  },
  {
    id: 'con_notion', name: 'Notion', glyph: 'N', tint: 'ink',
    description: 'Docs, wikis, and structured databases.',
    modules: [{
      id: 'con_notion_mod_workspace', name: 'Workspace', description: 'Pages, databases, and blocks.',
      apis: [{
        id: 'con_notion_api_rest', moduleId: 'con_notion_mod_workspace', name: 'Notion REST API',
        description: 'api.notion.com/v1 surface.', type: 'REST', baseUrl: 'api.notion.com/v1', authType: 'Bearer',
        hasCredentials: true, toolCount: 10, status: 'active', lastSync: '2026-07-25T06:10:00Z', callsToday: 341,
      }],
    }],
  },
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
    const connector = initialConnectors.find((c) => c.id === connectorId)!
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
