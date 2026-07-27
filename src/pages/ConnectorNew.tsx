import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea, Field } from '@/components/ui/Input'
import { BackendEngineType, BackendAuthType } from '@/lib/connectors-store'
import { connectorApi, CreateConnectorInput, CredentialsInput, ENGINE_TYPE_OPTIONS, AUTH_TYPE_OPTIONS } from '@/lib/connector-api'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'

let draftKeySeq = 0
function draftKey() {
  draftKeySeq += 1
  return `draft_${draftKeySeq}`
}

interface DraftApi {
  key: string
  name: string
  engineType: BackendEngineType
  baseUrl: string
  authType: BackendAuthType
  bearerToken: string
  apiKeyHeader: string
  apiKeyValue: string
  basicUsername: string
  basicPassword: string
  oauthTokenUrl: string
  oauthClientId: string
  oauthClientSecret: string
}

interface DraftModule {
  key: string
  name: string
  description: string
  apis: DraftApi[]
}

function newApi(): DraftApi {
  return {
    key: draftKey(),
    name: '',
    engineType: 'REST',
    baseUrl: '',
    authType: 'oauth2',
    bearerToken: '',
    apiKeyHeader: '',
    apiKeyValue: '',
    basicUsername: '',
    basicPassword: '',
    oauthTokenUrl: '',
    oauthClientId: '',
    oauthClientSecret: '',
  }
}

function newModule(name: string): DraftModule {
  return { key: draftKey(), name, description: '', apis: [newApi()] }
}

function buildCredentials(api: DraftApi): CredentialsInput | undefined {
  if (api.authType === 'bearer' && api.bearerToken) return { authType: 'bearer', bearerToken: api.bearerToken }
  if (api.authType === 'api_key' && api.apiKeyValue) return { authType: 'api_key', apiKeyHeader: api.apiKeyHeader, apiKeyValue: api.apiKeyValue }
  if (api.authType === 'basic' && api.basicPassword)
    return { authType: 'basic', basicUsername: api.basicUsername, basicPassword: api.basicPassword }
  if (api.authType === 'oauth2' && api.oauthClientSecret)
    return { authType: 'oauth2', tokenUrl: api.oauthTokenUrl, clientId: api.oauthClientId, clientSecret: api.oauthClientSecret }
  return undefined
}

export default function ConnectorNew() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modules, setModules] = useState<DraftModule[]>([newModule('General')])
  const [step, setStep] = useState<'identity' | 'structure'>('identity')
  const [submitting, setSubmitting] = useState(false)

  function updateModule(key: string, patch: Partial<DraftModule>) {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)))
  }

  function updateApi(moduleKey: string, apiKey: string, patch: Partial<DraftApi>) {
    setModules((prev) =>
      prev.map((m) => (m.key !== moduleKey ? m : { ...m, apis: m.apis.map((a) => (a.key === apiKey ? { ...a, ...patch } : a)) })),
    )
  }

  function addModule() {
    setModules((prev) => [...prev, newModule('')])
  }

  function removeModule(key: string) {
    setModules((prev) => (prev.length > 1 ? prev.filter((m) => m.key !== key) : prev))
  }

  function addApi(moduleKey: string) {
    setModules((prev) => prev.map((m) => (m.key === moduleKey ? { ...m, apis: [...m.apis, newApi()] } : m)))
  }

  function removeApi(moduleKey: string, apiKey: string) {
    setModules((prev) =>
      prev.map((m) => (m.key !== moduleKey || m.apis.length <= 1 ? m : { ...m, apis: m.apis.filter((a) => a.key !== apiKey) })),
    )
  }

  const totalApis = modules.reduce((s, m) => s + m.apis.length, 0)

  async function createConnector() {
    setSubmitting(true)
    const payload: CreateConnectorInput = {
      name,
      glyph: name.slice(0, 2).toUpperCase() || 'CN',
      description,
      modules: modules.map((m, mi) => ({
        name: m.name || `Module ${mi + 1}`,
        description: m.description,
        apis: m.apis.map((a, ai) => ({
          name: a.name || `API ${ai + 1}`,
          engineType: a.engineType,
          baseUrl: a.baseUrl,
          authType: a.authType,
          credentials: buildCredentials(a),
        })),
      })),
    }
    try {
      const result = await connectorApi.create(payload)
      toast.success(`"${name}" created`)
      navigate(`/connectors/${result.connector.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create this connector. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="Add connector" subtitle="Turn one or more APIs into MCP tools" backTo="/connectors" maxWidth="880px">
      {step === 'identity' ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Connector identity</CardTitle>
              <CardDescription>
                You'll add its modules and APIs next — one connector can expose several APIs grouped by process (e.g. bidding vs.
                awarding in an ERP).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Connector name">
              <Input placeholder="e.g. Legacy ERP" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description" hint="Shown to teammates browsing connectors.">
              <Textarea rows={3} placeholder="What does this connector cover?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="flex justify-end border-t border-border/10 pt-4">
              <Button variant="primary" disabled={!name} onClick={() => setStep('structure')}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => (
            <Card key={module.key}>
              <CardHeader>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Module name, e.g. Bidding"
                    value={module.name}
                    onChange={(e) => updateModule(module.key, { name: e.target.value })}
                    className="max-w-xs font-medium"
                  />
                  <Input
                    placeholder="What does this module cover?"
                    value={module.description}
                    onChange={(e) => updateModule(module.key, { description: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <button
                  onClick={() => removeModule(module.key)}
                  disabled={modules.length <= 1}
                  className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad disabled:opacity-30"
                  title="Remove module"
                >
                  <Trash2 size={14} />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                {module.apis.map((api) => (
                  <div key={api.key} className="space-y-4 rounded-xl border border-border-strong/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Input
                        placeholder="API name, e.g. Bidding SOAP API"
                        value={api.name}
                        onChange={(e) => updateApi(module.key, api.key, { name: e.target.value })}
                        className="max-w-sm"
                      />
                      <button
                        onClick={() => removeApi(module.key, api.key)}
                        disabled={module.apis.length <= 1}
                        className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad disabled:opacity-30"
                        title="Remove api"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {ENGINE_TYPE_OPTIONS.map((k) => (
                        <button
                          key={k.value}
                          onClick={() => updateApi(module.key, api.key, { engineType: k.value })}
                          className={cn(
                            'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                            api.engineType === k.value
                              ? 'border-signal/50 bg-signal/5 shadow-[0_0_0_1px_rgb(var(--signal)/0.3)]'
                              : 'border-border-strong/15 hover:border-border-strong/30',
                          )}
                        >
                          <span>
                            <span className="block text-xs font-medium text-ink">{k.label}</span>
                            <span className="block text-[11px] text-faint">{k.desc}</span>
                          </span>
                          {api.engineType === k.value && <Check size={13} className="ml-auto shrink-0 text-signal" />}
                        </button>
                      ))}
                    </div>

                    <Field label="Base URL" hint="Requests are routed through this host.">
                      <Input
                        placeholder="https://api.example.com/v1"
                        value={api.baseUrl}
                        onChange={(e) => updateApi(module.key, api.key, { baseUrl: e.target.value })}
                      />
                    </Field>

                    <Field label="Authentication">
                      <Select value={api.authType} onChange={(e) => updateApi(module.key, api.key, { authType: e.target.value as BackendAuthType })}>
                        {AUTH_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    {api.authType === 'oauth2' && (
                      <div className="space-y-3">
                        <Field label="Token URL">
                          <Input
                            placeholder="https://api.example.com/oauth/token"
                            value={api.oauthTokenUrl}
                            onChange={(e) => updateApi(module.key, api.key, { oauthTokenUrl: e.target.value })}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Client ID">
                            <Input placeholder="client_9f2a" value={api.oauthClientId} onChange={(e) => updateApi(module.key, api.key, { oauthClientId: e.target.value })} />
                          </Field>
                          <Field label="Client secret">
                            <Input
                              type="password"
                              placeholder="••••••••••••"
                              value={api.oauthClientSecret}
                              onChange={(e) => updateApi(module.key, api.key, { oauthClientSecret: e.target.value })}
                            />
                          </Field>
                        </div>
                      </div>
                    )}

                    {api.authType === 'bearer' && (
                      <Field label="Bearer token">
                        <Input
                          type="password"
                          placeholder="••••••••••••"
                          value={api.bearerToken}
                          onChange={(e) => updateApi(module.key, api.key, { bearerToken: e.target.value })}
                        />
                      </Field>
                    )}

                    {api.authType === 'api_key' && (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Header name">
                          <Input placeholder="X-API-Key" value={api.apiKeyHeader} onChange={(e) => updateApi(module.key, api.key, { apiKeyHeader: e.target.value })} />
                        </Field>
                        <Field label="API key">
                          <Input type="password" placeholder="••••••••••••" value={api.apiKeyValue} onChange={(e) => updateApi(module.key, api.key, { apiKeyValue: e.target.value })} />
                        </Field>
                      </div>
                    )}

                    {api.authType === 'basic' && (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Username">
                          <Input placeholder="service-account" value={api.basicUsername} onChange={(e) => updateApi(module.key, api.key, { basicUsername: e.target.value })} />
                        </Field>
                        <Field label="Password">
                          <Input type="password" placeholder="••••••••••••" value={api.basicPassword} onChange={(e) => updateApi(module.key, api.key, { basicPassword: e.target.value })} />
                        </Field>
                      </div>
                    )}
                  </div>
                ))}

                <Button variant="secondary" size="sm" onClick={() => addApi(module.key)}>
                  <Plus size={13} /> Add API to this module
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button variant="secondary" onClick={addModule}>
            <Plus size={14} /> Add module
          </Button>

          <div className="flex items-center justify-between border-t border-border/10 pt-4">
            <Button variant="ghost" onClick={() => setStep('identity')}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-faint">
                {modules.length} module{modules.length === 1 ? '' : 's'} · {totalApis} api{totalApis === 1 ? '' : 's'}
              </span>
              <Button variant="primary" onClick={createConnector} disabled={!name || submitting}>
                {submitting ? 'Creating…' : 'Create connector'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
