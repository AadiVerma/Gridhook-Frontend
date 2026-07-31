import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Copy,
  Check,
  Plus,
  KeyRound,
  Trash2,
  AlertTriangle,
  Layers,
  Activity,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Field } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-client'
import { McpServer, McpServerApiKey, McpTool, ToolGroup, mcpApi } from '@/lib/mcp-api'
import { AuditLogEntry, InvocationStatus, auditApi } from '@/lib/audit-api'
import { cn } from '@/lib/utils'

const statusTone: Record<InvocationStatus, 'ok' | 'bad' | 'warn'> = {
  success: 'ok',
  error: 'bad',
  timeout: 'warn',
}

export default function McpServerDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [server, setServer] = useState<McpServer | null>(null)
  const [tools, setTools] = useState<McpTool[]>([])
  const [keys, setKeys] = useState<McpServerApiKey[]>([])
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [statusPending, setStatusPending] = useState(false)

  const [settings, setSettings] = useState({ name: '', description: '', customInstructions: '' })
  const [savingSettings, setSavingSettings] = useState(false)

  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [savingGroups, setSavingGroups] = useState(false)

  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [keyLabel, setKeyLabel] = useState('')
  const [keyLive, setKeyLive] = useState(true)
  const [mintingKey, setMintingKey] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [keyAcknowledged, setKeyAcknowledged] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const syncSettingsForm = useCallback((next: McpServer) => {
    setSettings({ name: next.name, description: next.description, customInstructions: next.customInstructions })
  }, [])

  // Reseeds both editable forms — only for a fresh load. Incidental updates (a status flip, a
  // key being minted) call setServer alone so they can't discard unsaved edits in either form.
  const syncFromServer = useCallback(
    (next: McpServer) => {
      setServer(next)
      syncSettingsForm(next)
      setSelectedGroups(next.toolGroupIds)
    },
    [syncSettingsForm],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Nothing here depends on anything but the id, so fire them together.
      const [srv, toolList, keyList, logPage, groupList] = await Promise.all([
        mcpApi.get(id),
        mcpApi.listTools(id),
        mcpApi.listApiKeys(id),
        auditApi.list({ server: id, pageSize: 20 }),
        mcpApi.listToolGroups(),
      ])
      syncFromServer(srv)
      setTools(toolList)
      setKeys(keyList)
      setLogs(logPage.data)
      setGroups(groupList)
    } catch (err) {
      setError(errorMessage(err, 'Unable to load this MCP server.'))
    } finally {
      setLoading(false)
    }
  }, [id, syncFromServer])

  useEffect(() => {
    load()
  }, [load])

  /** Re-read the server and its resolved tool list — the only confirmation an attachment landed. */
  async function refreshAttachment() {
    const [srv, toolList] = await Promise.all([mcpApi.get(id), mcpApi.listTools(id)])
    setServer(srv)
    setSelectedGroups(srv.toolGroupIds)
    setTools(toolList)
  }

  async function toggleStatus() {
    if (!server) return
    const next = server.status === 'running' ? 'stopped' : 'running'
    setStatusPending(true)
    try {
      setServer(await mcpApi.setStatus(id, next))
      toast.success(next === 'running' ? 'Server started' : 'Server stopped — every call now returns 503')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change the server status.'))
    } finally {
      setStatusPending(false)
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const updated = await mcpApi.update(id, {
        name: settings.name.trim(),
        description: settings.description,
        customInstructions: settings.customInstructions,
      })
      setServer(updated)
      syncSettingsForm(updated)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save settings.'))
    } finally {
      setSavingSettings(false)
    }
  }

  async function saveGroups() {
    setSavingGroups(true)
    try {
      // Full replace — the complete desired set, not a delta.
      await mcpApi.setToolGroups(id, selectedGroups)
      await refreshAttachment()
      toast.success('Tool groups updated')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the attached tool groups.'))
      // Put the checkboxes back to what the server actually has.
      if (server) setSelectedGroups(server.toolGroupIds)
    } finally {
      setSavingGroups(false)
    }
  }

  async function mintKey() {
    setMintingKey(true)
    try {
      const created = await mcpApi.createApiKey(id, { label: keyLabel.trim(), live: keyLive })
      setKeyModalOpen(false)
      setKeyLabel('')
      setKeyAcknowledged(false)
      setKeyCopied(false)
      setNewKey(created.key)
      // Refetch the server too: apiKeyCount is a computed field, not something we can increment.
      const [keyList, srv] = await Promise.all([mcpApi.listApiKeys(id), mcpApi.get(id)])
      setKeys(keyList)
      setServer(srv)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the API key.'))
    } finally {
      setMintingKey(false)
    }
  }

  async function revokeKey(key: McpServerApiKey) {
    try {
      await mcpApi.revokeApiKey(id, key.id)
      const [keyList, srv] = await Promise.all([mcpApi.listApiKeys(id), mcpApi.get(id)])
      setKeys(keyList)
      setServer(srv)
      toast.success(`"${key.label || key.keyPrefix}" revoked — the next request with it gets a 401`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not revoke the key.'))
    }
  }

  async function deleteServer() {
    setDeleting(true)
    try {
      await mcpApi.delete(id)
      toast.success('Server deleted')
      navigate('/mcp-servers')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the server.'))
      setDeleting(false)
    }
  }

  function copyEndpoint() {
    if (!server) return
    navigator.clipboard?.writeText(server.endpoint).catch(() => {})
    setCopied(true)
    toast.success('Endpoint copied')
    setTimeout(() => setCopied(false), 1500)
  }

  // The server's own tool list resolves the opaque tool ids on its audit rows for free.
  const toolNames = useMemo(() => {
    const map: Record<string, string> = {}
    tools.forEach((t) => {
      map[t.id] = t.name
    })
    return map
  }, [tools])

  const settingsDirty =
    !!server &&
    (settings.name !== server.name ||
      settings.description !== server.description ||
      settings.customInstructions !== server.customInstructions)

  const groupsDirty =
    !!server &&
    (selectedGroups.length !== server.toolGroupIds.length ||
      selectedGroups.some((g) => !server.toolGroupIds.includes(g)))

  const activeKeys = keys.filter((k) => !k.revokedAt)

  if (loading) {
    return (
      <AppShell title="MCP Server" backTo="/mcp-servers">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="animate-pulse space-y-3 p-5">
                  <div className="h-3 w-32 rounded bg-faint/10" />
                  <div className="h-9 w-full rounded-lg bg-faint/10" />
                  <div className="h-9 w-full rounded-lg bg-faint/10" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="animate-pulse space-y-3 p-5">
              <div className="h-3 w-28 rounded bg-faint/10" />
              <div className="h-16 w-full rounded-lg bg-faint/10" />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (error || !server) {
    return (
      <AppShell title="MCP Server" backTo="/mcp-servers">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <AlertTriangle size={20} className="text-bad" />
            <p className="text-sm text-ink">{error ?? 'Server not found.'}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={load}>
                Retry
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mcp-servers')}>
                Back to servers
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={server.name || 'Untitled server'}
      subtitle={`/${server.slug}`}
      backTo="/mcp-servers"
      actions={
        <div className="flex items-center gap-2.5">
          <StatusPill tone={server.status === 'running' ? 'ok' : 'neutral'}>{server.status}</StatusPill>
          <Switch
            checked={server.status === 'running'}
            onChange={() => !statusPending && toggleStatus()}
            className={statusPending ? 'opacity-50' : undefined}
          />
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      }
    >
      {server.status === 'stopped' && (
        <div className="mb-4 flex gap-2.5 rounded-xl border border-warn/25 bg-warn/5 p-3.5">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-warn" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-medium text-ink">This server is stopped.</p>
            <p className="mt-0.5">
              Every request to it returns <code>503 server_stopped</code>. Nothing has been deleted — flip the toggle above to
              restore it.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Server settings</CardTitle>
                <CardDescription>Name and description are editable. The slug is not.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Name">
                <Input value={settings.name} onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))} />
              </Field>
              <Field label="Slug" hint="Permanent — it's part of the public URL and the API has no rename path.">
                <Input value={server.slug} readOnly disabled className="font-mono text-muted" />
              </Field>
              <Field label="Description">
                <Textarea
                  rows={2}
                  value={settings.description}
                  onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
                />
              </Field>
              <Field
                label="Custom instructions"
                hint="Stored, but nothing reads it yet — it's reserved for the MCP initialize handshake, which isn't built."
              >
                <Textarea
                  rows={3}
                  placeholder="Always confirm destructive actions before calling write tools."
                  value={settings.customInstructions}
                  onChange={(e) => setSettings((s) => ({ ...s, customInstructions: e.target.value }))}
                />
              </Field>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" disabled={!settingsDirty || savingSettings} onClick={saveSettings}>
                  {savingSettings ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Attached tool groups</CardTitle>
                <CardDescription>
                  A tool reaches an agent only if it's in a group and that group is attached here.
                </CardDescription>
              </div>
              {groupsDirty && (
                <Button variant="primary" size="sm" disabled={savingGroups} onClick={saveGroups}>
                  {savingGroups ? 'Saving…' : 'Save attachment'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.length === 0 ? (
                <p className="py-3 text-center text-xs text-faint">
                  No tool groups exist in this organization yet. Create one from a connector first.
                </p>
              ) : (
                <div className="divide-y divide-border/10">
                  {groups.map((g) => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-3 py-2.5 first:pt-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas/60 border border-border/10 text-faint">
                        <Layers size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{g.name}</p>
                        <p className="truncate text-[11px] text-faint">
                          {g.toolCount ?? 0} {(g.toolCount ?? 0) === 1 ? 'tool' : 'tools'} · {g.kind}
                          {g.description && ` · ${g.description}`}
                        </p>
                      </div>
                      <Switch
                        checked={selectedGroups.includes(g.id)}
                        onChange={() =>
                          setSelectedGroups((prev) => (prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              {groupsDirty && (
                <p className="flex items-center gap-1.5 text-[11px] text-warn">
                  <AlertTriangle size={11} /> Unsaved changes — the agent still sees the previously attached set.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Resolved tools</CardTitle>
                <CardDescription>
                  Exactly what an agent on this server can call — the union across attached groups, active tools only.
                </CardDescription>
              </div>
              <Badge tone="neutral">
                {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
              </Badge>
            </CardHeader>
            <CardContent>
              {tools.length === 0 ? (
                <p className="py-3 text-center text-xs text-faint">
                  {selectedGroups.length === 0
                    ? 'No tool groups attached — this server exposes nothing.'
                    : 'The attached groups contain no active tools.'}
                </p>
              ) : (
                <div className="divide-y divide-border/10">
                  {tools.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <code className="text-xs text-ink">{t.name}</code>
                        {t.displayTitle && <span className="ml-2 text-[11px] text-muted">{t.displayTitle}</span>}
                        <p className="mt-0.5 truncate font-mono text-[11px] text-faint">
                          {t.method} {t.path}
                        </p>
                      </div>
                      <Badge tone="neutral" className="shrink-0">
                        {t.engineType}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>API keys</CardTitle>
                <CardDescription>Each key authenticates a client against this server only.</CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setKeyModalOpen(true)}>
                <Plus size={13} /> Generate key
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-border/10">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm text-ink">{k.label || 'Untitled key'}</p>
                      {k.revokedAt && <Badge tone="bad">revoked</Badge>}
                    </div>
                    <p className="font-mono text-[11px] text-faint">{k.keyPrefix}••••••••••••••••••••••••••</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] text-faint">
                      {k.revokedAt
                        ? `revoked ${new Date(k.revokedAt).toLocaleDateString()}`
                        : `created ${new Date(k.createdAt).toLocaleDateString()}`}
                    </span>
                    {!k.revokedAt && (
                      <button
                        onClick={() => revokeKey(k)}
                        className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad"
                        title="Revoke key"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {keys.length === 0 && (
                <p className="py-3 text-center text-xs text-faint">
                  No API keys yet — a client can't authenticate against this server until you mint one.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>The last 20 tool invocations routed through this server.</CardDescription>
              </div>
              <Activity size={15} className="text-faint" />
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="py-3 text-center text-xs text-faint">No invocations recorded yet.</p>
              ) : (
                <div className="divide-y divide-border/10">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <code className="truncate text-xs text-ink">{toolNames[l.tool] ?? `tool ${l.tool}`}</code>
                        {l.error && <p className="truncate text-[11px] text-bad">{l.error}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[11px] text-faint">
                        <span className="font-mono">{l.code || '—'}</span>
                        <span className="font-mono">{l.durationMs}ms</span>
                        <Badge tone={statusTone[l.status]}>{l.status}</Badge>
                        <span>{new Date(l.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
                <p className="mb-1.5 text-[11px] text-faint">Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs text-ink">{server.endpoint}</code>
                  <button onClick={copyEndpoint} className="shrink-0 text-faint hover:text-signal" title="Copy endpoint">
                    {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Being explicit here rather than shipping a "Connect to Claude" button that
                  silently fails: this endpoint is a plain HTTP API, not MCP JSON-RPC yet. */}
              <div className="flex gap-2.5 rounded-lg border border-info/25 bg-info/5 p-3">
                <Info size={14} className="mt-0.5 shrink-0 text-info" />
                <div className="text-[11px] leading-relaxed text-muted">
                  <p className="font-medium text-ink">Not an MCP endpoint yet.</p>
                  <p className="mt-0.5">
                    This is a simplified HTTP API. Desktop MCP clients speak JSON-RPC 2.0 over Streamable HTTP and{' '}
                    <span className="text-ink">cannot connect to this URL</span> until that transport ships. Use it from your own
                    HTTP client for now.
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted">List tools</p>
                <pre className="overflow-x-auto rounded-lg border border-border-strong/15 bg-black/40 p-2.5 text-[10px] leading-relaxed text-muted">
{`curl ${server.endpoint}/tools \\
  -H "Authorization: Bearer <API_KEY>"`}
                </pre>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted">Call a tool</p>
                <pre className="overflow-x-auto rounded-lg border border-border-strong/15 bg-black/40 p-2.5 text-[10px] leading-relaxed text-muted">
{`curl -X POST ${server.endpoint} \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H 'Content-Type: application/json' \\
  -d '{"tool":"${tools[0]?.name ?? '<tool_name>'}","input":{}}'`}
                </pre>
                <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
                  Check the <code>status</code> field in the response, not the HTTP code — a failed upstream call still returns
                  HTTP 200 with <code>status: "error"</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2.5 p-5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Tool groups</span>
                <span className="text-ink">{server.toolGroupIds.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Connectors reached</span>
                <span className="text-ink">{server.connectorIds.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tools exposed</span>
                <span className="text-ink">{tools.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Active keys</span>
                <span className="text-ink">{activeKeys.length}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/10 pt-2.5">
                <span className="text-muted">Created</span>
                <span className="text-ink">{new Date(server.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={keyModalOpen}
        onClose={() => !mintingKey && setKeyModalOpen(false)}
        title="Generate API key"
        description="Scoped to this MCP server only."
      >
        <div className="space-y-4">
          <Field label="Key label" hint="How you'll recognise it in the list — the secret itself is never shown again.">
            <Input
              placeholder="e.g. Support bot — staging"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
            <div>
              <p className="text-xs text-ink">Live key</p>
              <p className="mt-0.5 text-[11px] text-faint">
                Chooses the <code>gh_live_</code> or <code>gh_test_</code> prefix. A labelling convention — both work identically.
              </p>
            </div>
            <Switch checked={keyLive} onChange={setKeyLive} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={mintingKey} onClick={() => setKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!keyLabel.trim() || mintingKey} onClick={mintKey}>
              <KeyRound size={13} /> {mintingKey ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shown exactly once. Only the hash is stored server-side, so there's no recovery path —
          hence the explicit acknowledgement instead of a dismissible toast. */}
      <Modal
        open={!!newKey}
        onClose={() => {
          if (keyAcknowledged) {
            setNewKey(null)
            return
          }
          toast.warning("Copy the key first — it can't be retrieved after you close this.")
        }}
        title="Copy your API key now"
        description="This is the only time it will be shown."
      >
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-lg border border-warn/25 bg-warn/5 p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-[11px] leading-relaxed text-muted">
              Only a hash of this key is stored. There is no way to recover it — if you lose it, you'll have to revoke the key and
              issue a new one.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
            <code className="flex-1 break-all text-xs text-ink">{newKey}</code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(newKey ?? '').catch(() => {})
                setKeyCopied(true)
                toast.success('API key copied')
              }}
              className="shrink-0 text-faint hover:text-signal"
              title="Copy key"
            >
              {keyCopied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={keyAcknowledged}
              onChange={(e) => setKeyAcknowledged(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[rgb(var(--signal))]"
            />
            <span className="text-xs text-muted">I've saved this key somewhere safe.</span>
          </label>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" disabled={!keyAcknowledged} onClick={() => setNewKey(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title={`Delete "${server.name}"?`}>
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-lg border border-bad/25 bg-bad/5 p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-bad" />
            <div className="text-[11px] leading-relaxed text-muted">
              <p className="font-medium text-ink">Every configured agent breaks immediately.</p>
              <p className="mt-0.5">
                This deletes the server and all {keys.length} of its API {keys.length === 1 ? 'key' : 'keys'}. Tool groups and
                tools survive — they belong to the organization. The slug{' '}
                <code className="text-muted">{server.slug}</code> becomes free again, but recreating it won't restore any keys.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted">
            If you only want to stop traffic, <button onClick={() => { setDeleteOpen(false); if (server.status === 'running') toggleStatus() }} className="text-signal hover:underline">stop the server</button>{' '}
            instead — that's reversible.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" disabled={deleting} onClick={deleteServer} className={cn(deleting && 'opacity-60')}>
              <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete server'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
