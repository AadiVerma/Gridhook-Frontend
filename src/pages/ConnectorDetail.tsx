import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Wrench, Play, Trash2, Pencil, Check, X, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusPill, Tone } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Field, Textarea } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { BackendEngineType, BackendAuthType } from '@/lib/connectors-store'
import {
  connectorApi,
  ConnectorDetail as ConnectorDetailModel,
  ModuleWithApis,
  ConnectorApi,
  Tool,
  CredentialsInput,
  ENGINE_TYPE_OPTIONS,
  AUTH_TYPE_OPTIONS,
} from '@/lib/connector-api'
import { ApiError } from '@/lib/api-client'
import { ToolParamsEditor } from '@/components/tool-params/ToolParamsEditor'
import { CodeEditor } from '@/components/tool-params/CodeEditor'
import { createEmptyParamsState, parseToolParameters, buildToolParameters, isToolParamsValid, ToolParamsFormState } from '@/lib/tool-params'

const engineTone: Record<BackendEngineType, Tone> = {
  REST: 'signal',
  GRAPHQL: 'violet',
  SOAP: 'warn',
}

const engineLabel = Object.fromEntries(ENGINE_TYPE_OPTIONS.map((o) => [o.value, o.label.replace(' API', '').replace(' / XML', '')])) as Record<
  BackendEngineType,
  string
>

const authLabel = Object.fromEntries(AUTH_TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<BackendAuthType, string>

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

interface TargetTool {
  apiId: string
  tool: Tool
}

export default function ConnectorDetail() {
  const { id } = useParams()
  const connectorId = id ?? ''

  const [connector, setConnector] = useState<ConnectorDetailModel | null>(null)
  const [modules, setModules] = useState<ModuleWithApis[]>([])
  const [unassignedApis, setUnassignedApis] = useState<ConnectorApi[]>([])
  const [toolsByApi, setToolsByApi] = useState<Record<string, Tool[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [conn, moduleGroups, allApis] = await Promise.all([
        connectorApi.get(connectorId),
        connectorApi.listModules(connectorId),
        connectorApi.listApis(connectorId),
      ])
      const assignedIds = new Set(moduleGroups.flatMap((g) => g.apis.map((a) => a.id)))
      const unassigned = allApis.filter((a) => !assignedIds.has(a.id))
      const toolLists = await Promise.all(allApis.map((a) => connectorApi.listTools(connectorId, a.id).catch(() => [] as Tool[])))
      setConnector(conn)
      setModules(moduleGroups)
      setUnassignedApis(unassigned)
      setToolsByApi(Object.fromEntries(allApis.map((a, i) => [a.id, toolLists[i]])))
    } catch (err) {
      setError(errorMessage(err, 'Unable to load this connector.'))
    } finally {
      setLoading(false)
    }
  }, [connectorId])

  useEffect(() => {
    if (connectorId) fetchAll()
  }, [connectorId, fetchAll])

  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ apiId: string; tool: string; ok: boolean; detail?: string } | null>(null)
  const [runningToolTarget, setRunningToolTarget] = useState<TargetTool | null>(null)
  const [runInputText, setRunInputText] = useState('{}')

  const [pendingDeleteTool, setPendingDeleteTool] = useState<TargetTool | null>(null)

  const [toolModalTarget, setToolModalTarget] = useState<{ apiId: string; tool: Tool | null } | null>(null)
  const [toolName, setToolName] = useState('')
  const [toolMethod, setToolMethod] = useState<Tool['method']>('GET')
  const [toolPath, setToolPath] = useState('')
  const [toolDescription, setToolDescription] = useState('')
  const [toolParamsState, setToolParamsState] = useState<ToolParamsFormState>(createEmptyParamsState('REST'))
  const [toolCacheTtl, setToolCacheTtl] = useState(0)
  const [savingTool, setSavingTool] = useState(false)

  const [editingApi, setEditingApi] = useState<ConnectorApi | null>(null)
  const [editName, setEditName] = useState('')
  // '' is the "Unassigned" sentinel — real group ids are opaque encoded strings that can never be empty.
  const [editGroupId, setEditGroupId] = useState('')
  const [editEngineType, setEditEngineType] = useState<BackendEngineType>('REST')
  const [editBaseUrl, setEditBaseUrl] = useState('')
  const [editAuthType, setEditAuthType] = useState<BackendAuthType>('oauth2')
  const [editBearerToken, setEditBearerToken] = useState('')
  const [editApiKeyHeader, setEditApiKeyHeader] = useState('')
  const [editApiKeyValue, setEditApiKeyValue] = useState('')
  const [editBasicUsername, setEditBasicUsername] = useState('')
  const [editBasicPassword, setEditBasicPassword] = useState('')
  const [editOauthTokenUrl, setEditOauthTokenUrl] = useState('')
  const [editOauthClientId, setEditOauthClientId] = useState('')
  const [editOauthClientSecret, setEditOauthClientSecret] = useState('')
  const [savingApi, setSavingApi] = useState(false)

  const [moduleModalOpen, setModuleModalOpen] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')
  const [savingModule, setSavingModule] = useState(false)

  const [newApiGroupId, setNewApiGroupId] = useState<string | null | 'unassigned'>(null)
  const [newApiName, setNewApiName] = useState('')
  const [newApiEngineType, setNewApiEngineType] = useState<BackendEngineType>('REST')
  const [newApiBaseUrl, setNewApiBaseUrl] = useState('')
  const [newApiAuthType, setNewApiAuthType] = useState<BackendAuthType>('oauth2')
  const [newApiBearerToken, setNewApiBearerToken] = useState('')
  const [newApiKeyHeader, setNewApiKeyHeader] = useState('')
  const [newApiKeyValue, setNewApiKeyValue] = useState('')
  const [newApiBasicUsername, setNewApiBasicUsername] = useState('')
  const [newApiBasicPassword, setNewApiBasicPassword] = useState('')
  const [newApiOauthTokenUrl, setNewApiOauthTokenUrl] = useState('')
  const [newApiOauthClientId, setNewApiOauthClientId] = useState('')
  const [newApiOauthClientSecret, setNewApiOauthClientSecret] = useState('')
  const [savingNewApi, setSavingNewApi] = useState(false)

  if (loading) {
    return (
      <AppShell title="Connector" backTo="/connectors">
        <Card className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong/30 border-t-signal" />
          <p className="text-sm text-muted">Loading connector…</p>
        </Card>
      </AppShell>
    )
  }

  if (error || !connector) {
    return (
      <AppShell title="Connector" backTo="/connectors">
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <p className="text-sm font-medium text-ink">Couldn't load this connector</p>
          <p className="text-xs text-muted">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={fetchAll}>
            <RefreshCw size={13} /> Retry
          </Button>
        </Card>
      </AppShell>
    )
  }

  const totalApis = modules.reduce((s, m) => s + m.apis.length, 0) + unassignedApis.length

  async function toggleConnectorActive() {
    if (!connector) return
    try {
      const updated = await connectorApi.toggle(connector.id, connector.status !== 'active')
      setConnector(updated)
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't update connector status"))
    }
  }

  async function toggleApiActive(api: ConnectorApi) {
    try {
      const updated = await connectorApi.patchApi(connectorId, api.id, { isActive: !api.isActive })
      applyApiUpdate(updated)
    } catch (err) {
      toast.error(errorMessage(err, `Couldn't update "${api.name}"`))
    }
  }

  function applyApiUpdate(updated: ConnectorApi) {
    setModules((prev) => prev.map((g) => ({ ...g, apis: g.apis.map((a) => (a.id === updated.id ? updated : a)) })))
    setUnassignedApis((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  function openEditApi(api: ConnectorApi) {
    setEditingApi(api)
    setEditName(api.name)
    setEditGroupId(api.groupId ?? '')
    setEditEngineType(api.engineType)
    setEditBaseUrl(api.baseUrl)
    setEditAuthType(api.authType)
    setEditBearerToken('')
    setEditApiKeyHeader('')
    setEditApiKeyValue('')
    setEditBasicUsername('')
    setEditBasicPassword('')
    setEditOauthTokenUrl('')
    setEditOauthClientId('')
    setEditOauthClientSecret('')
  }

  function buildEditCredentials(): CredentialsInput | undefined {
    if (editAuthType === 'bearer' && editBearerToken) return { authType: 'bearer', bearerToken: editBearerToken }
    if (editAuthType === 'api_key' && editApiKeyValue) return { authType: 'api_key', apiKeyHeader: editApiKeyHeader, apiKeyValue: editApiKeyValue }
    if (editAuthType === 'basic' && editBasicPassword)
      return { authType: 'basic', basicUsername: editBasicUsername, basicPassword: editBasicPassword }
    if (editAuthType === 'oauth2' && editOauthClientSecret)
      return { authType: 'oauth2', tokenUrl: editOauthTokenUrl, clientId: editOauthClientId, clientSecret: editOauthClientSecret }
    return undefined
  }

  async function saveApiEdit() {
    if (!editingApi) return
    setSavingApi(true)
    try {
      const updated = await connectorApi.patchApi(connectorId, editingApi.id, {
        name: editName,
        baseUrl: editBaseUrl,
        authType: editAuthType,
        groupId: editGroupId || null,
      })
      const credentials = buildEditCredentials()
      if (credentials) await connectorApi.putCredentials(connectorId, editingApi.id, credentials)
      applyApiUpdate(updated)
      if (editGroupId !== (editingApi.groupId ?? '')) await fetchAll()
      setEditingApi(null)
      toast.success('API settings saved')
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save API settings"))
    } finally {
      setSavingApi(false)
    }
  }

  async function saveNewModule() {
    setSavingModule(true)
    try {
      await connectorApi.createModule(connectorId, { name: newModuleName, description: newModuleDescription, apis: [] })
      setNewModuleName('')
      setNewModuleDescription('')
      setModuleModalOpen(false)
      toast.success(`Module "${newModuleName}" added`)
      await fetchAll()
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't add module"))
    } finally {
      setSavingModule(false)
    }
  }

  function openNewApi(groupId: string | 'unassigned') {
    setNewApiGroupId(groupId)
    setNewApiName('')
    setNewApiEngineType('REST')
    setNewApiBaseUrl('')
    setNewApiAuthType('oauth2')
    setNewApiBearerToken('')
    setNewApiKeyHeader('')
    setNewApiKeyValue('')
    setNewApiBasicUsername('')
    setNewApiBasicPassword('')
    setNewApiOauthTokenUrl('')
    setNewApiOauthClientId('')
    setNewApiOauthClientSecret('')
  }

  function buildNewApiCredentials(): CredentialsInput | undefined {
    if (newApiAuthType === 'bearer' && newApiBearerToken) return { authType: 'bearer', bearerToken: newApiBearerToken }
    if (newApiAuthType === 'api_key' && newApiKeyValue) return { authType: 'api_key', apiKeyHeader: newApiKeyHeader, apiKeyValue: newApiKeyValue }
    if (newApiAuthType === 'basic' && newApiBasicPassword)
      return { authType: 'basic', basicUsername: newApiBasicUsername, basicPassword: newApiBasicPassword }
    if (newApiAuthType === 'oauth2' && newApiOauthClientSecret)
      return { authType: 'oauth2', tokenUrl: newApiOauthTokenUrl, clientId: newApiOauthClientId, clientSecret: newApiOauthClientSecret }
    return undefined
  }

  async function saveNewApi() {
    if (newApiGroupId === null) return
    setSavingNewApi(true)
    try {
      await connectorApi.createApi(connectorId, {
        name: newApiName,
        engineType: newApiEngineType,
        baseUrl: newApiBaseUrl,
        authType: newApiAuthType,
        credentials: buildNewApiCredentials(),
        ...(newApiGroupId !== 'unassigned' ? { groupId: newApiGroupId } : {}),
      })
      setNewApiGroupId(null)
      toast.success(`API "${newApiName}" added`)
      await fetchAll()
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't add API"))
    } finally {
      setSavingNewApi(false)
    }
  }

  function findApi(apiId: string): ConnectorApi | undefined {
    return modules.flatMap((g) => g.apis).concat(unassignedApis).find((a) => a.id === apiId)
  }

  function runTool(apiId: string, tool: Tool) {
    setRunningToolTarget({ apiId, tool })
    setRunInputText('{}')
  }

  async function confirmRunTool() {
    if (!runningToolTarget) return
    const { apiId, tool } = runningToolTarget
    let input: unknown
    try {
      input = runInputText.trim() ? JSON.parse(runInputText) : {}
    } catch {
      toast.error('Input must be valid JSON')
      return
    }
    setRunningId(tool.id)
    setRunningToolTarget(null)
    try {
      await connectorApi.runTool(connectorId, tool.id, input)
      setRunResult({ apiId, tool: tool.name, ok: true })
    } catch (err) {
      setRunResult({ apiId, tool: tool.name, ok: false, detail: errorMessage(err, 'Run failed') })
    } finally {
      setRunningId(null)
      setTimeout(() => setRunResult(null), 3000)
    }
  }

  function openNewTool(apiId: string) {
    const engineType = findApi(apiId)?.engineType ?? 'REST'
    setToolModalTarget({ apiId, tool: null })
    setToolName('')
    setToolMethod(engineType === 'REST' ? 'GET' : 'POST')
    setToolPath('')
    setToolDescription('')
    setToolParamsState(createEmptyParamsState(engineType))
    setToolCacheTtl(0)
  }

  function openEditTool(apiId: string, tool: Tool) {
    setToolModalTarget({ apiId, tool })
    setToolName(tool.name)
    setToolMethod(tool.method)
    setToolPath(tool.path)
    setToolDescription(tool.description ?? '')
    setToolParamsState(parseToolParameters(tool.engineType, tool.parameters, tool.endpointMapping))
    setToolCacheTtl(tool.cacheTtlSeconds)
  }

  async function saveToolModal() {
    if (!toolModalTarget) return
    const { apiId, tool } = toolModalTarget
    let built: ReturnType<typeof buildToolParameters>
    try {
      built = buildToolParameters(toolParamsState)
    } catch {
      toast.error('Parameters must be valid JSON')
      return
    }
    setSavingTool(true)
    try {
      if (tool) {
        const updated = await connectorApi.patchTool(connectorId, tool.id, {
          name: toolName,
          method: toolMethod,
          path: toolPath,
          description: toolDescription,
          parameters: built.parameters,
          endpointMapping: built.endpointMapping,
          cacheTtlSeconds: toolCacheTtl,
        })
        setToolsByApi((prev) => ({ ...prev, [apiId]: (prev[apiId] ?? []).map((t) => (t.id === tool.id ? updated : t)) }))
        toast.success('Tool updated')
      } else {
        const created = await connectorApi.createTool(connectorId, apiId, {
          name: toolName,
          method: toolMethod,
          path: toolPath,
          description: toolDescription,
          parameters: built.parameters,
          endpointMapping: built.endpointMapping,
        })
        setToolsByApi((prev) => ({ ...prev, [apiId]: [...(prev[apiId] ?? []), created] }))
        setConnector((prev) => (prev ? { ...prev, toolCount: prev.toolCount + 1 } : prev))
        toast.success(`Tool "${toolName}" created`)
      }
      setToolModalTarget(null)
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save this tool"))
    } finally {
      setSavingTool(false)
    }
  }

  async function confirmDeleteTool() {
    if (!pendingDeleteTool) return
    const { apiId, tool } = pendingDeleteTool
    try {
      await connectorApi.deleteTool(connectorId, tool.id)
      setToolsByApi((prev) => ({ ...prev, [apiId]: (prev[apiId] ?? []).filter((t) => t.id !== tool.id) }))
      setConnector((prev) => (prev ? { ...prev, toolCount: Math.max(0, prev.toolCount - 1) } : prev))
      toast.success(`Tool "${tool.name}" deleted`)
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't delete this tool"))
    } finally {
      setPendingDeleteTool(null)
    }
  }

  function renderApiCard(api: ConnectorApi) {
    const tools = toolsByApi[api.id] ?? []
    return (
      <div key={api.id} className="rounded-xl border border-border-strong/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{api.name}</p>
            <p className="truncate font-mono text-[11px] text-faint">{api.baseUrl}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={engineTone[api.engineType]}>{engineLabel[api.engineType]}</Badge>
            <Badge tone="neutral">{authLabel[api.authType]}</Badge>
            <StatusPill tone={api.isActive ? 'ok' : 'neutral'}>{api.isActive ? 'active' : 'inactive'}</StatusPill>
            <Switch checked={api.isActive} onChange={() => toggleApiActive(api)} />
            <button onClick={() => openEditApi(api)} className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-ink" title="Edit API">
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted">{tools.length} callable MCP tools</p>
          <Button variant="secondary" size="sm" onClick={() => openNewTool(api.id)}>
            <Plus size={13} /> New tool
          </Button>
        </div>

        {runResult && runResult.apiId === api.id && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs animate-fade-in ${
              runResult.ok ? 'border-ok/25 bg-ok/10 text-ok' : 'border-bad/25 bg-bad/10 text-bad'
            }`}
          >
            {runResult.ok ? <Check size={13} /> : <X size={13} />}
            <span className="font-mono">{runResult.tool}</span>
            {runResult.ok ? 'ran successfully' : `failed — ${runResult.detail}`}
          </div>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-faint">
                <th className="pb-2 font-medium">Tool</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Path</th>
                <th className="pb-2 font-medium">Cache</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {tools.map((t) => (
                <tr key={t.id} className="group">
                  <td className="py-2.5 font-mono text-xs text-ink">
                    <button onClick={() => openEditTool(api.id, t)} className="flex items-center gap-1.5 hover:text-signal" title="Edit tool">
                      <Wrench size={12} className="text-signal" /> {t.name}
                      <ChevronRight size={11} className="text-faint" />
                    </button>
                  </td>
                  <td className="py-2.5">
                    <Badge tone={t.method === 'GET' ? 'info' : 'signal'}>{t.method}</Badge>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-muted">{t.path}</td>
                  <td className="py-2.5 text-xs text-muted">{t.cacheTtlSeconds ? `${t.cacheTtlSeconds}s TTL` : 'off'}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => runTool(api.id, t)}
                        disabled={runningId === t.id}
                        className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-signal disabled:opacity-40"
                        title="Run tool"
                      >
                        <Play size={13} className={runningId === t.id ? 'animate-pulse' : ''} />
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
  }

  return (
    <AppShell title={connector.name} subtitle={connector.description} backTo="/connectors">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusPill tone={connector.status === 'active' ? 'ok' : connector.status === 'error' ? 'bad' : 'neutral'}>{connector.status}</StatusPill>
        <div className="flex items-center gap-2 rounded-full border border-border-strong/15 bg-surface px-3 py-1">
          <Switch checked={connector.status === 'active'} onChange={toggleConnectorActive} />
          <span className="text-xs text-muted">{connector.status === 'active' ? 'Enabled' : 'Disabled'}</span>
        </div>
        <span className="text-xs text-faint">
          {modules.length} module{modules.length === 1 ? '' : 's'} · {totalApis} api{totalApis === 1 ? '' : 's'} · {connector.toolCount} tools
        </span>
      </div>

      <div className="space-y-4">
        {modules.map(({ module, apis }) => (
          <Card key={module.id}>
            <CardHeader>
              <div>
                <CardTitle>{module.name}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {apis.map(renderApiCard)}
              <Button variant="secondary" size="sm" onClick={() => openNewApi(module.id)}>
                <Plus size={13} /> Add API to this module
              </Button>
            </CardContent>
          </Card>
        ))}

        {unassignedApis.length > 0 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Unassigned</CardTitle>
                <CardDescription>APIs not yet grouped into a module.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {unassignedApis.map(renderApiCard)}
              <Button variant="secondary" size="sm" onClick={() => openNewApi('unassigned')}>
                <Plus size={13} /> Add API
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => setModuleModalOpen(true)}>
          <Plus size={14} /> Add module
        </Button>
      </div>

      <Modal
        open={!!toolModalTarget}
        onClose={() => setToolModalTarget(null)}
        title={toolModalTarget?.tool ? 'Edit tool' : 'New tool'}
        description={
          toolModalTarget ? `Map an endpoint on ${findApi(toolModalTarget.apiId)?.name ?? 'this API'} to a callable MCP tool` : undefined
        }
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Field label="Tool name" hint="snake_case, shown to the LLM as the callable function name">
            <Input placeholder="get_customer_balance" value={toolName} onChange={(e) => setToolName(e.target.value)} />
          </Field>

          {(() => {
            const engineType = toolModalTarget ? findApi(toolModalTarget.apiId)?.engineType : undefined
            const isRest = !engineType || engineType === 'REST'
            const pathLabel = engineType === 'SOAP' ? 'SOAP action / operation name' : engineType === 'GRAPHQL' ? 'GraphQL operation name' : 'Path'
            const pathPlaceholder =
              engineType === 'SOAP' ? 'CreatePurchaseOrder' : engineType === 'GRAPHQL' ? 'getCustomerBalance' : '/customers/{id}/balance'
            return (
              <div className={isRest ? 'grid grid-cols-3 gap-3' : ''}>
                {isRest && (
                  <Field label="Method">
                    <Select value={toolMethod} onChange={(e) => setToolMethod(e.target.value as Tool['method'])}>
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </Select>
                  </Field>
                )}
                <div className={isRest ? 'col-span-2' : ''}>
                  <Field label={pathLabel}>
                    <Input placeholder={pathPlaceholder} value={toolPath} onChange={(e) => setToolPath(e.target.value)} />
                  </Field>
                </div>
              </div>
            )
          })()}

          <Field label="Description" hint="Helps the model decide when to call this tool.">
            <Textarea rows={2} placeholder="Returns the outstanding balance for a customer." value={toolDescription} onChange={(e) => setToolDescription(e.target.value)} />
          </Field>

          <Field label="Cache TTL (seconds)" hint="0 disables caching.">
            <Input
              type="number"
              min={0}
              value={toolCacheTtl}
              onChange={(e) => setToolCacheTtl(Number(e.target.value) || 0)}
            />
          </Field>

          <ToolParamsEditor
            state={toolParamsState}
            onChange={setToolParamsState}
            method={toolMethod}
            engineType={(toolModalTarget ? findApi(toolModalTarget.apiId)?.engineType : undefined) ?? 'REST'}
          />
          {!isToolParamsValid(toolParamsState) && <p className="text-xs text-bad">Parameters are incomplete or invalid.</p>}

          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setToolModalTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!toolName || !isToolParamsValid(toolParamsState) || savingTool} onClick={saveToolModal}>
              {savingTool ? 'Saving…' : toolModalTarget?.tool ? 'Save changes' : 'Save tool'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!runningToolTarget}
        onClose={() => setRunningToolTarget(null)}
        title={runningToolTarget ? `Run ${runningToolTarget.tool.name}` : undefined}
        description="Dispatches the call live against the API's configured base URL."
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Field label="Input (JSON)">
            <CodeEditor lang="json" value={runInputText} onChange={setRunInputText} placeholder="{}" />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setRunningToolTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmRunTool}>
              <Play size={13} /> Run
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!pendingDeleteTool}
        onClose={() => setPendingDeleteTool(null)}
        title="Delete tool"
        description={
          pendingDeleteTool ? `This removes "${pendingDeleteTool.tool.name}" from every MCP server it's exposed on. This cannot be undone.` : undefined
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
            <Field label="Module" hint="Move this API to a different module, or unassign it.">
              <Select value={editGroupId} onChange={(e) => setEditGroupId(e.target.value)}>
                <option value="">Unassigned</option>
                {modules.map(({ module }) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={editEngineType} disabled className="opacity-60">
                  <option>{engineLabel[editEngineType]}</option>
                </Select>
              </Field>
              <Field label="Authentication">
                <Select value={editAuthType} onChange={(e) => setEditAuthType(e.target.value as BackendAuthType)}>
                  {AUTH_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Base URL">
              <Input value={editBaseUrl} onChange={(e) => setEditBaseUrl(e.target.value)} className="font-mono" />
            </Field>

            {editAuthType === 'oauth2' && (
              <div className="space-y-3">
                <Field label="Token URL" hint="Leave blank to keep the existing value.">
                  <Input value={editOauthTokenUrl} onChange={(e) => setEditOauthTokenUrl(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client ID">
                    <Input value={editOauthClientId} onChange={(e) => setEditOauthClientId(e.target.value)} />
                  </Field>
                  <Field label="Client secret" hint="Leave blank to keep the existing secret.">
                    <Input type="password" placeholder="••••••••••••" value={editOauthClientSecret} onChange={(e) => setEditOauthClientSecret(e.target.value)} />
                  </Field>
                </div>
              </div>
            )}
            {editAuthType === 'bearer' && (
              <Field label="Bearer token" hint="Leave blank to keep the existing token.">
                <Input type="password" placeholder="••••••••••••" value={editBearerToken} onChange={(e) => setEditBearerToken(e.target.value)} />
              </Field>
            )}
            {editAuthType === 'api_key' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Header name">
                  <Input value={editApiKeyHeader} onChange={(e) => setEditApiKeyHeader(e.target.value)} />
                </Field>
                <Field label="API key" hint="Leave blank to keep the existing key.">
                  <Input type="password" placeholder="••••••••••••" value={editApiKeyValue} onChange={(e) => setEditApiKeyValue(e.target.value)} />
                </Field>
              </div>
            )}
            {editAuthType === 'basic' && (
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
              <Button variant="primary" size="sm" disabled={!editName || savingApi} onClick={saveApiEdit}>
                {savingApi ? 'Saving…' : 'Save changes'}
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
            <Button variant="primary" size="sm" disabled={!newModuleName || savingModule} onClick={saveNewModule}>
              {savingModule ? 'Adding…' : 'Add module'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={newApiGroupId !== null}
        onClose={() => setNewApiGroupId(null)}
        title="New API"
        description={(() => {
          if (newApiGroupId === 'unassigned') return 'Add an unassigned API to this connector.'
          const m = modules.find((g) => g.module.id === newApiGroupId)
          return m ? `Add an API surface to ${m.module.name}.` : undefined
        })()}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Field label="API name">
            <Input placeholder="e.g. Bidding SOAP API" value={newApiName} onChange={(e) => setNewApiName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={newApiEngineType} onChange={(e) => setNewApiEngineType(e.target.value as BackendEngineType)}>
                {ENGINE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {engineLabel[o.value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Authentication">
              <Select value={newApiAuthType} onChange={(e) => setNewApiAuthType(e.target.value as BackendAuthType)}>
                {AUTH_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Base URL">
            <Input placeholder="https://api.example.com/v1" value={newApiBaseUrl} onChange={(e) => setNewApiBaseUrl(e.target.value)} />
          </Field>

          {newApiAuthType === 'oauth2' && (
            <div className="space-y-3">
              <Field label="Token URL">
                <Input value={newApiOauthTokenUrl} onChange={(e) => setNewApiOauthTokenUrl(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client ID">
                  <Input value={newApiOauthClientId} onChange={(e) => setNewApiOauthClientId(e.target.value)} />
                </Field>
                <Field label="Client secret">
                  <Input type="password" placeholder="••••••••••••" value={newApiOauthClientSecret} onChange={(e) => setNewApiOauthClientSecret(e.target.value)} />
                </Field>
              </div>
            </div>
          )}
          {newApiAuthType === 'bearer' && (
            <Field label="Bearer token">
              <Input type="password" placeholder="••••••••••••" value={newApiBearerToken} onChange={(e) => setNewApiBearerToken(e.target.value)} />
            </Field>
          )}
          {newApiAuthType === 'api_key' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Header name">
                <Input placeholder="X-API-Key" value={newApiKeyHeader} onChange={(e) => setNewApiKeyHeader(e.target.value)} />
              </Field>
              <Field label="API key">
                <Input type="password" placeholder="••••••••••••" value={newApiKeyValue} onChange={(e) => setNewApiKeyValue(e.target.value)} />
              </Field>
            </div>
          )}
          {newApiAuthType === 'basic' && (
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
            <Button variant="secondary" size="sm" onClick={() => setNewApiGroupId(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!newApiName || savingNewApi} onClick={saveNewApi}>
              {savingNewApi ? 'Adding…' : 'Add API'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
