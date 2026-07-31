import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Layers, AlertTriangle, KeyRound, Copy, Server, ArrowRight, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Field } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { ApiError, errorMessage } from '@/lib/api-client'
import { McpServer, McpTool, ToolGroup, mcpApi, previewSlug } from '@/lib/mcp-api'
import { cn } from '@/lib/utils'

type Step = 'identity' | 'tools' | 'access'

const STEPS: { id: Step; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'tools', label: 'Tools' },
  { id: 'access', label: 'Access' },
]

interface CreateResult {
  server: McpServer
  tools: McpTool[]
  key: string | null
  /** Steps that failed after the server itself was created — the server still exists. */
  warnings: string[]
}

export default function McpServerNew() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('identity')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CreateResult | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  const [mintKey, setMintKey] = useState(true)
  const [keyLabel, setKeyLabel] = useState('')
  const [keyLive, setKeyLive] = useState(true)
  const [startNow, setStartNow] = useState(true)

  const [keyCopied, setKeyCopied] = useState(false)
  const [keyAcknowledged, setKeyAcknowledged] = useState(false)

  useEffect(() => {
    let cancelled = false
    mcpApi
      .listToolGroups()
      .then((list) => !cancelled && setGroups(list))
      .catch((err) => !cancelled && setGroupsError(errorMessage(err, 'Unable to load tool groups.')))
      .finally(() => !cancelled && setGroupsLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const effectiveSlug = slug.trim() || previewSlug(name)
  const selectedToolCount = useMemo(
    () => groups.filter((g) => selectedGroups.includes(g.id)).reduce((sum, g) => sum + (g.toolCount ?? 0), 0),
    [groups, selectedGroups],
  )

  function toggleGroup(id: string) {
    setSelectedGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  /**
   * Runs the whole create sequence. The server exists from the first call onward, so every
   * later failure is collected as a warning rather than thrown away — losing track of a
   * created server would leave an orphan the user can't see they own.
   */
  async function createServer() {
    setSubmitting(true)
    let server: McpServer
    try {
      server = await mcpApi.create({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      })
    } catch (err) {
      // An explicit duplicate slug currently surfaces as a generic server error rather than a 409.
      const conflict = err instanceof ApiError && (err.code === 'conflict' || err.status >= 500)
      toast.error(
        conflict
          ? `The slug "${effectiveSlug}" is already taken in this organization. Try another.`
          : errorMessage(err, 'Could not create the server.'),
      )
      setStep('identity')
      setSubmitting(false)
      return
    }

    const warnings: string[] = []

    if (selectedGroups.length > 0) {
      try {
        await mcpApi.setToolGroups(server.id, selectedGroups)
      } catch (err) {
        warnings.push(errorMessage(err, 'The tool groups could not be attached.'))
      }
    }

    // Read back the resolved list rather than trusting the attach call — it's the only
    // confirmation the user got the tools they picked.
    let tools: McpTool[] = []
    try {
      tools = await mcpApi.listTools(server.id)
    } catch {
      warnings.push('Could not read back the resolved tool list.')
    }

    let key: string | null = null
    if (mintKey) {
      try {
        const created = await mcpApi.createApiKey(server.id, { label: keyLabel.trim() || 'Default key', live: keyLive })
        key = created.key
      } catch (err) {
        warnings.push(errorMessage(err, 'The API key could not be created — mint one from the server page.'))
      }
    }

    let finalServer = server
    if (startNow) {
      try {
        finalServer = await mcpApi.setStatus(server.id, 'running')
      } catch (err) {
        warnings.push(errorMessage(err, 'The server was created but could not be started.'))
      }
    }

    try {
      finalServer = await mcpApi.get(server.id)
    } catch {
      // Keep whatever we already have — this is only a refresh of the computed fields.
    }

    setResult({ server: finalServer, tools, key, warnings })
    setSubmitting(false)
  }

  // ---------------------------------------------------------------- done panel

  if (result) {
    const { server, tools, key, warnings } = result
    return (
      <AppShell title="Server created" subtitle={`/${server.slug}`} backTo="/mcp-servers" maxWidth="880px">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-9 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ok/25 bg-ok/10 text-ok">
                <Check size={24} />
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight text-ink">{server.name} is ready</p>
                <p className="mt-1.5 text-sm text-muted">
                  {tools.length} {tools.length === 1 ? 'tool' : 'tools'} exposed across {server.toolGroupIds.length}{' '}
                  {server.toolGroupIds.length === 1 ? 'group' : 'groups'} · server is {server.status}
                </p>
              </div>
              <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border-strong/15 bg-canvas/40 p-2.5">
                <code className="flex-1 truncate text-left text-[11px] text-muted">{server.endpoint}</code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(server.endpoint).catch(() => {})
                    toast.success('Endpoint copied')
                  }}
                  className="shrink-0 text-faint hover:text-signal"
                  title="Copy endpoint"
                >
                  <Copy size={13} />
                </button>
              </div>
            </CardContent>
          </Card>

          {key && (
            <Card className="border-warn/25">
              <CardHeader>
                <div>
                  <CardTitle>Copy your API key now</CardTitle>
                  <CardDescription>This is the only time it will ever be shown.</CardDescription>
                </div>
                <KeyRound size={15} className="text-warn" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
                  <code className="flex-1 break-all text-xs text-ink">{key}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(key).catch(() => {})
                      setKeyCopied(true)
                      toast.success('API key copied')
                    }}
                    className="shrink-0 text-faint hover:text-signal"
                    title="Copy key"
                  >
                    {keyCopied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-muted">
                  Only a hash is stored server-side. There is no recovery path — if you lose this, revoke the key and issue a new
                  one.
                </p>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={keyAcknowledged}
                    onChange={(e) => setKeyAcknowledged(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[rgb(var(--signal))]"
                  />
                  <span className="text-xs text-muted">I've saved this key somewhere safe.</span>
                </label>
              </CardContent>
            </Card>
          )}

          {warnings.length > 0 && (
            <Card className="border-warn/25">
              <CardContent className="flex gap-2.5 p-5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn" />
                <div className="text-xs leading-relaxed text-muted">
                  <p className="font-medium text-ink">The server was created, but some steps didn't finish:</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <p className="mt-2">You can finish these from the server page.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between border-t border-border/10 pt-4">
            <Button variant="ghost" asChild>
              <Link to="/mcp-servers">All servers</Link>
            </Button>
            <Button
              variant="primary"
              disabled={!!key && !keyAcknowledged}
              onClick={() => navigate(`/mcp-servers/${server.id}`)}
            >
              Open server <ArrowRight size={14} />
            </Button>
          </div>
          {!!key && !keyAcknowledged && (
            <p className="text-right text-[11px] text-faint">Confirm you've saved the key to continue.</p>
          )}
        </div>
      </AppShell>
    )
  }

  // ---------------------------------------------------------------- wizard

  const currentIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <AppShell
      title="New MCP server"
      subtitle="Bundle tool groups into one endpoint an agent can connect to"
      backTo="/mcp-servers"
      maxWidth="880px"
    >
      <div className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => i < currentIndex && setStep(s.id)}
              disabled={i > currentIndex}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap text-xs font-medium transition-colors',
                i === currentIndex ? 'text-ink' : i < currentIndex ? 'text-muted hover:text-signal' : 'text-faint',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border text-[10px]',
                  i === currentIndex
                    ? 'border-signal bg-signal/15 text-signal'
                    : i < currentIndex
                      ? 'border-ok/40 bg-ok/10 text-ok'
                      : 'border-border-strong/20 text-faint',
                )}
              >
                {i < currentIndex ? <Check size={11} /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border/20" />}
          </div>
        ))}
      </div>

      {step === 'identity' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Server identity</CardTitle>
              <CardDescription>
                You'll pick which tool groups it exposes next. A server starts with nothing attached and isn't usable until it
                has tools and a key.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Server name">
              <Input placeholder="e.g. Support Copilot" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <Field label="Slug" hint="Leave blank to generate one from the name.">
              <Input
                placeholder={previewSlug(name) || 'support-copilot'}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Description" hint="Shown to teammates browsing servers.">
              <Textarea
                rows={3}
                placeholder="What is this server for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {effectiveSlug && (
              <div className="flex gap-2.5 rounded-lg border border-warn/25 bg-warn/5 p-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
                <div className="text-[11px] leading-relaxed text-muted">
                  <p className="font-medium text-ink">
                    The slug is permanent — agents will connect to <code className="text-muted">/mcp/{effectiveSlug}</code>
                  </p>
                  <p className="mt-0.5">
                    There's no rename path. Changing it later means deleting the server and reissuing every API key, which breaks
                    any agent already configured against it.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-border/10 pt-4">
              <Button variant="primary" disabled={!name.trim()} onClick={() => setStep('tools')}>
                Continue <ArrowRight size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'tools' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attach tool groups</CardTitle>
              <CardDescription>
                A server exposes tool groups, not connectors. A tool reaches the agent only if it's in a group attached here.
              </CardDescription>
            </div>
            {groups.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGroups(selectedGroups.length === groups.length ? [] : groups.map((g) => g.id))}
              >
                {selectedGroups.length === groups.length ? 'Clear all' : 'Select all'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {groupsLoading && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[68px] animate-pulse rounded-lg border border-border-strong/15 bg-faint/5" />
                ))}
              </div>
            )}

            {!groupsLoading && groupsError && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertTriangle size={18} className="text-bad" />
                <p className="text-xs text-muted">{groupsError}</p>
              </div>
            )}

            {!groupsLoading && !groupsError && groups.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border-strong/15 py-10 text-center">
                <Layers size={20} className="text-faint" />
                <p className="text-sm font-medium text-ink">No tool groups yet</p>
                <p className="max-w-sm text-xs text-muted">
                  Tool groups come from your connectors. You can still create this server now and attach groups later.
                </p>
                <Button variant="secondary" size="sm" className="mt-1" asChild>
                  <Link to="/connectors">Go to connectors</Link>
                </Button>
              </div>
            )}

            {!groupsLoading && groups.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groups.map((g) => {
                  const selected = selectedGroups.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                        selected
                          ? 'border-signal/50 bg-signal/5 shadow-[0_0_0_1px_rgb(var(--signal)/0.3)]'
                          : 'border-border-strong/15 hover:border-border-strong/30',
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas/60 border border-border/10 text-faint">
                        <Layers size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-ink">{g.name}</span>
                        <span className="block truncate text-[11px] text-faint">
                          {g.toolCount ?? 0} {(g.toolCount ?? 0) === 1 ? 'tool' : 'tools'} · {g.kind}
                        </span>
                      </span>
                      {selected && <Check size={13} className="mt-0.5 shrink-0 text-signal" />}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedGroups.length === 0 && groups.length > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-faint">
                <AlertTriangle size={11} /> With nothing attached the server will answer, but expose zero tools.
              </p>
            )}

            <div className="flex items-center justify-between border-t border-border/10 pt-4">
              <Button variant="ghost" onClick={() => setStep('identity')}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-faint">
                  {selectedGroups.length} {selectedGroups.length === 1 ? 'group' : 'groups'} · ~{selectedToolCount} tools
                </span>
                <Button variant="primary" onClick={() => setStep('access')}>
                  Continue <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'access' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Access</CardTitle>
                <CardDescription>A client needs an API key to call this server. You can add more later.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
                <div>
                  <p className="text-xs font-medium text-ink">Generate an API key now</p>
                  <p className="mt-0.5 text-[11px] text-faint">Shown once, immediately after creation.</p>
                </div>
                <Switch checked={mintKey} onChange={setMintKey} />
              </div>

              {mintKey && (
                <>
                  <Field label="Key label" hint="How you'll recognise it later — the secret itself is never shown again.">
                    <Input
                      placeholder="e.g. Support bot — staging"
                      value={keyLabel}
                      onChange={(e) => setKeyLabel(e.target.value)}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { live: true, label: 'Live key', desc: 'gh_live_ prefix' },
                      { live: false, label: 'Test key', desc: 'gh_test_ prefix' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => setKeyLive(option.live)}
                        className={cn(
                          'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                          keyLive === option.live
                            ? 'border-signal/50 bg-signal/5 shadow-[0_0_0_1px_rgb(var(--signal)/0.3)]'
                            : 'border-border-strong/15 hover:border-border-strong/30',
                        )}
                      >
                        <span className="flex-1">
                          <span className="block text-xs font-medium text-ink">{option.label}</span>
                          <span className="block font-mono text-[11px] text-faint">{option.desc}</span>
                        </span>
                        {keyLive === option.live && <Check size={13} className="mt-0.5 shrink-0 text-signal" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-faint">
                    A labelling convention only — both prefixes behave identically today.
                  </p>
                </>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
                <div>
                  <p className="text-xs font-medium text-ink">Start the server immediately</p>
                  <p className="mt-0.5 text-[11px] text-faint">
                    Leave off to create it stopped — stopped servers return 503 until you start them.
                  </p>
                </div>
                <Switch checked={startNow} onChange={setStartNow} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Review</CardTitle>
                <CardDescription>What will be created.</CardDescription>
              </div>
              <Server size={15} className="text-faint" />
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Name</span>
                <span className="text-ink">{name.trim()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Endpoint path</span>
                <code className="text-ink">/mcp/{effectiveSlug}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tool groups</span>
                <span className="text-ink">
                  {selectedGroups.length === 0 ? 'None' : `${selectedGroups.length} (~${selectedToolCount} tools)`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">API key</span>
                <span className="text-ink">{mintKey ? (keyLive ? 'One live key' : 'One test key') : 'None'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/10 pt-2.5">
                <span className="text-muted">Initial status</span>
                <Badge tone={startNow ? 'ok' : 'neutral'}>{startNow ? 'running' : 'stopped'}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between border-t border-border/10 pt-4">
            <Button variant="ghost" disabled={submitting} onClick={() => setStep('tools')}>
              Back
            </Button>
            <Button variant="primary" disabled={!name.trim() || submitting} onClick={createServer}>
              <Rocket size={14} /> {submitting ? 'Creating…' : 'Create server'}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
