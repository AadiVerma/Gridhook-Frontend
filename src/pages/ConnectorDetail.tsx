import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Wrench, Play, Trash2, Settings2, Pencil, Check, X, ChevronRight, Upload, FileJson } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusPill, Tone } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Field, Textarea } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
  ConnectorType,
  Api,
  ApiStatus,
  AuthType,
  AuthConfig,
  ConnectorTool,
  ToolParam,
  ImportedOperation,
  allApis,
  toolsForApi,
  connectorStatus,
  totalTools,
  paramsForTool,
  sampleRequestForTool,
  sampleResponseForTool,
  parseToolsSpec,
} from '@/lib/mock-data'
import { useConnectorsStore } from '@/lib/connectors-store'

const typeTone: Record<ConnectorType, Tone> = {
  REST: 'signal',
  GraphQL: 'violet',
  SOAP: 'warn',
  Database: 'info',
}

function statusTone(status: ApiStatus) {
  return status === 'active' ? 'ok' : status === 'error' ? 'bad' : 'neutral'
}

const operationLabel: Record<ConnectorType, string> = {
  REST: 'Operation',
  SOAP: 'SOAP action / operation name',
  GraphQL: 'GraphQL operation name',
  Database: 'Query / function name',
}

const operationPlaceholder: Record<ConnectorType, string> = {
  REST: '',
  SOAP: 'CreatePurchaseOrder',
  GraphQL: 'getCustomerBalance',
  Database: 'get_customer_balance',
}

const specHint: Record<ConnectorType, string> = {
  REST: 'Paste an OpenAPI/Swagger JSON spec.',
  GraphQL: 'Paste a GraphQL schema (SDL) — Query and Mutation type fields become tools.',
  SOAP: 'Paste a JSON array of operations, or WSDL XML (operation names only).',
  Database: 'Paste a JSON array of operations: [{ "operation": "...", "params": [...] }]',
}

function isValidJsonOrEmpty(text: string) {
  if (!text.trim()) return true
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function ParamsEditor({ params, onChange }: { params: ToolParam[]; onChange: (next: ToolParam[]) => void }) {
  function update(i: number, patch: Partial<ToolParam>) {
    onChange(params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function remove(i: number) {
    onChange(params.filter((_, idx) => idx !== i))
  }
  function add() {
    onChange([...params, { name: '', in: 'query', type: 'string', required: false, description: '' }])
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">Parameters</p>
        <Button variant="secondary" size="sm" onClick={add}>
          <Plus size={12} /> Add parameter
        </Button>
      </div>
      {params.length === 0 && <p className="mt-2 text-xs text-faint">No parameters defined.</p>}
      <div className="mt-2 space-y-2">
        {params.map((p, i) => (
          <div key={i} className="grid grid-cols-12 items-center gap-2">
            <Input className="col-span-2" placeholder="name" value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
            <Select className="col-span-2" value={p.in} onChange={(e) => update(i, { in: e.target.value as ToolParam['in'] })}>
              <option value="path">path</option>
              <option value="query">query</option>
              <option value="body">body</option>
              <option value="header">header</option>
            </Select>
            <Input className="col-span-2" placeholder="type" value={p.type} onChange={(e) => update(i, { type: e.target.value })} />
            <label className="col-span-1 flex items-center justify-center gap-1 text-[11px] text-muted">
              <input type="checkbox" checked={p.required} onChange={(e) => update(i, { required: e.target.checked })} /> req
            </label>
            <Input
              className="col-span-4"
              placeholder="description"
              value={p.description}
              onChange={(e) => update(i, { description: e.target.value })}
            />
            <button
              onClick={() => remove(i)}
              className="col-span-1 flex items-center justify-center text-faint hover:text-bad"
              title="Remove parameter"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TargetTool {
  apiId: string
  tool: ConnectorTool
}

export default function ConnectorDetail() {
  const { id } = useParams()
  const { connectors, setApiStatus, setConnectorApisStatus, updateApi, moveApi, addModule, addApi } = useConnectorsStore()
  const connector = connectors.find((c) => c.id === id) ?? connectors[0]
  const [toolsByApi, setToolsByApi] = useState<Record<string, ConnectorTool[]>>(() =>
    Object.fromEntries(allApis(connector).map((a) => [a.id, toolsForApi(a)])),
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [targetApiId, setTargetApiId] = useState<string | null>(null)
  const [toolName, setToolName] = useState('')
  const [toolMethod, setToolMethod] = useState<ConnectorTool['method']>('GET')
  const [toolPath, setToolPath] = useState('')
  const [toolOperation, setToolOperation] = useState('')
  const [toolOperationKind, setToolOperationKind] = useState<'query' | 'mutation'>('query')
  const [toolParams, setToolParams] = useState<ToolParam[]>([])
  const [toolSampleRequestText, setToolSampleRequestText] = useState('')
  const [toolSampleResponseText, setToolSampleResponseText] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ apiId: string; tool: string; ok: boolean } | null>(null)
  const [viewingTool, setViewingTool] = useState<TargetTool | null>(null)
  const [viewName, setViewName] = useState('')
  const [viewPath, setViewPath] = useState('')
  const [viewOperation, setViewOperation] = useState('')
  const [viewOperationKind, setViewOperationKind] = useState<'query' | 'mutation'>('query')
  const [viewParams, setViewParams] = useState<ToolParam[]>([])
  const [viewSampleRequestText, setViewSampleRequestText] = useState('')
  const [viewSampleResponseText, setViewSampleResponseText] = useState('')
  const [pendingDeleteTool, setPendingDeleteTool] = useState<TargetTool | null>(null)

  const [importToolsApiId, setImportToolsApiId] = useState<string | null>(null)
  const [importToolsText, setImportToolsText] = useState('')
  const [importToolsError, setImportToolsError] = useState('')
  const [importToolsPreview, setImportToolsPreview] = useState<ImportedOperation[] | null>(null)
  const [importToolsSelected, setImportToolsSelected] = useState<Set<number>>(new Set())
  const importFileInputRef = useRef<HTMLInputElement>(null)

  const [editingApi, setEditingApi] = useState<Api | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editModuleId, setEditModuleId] = useState('')
  const [editType, setEditType] = useState<ConnectorType>('REST')
  const [editBaseUrl, setEditBaseUrl] = useState('')
  const [editAuthType, setEditAuthType] = useState<AuthType>('OAuth2')
  const [editApiKeyHeader, setEditApiKeyHeader] = useState('')
  const [editApiKeySecret, setEditApiKeySecret] = useState('')
  const [editBasicUsername, setEditBasicUsername] = useState('')
  const [editBasicPassword, setEditBasicPassword] = useState('')
  const [editOauthClientId, setEditOauthClientId] = useState('')
  const [editOauthScopes, setEditOauthScopes] = useState('')

  const [moduleModalOpen, setModuleModalOpen] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')

  const [newApiModuleId, setNewApiModuleId] = useState<string | null>(null)
  const [newApiName, setNewApiName] = useState('')
  const [newApiDescription, setNewApiDescription] = useState('')
  const [newApiType, setNewApiType] = useState<ConnectorType>('REST')
  const [newApiBaseUrl, setNewApiBaseUrl] = useState('')
  const [newApiAuthType, setNewApiAuthType] = useState<AuthType>('OAuth2')
  const [newApiKeyHeader, setNewApiKeyHeader] = useState('')
  const [newApiKeySecret, setNewApiKeySecret] = useState('')
  const [newApiBasicUsername, setNewApiBasicUsername] = useState('')
  const [newApiBasicPassword, setNewApiBasicPassword] = useState('')
  const [newApiOauthClientId, setNewApiOauthClientId] = useState('')
  const [newApiOauthScopes, setNewApiOauthScopes] = useState('')

  useEffect(() => {
    setToolsByApi(Object.fromEntries(allApis(connector).map((a) => [a.id, toolsForApi(a)])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector.id])

  const apis = allApis(connector)
  const status = connectorStatus(connector)
  const targetApi = apis.find((a) => a.id === targetApiId) ?? null

  function toggleConnectorActive() {
    setConnectorApisStatus(connector.id, status === 'active' ? 'inactive' : 'active')
  }

  function toggleApiActive(api: Api) {
    setApiStatus(connector.id, api.id, api.status === 'active' ? 'inactive' : 'active')
  }

  function openEditApi(api: Api) {
    setEditingApi(api)
    setEditName(api.name)
    setEditDescription(api.description)
    setEditModuleId(api.moduleId)
    setEditType(api.type)
    setEditBaseUrl(api.baseUrl)
    setEditAuthType(api.authType)
    setEditApiKeyHeader((api.authConfig && 'header' in api.authConfig && api.authConfig.header) || '')
    setEditApiKeySecret('')
    setEditBasicUsername((api.authConfig && 'username' in api.authConfig && api.authConfig.username) || '')
    setEditBasicPassword('')
    setEditOauthClientId((api.authConfig && 'clientId' in api.authConfig && api.authConfig.clientId) || '')
    setEditOauthScopes((api.authConfig && 'scopes' in api.authConfig && api.authConfig.scopes?.join(', ')) || '')
  }

  function buildEditAuthConfig(): AuthConfig {
    if (editAuthType === 'OAuth2') {
      const scopes = editOauthScopes.split(',').map((s) => s.trim()).filter(Boolean)
      return { clientId: editOauthClientId, ...(scopes.length ? { scopes } : {}) }
    }
    if (editAuthType === 'API Key') return { header: editApiKeyHeader }
    if (editAuthType === 'Basic') return { username: editBasicUsername }
    return undefined
  }

  function saveApiEdit() {
    if (!editingApi) return
    const secretEntered = editAuthType === 'API Key' ? !!editApiKeySecret : editAuthType === 'Basic' ? !!editBasicPassword : false
    updateApi(connector.id, editingApi.id, {
      name: editName,
      description: editDescription,
      type: editType,
      baseUrl: editBaseUrl,
      authType: editAuthType,
      authConfig: buildEditAuthConfig(),
      hasCredentials: secretEntered ? true : editingApi.hasCredentials,
    })
    if (editModuleId !== editingApi.moduleId) moveApi(connector.id, editingApi.id, editModuleId)
    setEditingApi(null)
    toast.success('API settings saved')
  }

  function saveNewModule() {
    addModule(connector.id, {
      id: `${connector.id}_mod_${Date.now()}`,
      name: newModuleName,
      description: newModuleDescription,
      apis: [],
    })
    setNewModuleName('')
    setNewModuleDescription('')
    setModuleModalOpen(false)
    toast.success(`Module "${newModuleName}" added`)
  }

  function openNewApi(moduleId: string) {
    setNewApiModuleId(moduleId)
    setNewApiName('')
    setNewApiDescription('')
    setNewApiType('REST')
    setNewApiBaseUrl('')
    setNewApiAuthType('OAuth2')
    setNewApiKeyHeader('')
    setNewApiKeySecret('')
    setNewApiBasicUsername('')
    setNewApiBasicPassword('')
    setNewApiOauthClientId('')
    setNewApiOauthScopes('')
  }

  function buildNewApiAuthConfig(): AuthConfig {
    if (newApiAuthType === 'OAuth2') {
      const scopes = newApiOauthScopes.split(',').map((s) => s.trim()).filter(Boolean)
      return { clientId: newApiOauthClientId, ...(scopes.length ? { scopes } : {}) }
    }
    if (newApiAuthType === 'API Key') return { header: newApiKeyHeader }
    if (newApiAuthType === 'Basic') return { username: newApiBasicUsername }
    return undefined
  }

  function saveNewApi() {
    if (!newApiModuleId) return
    const secretEntered =
      newApiAuthType === 'API Key' ? !!newApiKeySecret : newApiAuthType === 'Basic' ? !!newApiBasicPassword : newApiAuthType === 'OAuth2' ? !!newApiOauthClientId : false
    addApi(connector.id, newApiModuleId, {
      id: `${newApiModuleId}_api_${Date.now()}`,
      moduleId: newApiModuleId,
      name: newApiName,
      description: newApiDescription,
      type: newApiType,
      baseUrl: newApiBaseUrl,
      authType: newApiAuthType,
      authConfig: buildNewApiAuthConfig(),
      hasCredentials: secretEntered,
      toolCount: 0,
      status: 'active',
      lastSync: new Date().toISOString(),
      callsToday: 0,
    })
    setNewApiModuleId(null)
    toast.success(`API "${newApiName}" added`)
  }

  function runTool(api: Api, t: ConnectorTool) {
    setRunningId(t.id)
    setTimeout(() => {
      setRunningId(null)
      setRunResult({ apiId: api.id, tool: t.name, ok: api.status === 'active' })
      setTimeout(() => setRunResult(null), 2200)
    }, 700)
  }

  function openNewTool(apiId: string) {
    setTargetApiId(apiId)
    setToolName('')
    setToolMethod('GET')
    setToolPath('')
    setToolOperation('')
    setToolOperationKind('query')
    setToolParams([])
    setToolSampleRequestText('')
    setToolSampleResponseText('')
    setEditorOpen(true)
  }

  function openToolDetails(apiId: string, t: ConnectorTool) {
    setViewingTool({ apiId, tool: t })
    setViewName(t.name)
    setViewPath(t.path)
    setViewOperation(t.operation ?? t.name)
    setViewOperationKind(t.operationKind ?? 'query')
    setViewParams(paramsForTool(t))
    setViewSampleRequestText(JSON.stringify(sampleRequestForTool(t), null, 2))
    setViewSampleResponseText(JSON.stringify(sampleResponseForTool(t), null, 2))
  }

  function saveToolDetails() {
    if (!viewingTool) return
    const { apiId, tool } = viewingTool
    const api = apis.find((a) => a.id === apiId)
    const isRest = api?.type === 'REST'
    const patch: Partial<ConnectorTool> = {
      name: viewName,
      params: viewParams.filter((p) => p.name.trim()),
      sampleRequest: viewSampleRequestText.trim() ? JSON.parse(viewSampleRequestText) : undefined,
      sampleResponse: viewSampleResponseText.trim() ? JSON.parse(viewSampleResponseText) : undefined,
      ...(isRest ? { path: viewPath } : { operation: viewOperation, operationKind: api?.type === 'GraphQL' ? viewOperationKind : undefined }),
    }
    setToolsByApi((prev) => ({
      ...prev,
      [apiId]: prev[apiId].map((t) => (t.id === tool.id ? { ...t, ...patch } : t)),
    }))
    setViewingTool(null)
    toast.success('Tool updated')
  }

  function confirmDeleteTool() {
    if (!pendingDeleteTool) return
    const { apiId, tool } = pendingDeleteTool
    setToolsByApi((prev) => ({ ...prev, [apiId]: prev[apiId].filter((t) => t.id !== tool.id) }))
    setPendingDeleteTool(null)
    toast.success(`Tool "${tool.name}" deleted`)
  }

  function saveTool() {
    if (!targetApiId) return
    const isRest = targetApi?.type === 'REST'
    setToolsByApi((prev) => ({
      ...prev,
      [targetApiId]: [
        ...(prev[targetApiId] ?? []),
        {
          id: `${targetApiId}_tool_custom_${(prev[targetApiId] ?? []).length}`,
          apiId: targetApiId,
          name: toolName,
          method: isRest ? toolMethod : 'POST',
          path: isRest ? toolPath || '/' : '',
          cached: false,
          params: toolParams.filter((p) => p.name.trim()),
          sampleRequest: toolSampleRequestText.trim() ? JSON.parse(toolSampleRequestText) : undefined,
          sampleResponse: toolSampleResponseText.trim() ? JSON.parse(toolSampleResponseText) : undefined,
          ...(isRest ? {} : { operation: toolOperation, operationKind: targetApi?.type === 'GraphQL' ? toolOperationKind : undefined }),
        },
      ],
    }))
    setEditorOpen(false)
    toast.success(`Tool "${toolName}" created`)
  }

  function openImportTools(apiId: string) {
    setImportToolsApiId(apiId)
    setImportToolsText('')
    setImportToolsError('')
    setImportToolsPreview(null)
    setImportToolsSelected(new Set())
  }

  function handleImportFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => setImportToolsText(text))
  }

  function parseImportPreview() {
    const importApi = apis.find((a) => a.id === importToolsApiId)
    if (!importApi) return
    const { operations, error } = parseToolsSpec(importToolsText, importApi.type)
    setImportToolsError(error ?? '')
    setImportToolsPreview(operations)
    setImportToolsSelected(new Set(operations.map((_, i) => i)))
  }

  function toggleImportSelected(i: number) {
    setImportToolsSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function operationToTool(op: ImportedOperation, apiId: string, index: number): ConnectorTool {
    return {
      id: `${apiId}_tool_import_${Date.now()}_${index}`,
      apiId,
      name: op.name,
      method: op.method ?? 'POST',
      path: op.path ?? '',
      cached: false,
      operation: op.operation,
      operationKind: op.operationKind,
      params: op.params,
      sampleRequest: op.sampleRequest,
      sampleResponse: op.sampleResponse,
    }
  }

  function confirmImportTools() {
    if (!importToolsApiId || !importToolsPreview) return
    const apiId = importToolsApiId
    const toImport = importToolsPreview.filter((_, i) => importToolsSelected.has(i)).map((op, i) => operationToTool(op, apiId, i))
    setToolsByApi((prev) => ({ ...prev, [apiId]: [...(prev[apiId] ?? []), ...toImport] }))
    setImportToolsApiId(null)
    toast.success(`${toImport.length} tool${toImport.length === 1 ? '' : 's'} imported`)
  }

  return (
    <AppShell title={connector.name} subtitle={connector.description} backTo="/connectors">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusPill tone={statusTone(status)}>{status}</StatusPill>
        <div className="flex items-center gap-2 rounded-full border border-border-strong/15 bg-surface px-3 py-1">
          <Switch checked={status === 'active'} onChange={toggleConnectorActive} />
          <span className="text-xs text-muted">{status === 'active' ? 'Enabled' : 'Disabled'}</span>
        </div>
        <span className="text-xs text-faint">
          {connector.modules.length} module{connector.modules.length === 1 ? '' : 's'} · {apis.length} api{apis.length === 1 ? '' : 's'} ·{' '}
          {totalTools(connector)} tools
        </span>
      </div>

      <div className="space-y-4">
        {connector.modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <div>
                <CardTitle>{module.name}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {module.apis.map((api) => {
                const tools = toolsByApi[api.id] ?? []
                return (
                  <div key={api.id} className="rounded-xl border border-border-strong/15 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{api.name}</p>
                        <p className="truncate font-mono text-[11px] text-faint">{api.baseUrl}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={typeTone[api.type]}>{api.type}</Badge>
                        <Badge tone="neutral">{api.authType}</Badge>
                        <StatusPill tone={statusTone(api.status)}>{api.status}</StatusPill>
                        <Switch checked={api.status === 'active'} onChange={() => toggleApiActive(api)} />
                        <button
                          onClick={() => openEditApi(api)}
                          className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-ink"
                          title="Edit API"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-muted">{tools.length} callable MCP tools</p>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openImportTools(api.id)}>
                          <Upload size={13} /> Import tools
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openNewTool(api.id)}>
                          <Plus size={13} /> New tool
                        </Button>
                      </div>
                    </div>

                    {runResult && runResult.apiId === api.id && (
                      <div
                        className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs animate-fade-in ${
                          runResult.ok ? 'border-ok/25 bg-ok/10 text-ok' : 'border-bad/25 bg-bad/10 text-bad'
                        }`}
                      >
                        {runResult.ok ? <Check size={13} /> : <X size={13} />}
                        <span className="font-mono">{runResult.tool}</span>
                        {runResult.ok ? 'ran successfully' : `failed — ${api.name} is reporting errors`}
                      </div>
                    )}

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wide text-faint">
                            <th className="pb-2 font-medium">Tool</th>
                            <th className="pb-2 font-medium">{api.type === 'REST' ? 'Method' : ''}</th>
                            <th className="pb-2 font-medium">{api.type === 'REST' ? 'Path' : 'Operation'}</th>
                            <th className="pb-2 font-medium">Cache</th>
                            <th className="pb-2 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                          {tools.map((t) => (
                            <tr key={t.id} className="group">
                              <td className="py-2.5 font-mono text-xs text-ink">
                                <button
                                  onClick={() => openToolDetails(api.id, t)}
                                  className="flex items-center gap-1.5 hover:text-signal"
                                  title="View payload and parameters"
                                >
                                  <Wrench size={12} className="text-signal" /> {t.name}
                                  <ChevronRight size={11} className="text-faint" />
                                </button>
                              </td>
                              <td className="py-2.5">
                                {api.type === 'REST' ? (
                                  <Badge tone={t.method === 'GET' ? 'info' : 'signal'}>{t.method}</Badge>
                                ) : (
                                  t.operationKind && <Badge tone="neutral">{t.operationKind}</Badge>
                                )}
                              </td>
                              <td className="py-2.5 font-mono text-xs text-muted">{api.type === 'REST' ? t.path : t.operation || t.name}</td>
                              <td className="py-2.5 text-xs text-muted">{t.cached ? '60s TTL' : 'off'}</td>
                              <td className="py-2.5">
                                <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    onClick={() => runTool(api, t)}
                                    disabled={runningId === t.id}
                                    className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-signal disabled:opacity-40"
                                    title="Run tool"
                                  >
                                    <Play size={13} className={runningId === t.id ? 'animate-pulse' : ''} />
                                  </button>
                                  <button
                                    onClick={() => openToolDetails(api.id, t)}
                                    className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-ink"
                                    title="Edit tool"
                                  >
                                    <Settings2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setPendingDeleteTool({ apiId: api.id, tool: t })}
                                    className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad"
                                    title="Delete tool"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {tools.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-xs text-faint">
                                No tools mapped yet on this api.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

              <Button variant="secondary" size="sm" onClick={() => openNewApi(module.id)}>
                <Plus size={13} /> Add API to this module
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => setModuleModalOpen(true)}>
          <Plus size={14} /> Add module
        </Button>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="New tool"
        description={targetApi ? `Map an endpoint on ${targetApi.name} to a callable MCP tool` : undefined}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <Field label="Tool name" hint="snake_case, shown to the LLM as the callable function name">
            <Input placeholder="get_customer_balance" value={toolName} onChange={(e) => setToolName(e.target.value)} />
          </Field>

          {targetApi?.type === 'REST' ? (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Method">
                <Select value={toolMethod} onChange={(e) => setToolMethod(e.target.value as ConnectorTool['method'])}>
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </Select>
              </Field>
              <div className="col-span-2">
                <Field label="Path">
                  <Input placeholder="/customers/{id}/balance" value={toolPath} onChange={(e) => setToolPath(e.target.value)} />
                </Field>
              </div>
            </div>
          ) : (
            <div className={targetApi?.type === 'GraphQL' ? 'grid grid-cols-3 gap-3' : ''}>
              <div className={targetApi?.type === 'GraphQL' ? 'col-span-2' : ''}>
                <Field label={operationLabel[targetApi?.type ?? 'SOAP']}>
                  <Input
                    placeholder={operationPlaceholder[targetApi?.type ?? 'SOAP']}
                    value={toolOperation}
                    onChange={(e) => setToolOperation(e.target.value)}
                  />
                </Field>
              </div>
              {targetApi?.type === 'GraphQL' && (
                <Field label="Operation type">
                  <Select value={toolOperationKind} onChange={(e) => setToolOperationKind(e.target.value as 'query' | 'mutation')}>
                    <option value="query">Query</option>
                    <option value="mutation">Mutation</option>
                  </Select>
                </Field>
              )}
            </div>
          )}

          <Field label="Description" hint="Helps the model decide when to call this tool.">
            <Textarea rows={2} placeholder="Returns the outstanding balance for a customer." />
          </Field>

          <ParamsEditor params={toolParams} onChange={setToolParams} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Sample request body (JSON)" hint="Optional — leave blank to auto-generate a placeholder.">
              <Textarea
                rows={4}
                className="font-mono text-xs"
                placeholder="{}"
                value={toolSampleRequestText}
                onChange={(e) => setToolSampleRequestText(e.target.value)}
              />
            </Field>
            <Field label="Sample response body (JSON)" hint="Optional — leave blank to auto-generate a placeholder.">
              <Textarea
                rows={4}
                className="font-mono text-xs"
                placeholder="{}"
                value={toolSampleResponseText}
                onChange={(e) => setToolSampleResponseText(e.target.value)}
              />
            </Field>
          </div>
          {(!isValidJsonOrEmpty(toolSampleRequestText) || !isValidJsonOrEmpty(toolSampleResponseText)) && (
            <p className="text-xs text-bad">Sample request/response must be valid JSON, or left blank.</p>
          )}

          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!toolName || !isValidJsonOrEmpty(toolSampleRequestText) || !isValidJsonOrEmpty(toolSampleResponseText)}
              onClick={saveTool}
            >
              Save tool
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!importToolsApiId}
        onClose={() => setImportToolsApiId(null)}
        title="Import tools"
        description={(() => {
          const importApi = apis.find((a) => a.id === importToolsApiId)
          return importApi ? `${specHint[importApi.type]} — for ${importApi.name}.` : undefined
        })()}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <input ref={importFileInputRef} type="file" accept=".json,.graphql,.gql,.txt,.wsdl,.xml" className="hidden" onChange={handleImportFileUpload} />
          <button
            onClick={() => importFileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/25 py-6 text-muted transition-colors hover:border-signal/40 hover:text-signal"
          >
            <FileJson size={20} />
            <span className="text-sm font-medium">Click to upload a spec file</span>
            <span className="text-[11px] text-faint">or paste below</span>
          </button>

          <Field label="Spec contents">
            <Textarea
              rows={7}
              className="font-mono text-xs"
              value={importToolsText}
              onChange={(e) => {
                setImportToolsText(e.target.value)
                setImportToolsPreview(null)
                setImportToolsError('')
              }}
            />
          </Field>

          {importToolsError && <p className="text-xs text-bad">{importToolsError}</p>}

          {importToolsPreview && importToolsPreview.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted">
                {importToolsSelected.size} of {importToolsPreview.length} operations selected
              </p>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border-strong/15 p-2">
                {importToolsPreview.map((op, i) => (
                  <label key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-canvas/40">
                    <input type="checkbox" checked={importToolsSelected.has(i)} onChange={() => toggleImportSelected(i)} />
                    <span className="font-mono text-ink">{op.name}</span>
                    <span className="text-faint">
                      {op.method ? `${op.method} ${op.path}` : op.operation} · {op.params.length} param{op.params.length === 1 ? '' : 's'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setImportToolsApiId(null)}>
              Cancel
            </Button>
            {importToolsPreview ? (
              <Button variant="primary" size="sm" disabled={importToolsSelected.size === 0} onClick={confirmImportTools}>
                <Check size={13} /> Import {importToolsSelected.size} tool{importToolsSelected.size === 1 ? '' : 's'}
              </Button>
            ) : (
              <Button variant="primary" size="sm" disabled={!importToolsText.trim()} onClick={parseImportPreview}>
                Parse
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewingTool}
        onClose={() => setViewingTool(null)}
        title={viewingTool ? viewingTool.tool.name : ''}
        description="Full request/response contract for this tool"
        className="max-w-3xl"
      >
        {viewingTool && (() => {
          const owningApi = apis.find((a) => a.id === viewingTool.apiId)
          const isRest = owningApi?.type === 'REST'
          const invalidJson = !isValidJsonOrEmpty(viewSampleRequestText) || !isValidJsonOrEmpty(viewSampleResponseText)
          return (
          <div className="space-y-5">
            {isRest ? (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Method">
                  <Select value={viewingTool.tool.method} disabled className="opacity-60">
                    <option>{viewingTool.tool.method}</option>
                  </Select>
                </Field>
                <div className="col-span-2">
                  <Field label="Path">
                    <Input value={viewPath} onChange={(e) => setViewPath(e.target.value)} className="font-mono" />
                  </Field>
                </div>
              </div>
            ) : (
              <div className={owningApi?.type === 'GraphQL' ? 'grid grid-cols-3 gap-3' : ''}>
                <div className={owningApi?.type === 'GraphQL' ? 'col-span-2' : ''}>
                  <Field label={operationLabel[owningApi?.type ?? 'SOAP']}>
                    <Input
                      className="font-mono"
                      placeholder={operationPlaceholder[owningApi?.type ?? 'SOAP']}
                      value={viewOperation}
                      onChange={(e) => setViewOperation(e.target.value)}
                    />
                  </Field>
                </div>
                {owningApi?.type === 'GraphQL' && (
                  <Field label="Operation type">
                    <Select value={viewOperationKind} onChange={(e) => setViewOperationKind(e.target.value as 'query' | 'mutation')}>
                      <option value="query">Query</option>
                      <option value="mutation">Mutation</option>
                    </Select>
                  </Field>
                )}
              </div>
            )}
            <Field label="Tool name">
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} className="font-mono" />
            </Field>

            <ParamsEditor params={viewParams} onChange={setViewParams} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Sample request body (JSON)">
                <Textarea
                  rows={5}
                  className="font-mono text-[11px]"
                  value={viewSampleRequestText}
                  onChange={(e) => setViewSampleRequestText(e.target.value)}
                />
              </Field>
              <Field label="Sample response body (JSON)">
                <Textarea
                  rows={5}
                  className="font-mono text-[11px]"
                  value={viewSampleResponseText}
                  onChange={(e) => setViewSampleResponseText(e.target.value)}
                />
              </Field>
            </div>
            {invalidJson && <p className="text-xs text-bad">Sample request/response must be valid JSON, or left blank.</p>}

            <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
              <Button variant="secondary" size="sm" onClick={() => setViewingTool(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" disabled={invalidJson} onClick={saveToolDetails}>
                Save changes
              </Button>
            </div>
          </div>
          )
        })()}
      </Modal>

      <Modal
        open={!!pendingDeleteTool}
        onClose={() => setPendingDeleteTool(null)}
        title="Delete tool"
        description={
          pendingDeleteTool
            ? `This removes "${pendingDeleteTool.tool.name}" from every MCP server it's exposed on. This cannot be undone.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteTool(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDeleteTool}>
            <Trash2 size={13} /> Delete tool
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editingApi}
        onClose={() => setEditingApi(null)}
        title="Edit API"
        description={editingApi ? `Reconfigure ${editingApi.name}, or move it to a different module.` : undefined}
        className="max-w-xl"
      >
        {editingApi && (
          <div className="space-y-4">
            <Field label="API name">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </Field>
            <Field label="Module" hint="Move this API to a different module on the same connector.">
              <Select value={editModuleId} onChange={(e) => setEditModuleId(e.target.value)}>
                {connector.modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={editType} onChange={(e) => setEditType(e.target.value as ConnectorType)}>
                  <option>REST</option>
                  <option>GraphQL</option>
                  <option>SOAP</option>
                  <option>Database</option>
                </Select>
              </Field>
              <Field label="Authentication">
                <Select value={editAuthType} onChange={(e) => setEditAuthType(e.target.value as AuthType)}>
                  <option>OAuth2</option>
                  <option>Bearer</option>
                  <option>API Key</option>
                  <option>Basic</option>
                  <option>None</option>
                </Select>
              </Field>
            </div>
            <Field label={editType === 'Database' ? 'Connection string host' : 'Base URL'}>
              <Input value={editBaseUrl} onChange={(e) => setEditBaseUrl(e.target.value)} className="font-mono" />
            </Field>

            {editAuthType === 'OAuth2' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client ID">
                  <Input value={editOauthClientId} onChange={(e) => setEditOauthClientId(e.target.value)} />
                </Field>
                <Field label="Scopes" hint="Comma-separated">
                  <Input value={editOauthScopes} onChange={(e) => setEditOauthScopes(e.target.value)} />
                </Field>
              </div>
            )}
            {editAuthType === 'API Key' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Header name">
                  <Input value={editApiKeyHeader} onChange={(e) => setEditApiKeyHeader(e.target.value)} />
                </Field>
                <Field label="API key" hint="Leave blank to keep the existing key.">
                  <Input type="password" placeholder="••••••••••••" value={editApiKeySecret} onChange={(e) => setEditApiKeySecret(e.target.value)} />
                </Field>
              </div>
            )}
            {editAuthType === 'Basic' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <Input value={editBasicUsername} onChange={(e) => setEditBasicUsername(e.target.value)} />
                </Field>
                <Field label="Password" hint="Leave blank to keep the existing password.">
                  <Input type="password" placeholder="••••••••••••" value={editBasicPassword} onChange={(e) => setEditBasicPassword(e.target.value)} />
                </Field>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
              <Button variant="secondary" size="sm" onClick={() => setEditingApi(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={!editName} onClick={saveApiEdit}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        title="New module"
        description="Group APIs by business process, e.g. Bidding or Awarding."
        className="max-w-md"
      >
        <div className="space-y-4">
          <Field label="Module name">
            <Input placeholder="e.g. Bidding" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea rows={2} placeholder="What does this module cover?" value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!newModuleName} onClick={saveNewModule}>
              Add module
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!newApiModuleId}
        onClose={() => setNewApiModuleId(null)}
        title="New API"
        description={
          newApiModuleId ? `Add an API surface to ${connector.modules.find((m) => m.id === newApiModuleId)?.name}.` : undefined
        }
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Field label="API name">
            <Input placeholder="e.g. Bidding SOAP API" value={newApiName} onChange={(e) => setNewApiName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={newApiDescription} onChange={(e) => setNewApiDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={newApiType} onChange={(e) => setNewApiType(e.target.value as ConnectorType)}>
                <option>REST</option>
                <option>GraphQL</option>
                <option>SOAP</option>
                <option>Database</option>
              </Select>
            </Field>
            <Field label="Authentication">
              <Select value={newApiAuthType} onChange={(e) => setNewApiAuthType(e.target.value as AuthType)}>
                <option>OAuth2</option>
                <option>Bearer</option>
                <option>API Key</option>
                <option>Basic</option>
                <option>None</option>
              </Select>
            </Field>
          </div>
          <Field label={newApiType === 'Database' ? 'Connection string host' : 'Base URL'}>
            <Input
              placeholder={newApiType === 'Database' ? 'db.internal:5432/prod' : 'https://api.example.com/v1'}
              value={newApiBaseUrl}
              onChange={(e) => setNewApiBaseUrl(e.target.value)}
            />
          </Field>

          {newApiAuthType === 'OAuth2' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client ID">
                <Input value={newApiOauthClientId} onChange={(e) => setNewApiOauthClientId(e.target.value)} />
              </Field>
              <Field label="Scopes" hint="Comma-separated">
                <Input value={newApiOauthScopes} onChange={(e) => setNewApiOauthScopes(e.target.value)} />
              </Field>
            </div>
          )}
          {newApiAuthType === 'API Key' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Header name">
                <Input placeholder="X-API-Key" value={newApiKeyHeader} onChange={(e) => setNewApiKeyHeader(e.target.value)} />
              </Field>
              <Field label="API key">
                <Input type="password" placeholder="••••••••••••" value={newApiKeySecret} onChange={(e) => setNewApiKeySecret(e.target.value)} />
              </Field>
            </div>
          )}
          {newApiAuthType === 'Basic' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username">
                <Input value={newApiBasicUsername} onChange={(e) => setNewApiBasicUsername(e.target.value)} />
              </Field>
              <Field label="Password">
                <Input type="password" placeholder="••••••••••••" value={newApiBasicPassword} onChange={(e) => setNewApiBasicPassword(e.target.value)} />
              </Field>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setNewApiModuleId(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!newApiName} onClick={saveNewApi}>
              Add API
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
