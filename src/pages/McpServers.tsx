import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Server, Copy, Check, AlertTriangle, KeyRound, Layers, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { errorMessage } from '@/lib/api-client'
import { McpServer, McpServerStatus, mcpApi } from '@/lib/mcp-api'

export default function McpServers() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | McpServerStatus>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  const emptyStateRef = useRef<HTMLDivElement>(null)
  const [emptyStateHeight, setEmptyStateHeight] = useState(520)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Not paginated, so fetch once and filter in the browser rather than refetching per keystroke.
      setServers(await mcpApi.list())
    } catch (err) {
      setError(errorMessage(err, 'Unable to load MCP servers. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Lets the empty state fill the viewport instead of sitting in a short box.
  useLayoutEffect(() => {
    function measure() {
      const el = emptyStateRef.current
      if (!el) return
      const footer = document.querySelector('footer')
      const footerHeight = footer?.getBoundingClientRect().height ?? 0
      setEmptyStateHeight(Math.max(420, window.innerHeight - el.getBoundingClientRect().top - footerHeight))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [servers.length, loading])

  const filtered = useMemo(
    () =>
      servers.filter(
        (s) =>
          (status === 'all' || s.status === status) &&
          (s.name.toLowerCase().includes(query.toLowerCase()) || s.slug.toLowerCase().includes(query.toLowerCase())),
      ),
    [servers, query, status],
  )

  function copy(id: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopiedId(id)
    toast.success('Endpoint copied')
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function toggleStatus(server: McpServer) {
    const next: McpServerStatus = server.status === 'running' ? 'stopped' : 'running'
    setPendingStatus(server.id)
    try {
      const updated = await mcpApi.setStatus(server.id, next)
      setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      toast.success(next === 'running' ? `${server.name} started` : `${server.name} stopped`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change the server status.'))
    } finally {
      setPendingStatus(null)
    }
  }

  const isEmpty = !loading && !error && servers.length === 0

  return (
    <AppShell
      title="MCP Servers"
      subtitle="Group tools into endpoints your AI clients can connect to"
      actions={
        <Button variant="primary" size="sm" asChild>
          <Link to="/mcp-servers/new">
            <Plus size={14} /> New server
          </Link>
        </Button>
      }
    >
      {/* Filters are noise when there's nothing to filter. */}
      {!isEmpty && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input placeholder="Search servers…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as 'all' | McpServerStatus)} className="sm:w-40">
            <option value="all">All status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </Select>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="animate-pulse space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-faint/10" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 rounded bg-faint/10" />
                    <div className="h-2 w-20 rounded bg-faint/10" />
                  </div>
                </div>
                <div className="h-2 w-full rounded bg-faint/10" />
                <div className="h-10 w-full rounded-lg bg-faint/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <Server size={22} className="text-bad" />
          <p className="text-sm font-medium text-ink">Couldn't load MCP servers</p>
          <p className="max-w-md text-xs text-muted">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={load}>
            <RefreshCw size={13} /> Retry
          </Button>
        </Card>
      )}

      {isEmpty && (
        <div
          ref={emptyStateRef}
          className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border/10"
          style={{ height: emptyStateHeight }}
        >
          <div className="pointer-events-none absolute inset-0 bg-dotgrid" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(55% 55% at 50% 45%, transparent, rgb(var(--canvas)) 100%)' }}
          />
          <div className="pointer-events-none absolute left-1/2 top-[45%] h-[420px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/15 blur-[130px]" />

          <div className="relative flex w-full max-w-md flex-col items-center gap-5 px-6 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong/15 bg-surface text-signal shadow-panel">
              <Server size={26} />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">No MCP servers yet</p>
              <p className="mt-2 text-sm text-muted">
                Bundle tool groups from your connectors into a single endpoint, mint a key, and point an agent at it.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Badge tone="neutral">Tool groups</Badge>
              <Badge tone="neutral">Scoped API keys</Badge>
              <Badge tone="neutral">Kill switch</Badge>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/mcp-servers/new">
                  <Plus size={14} /> Create a server
                </Link>
              </Button>
            </div>
            <Link to="/connectors" className="text-xs font-medium text-faint hover:text-signal">
              or set up a connector first
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && servers.length > 0 && filtered.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-14 text-center">
          <Search size={20} className="text-faint" />
          <p className="text-sm font-medium text-ink">No servers match your filters</p>
          <p className="text-xs text-muted">Try a different search or status.</p>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((s) => (
            <Card key={s.id} className="relative transition-colors hover:border-signal/30">
              <CardContent className="p-5">
                <Link to={`/mcp-servers/${s.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`Open ${s.name}`} />
                {/* Presentational blocks sit above the link overlay, so they must let clicks
                    through to it — only the real controls below opt back in. */}
                <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas/60 border border-border/10 text-signal">
                      <Server size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{s.name || 'Untitled server'}</p>
                      <p className="truncate text-[11px] text-faint font-mono">/{s.slug}</p>
                    </div>
                  </div>
                  {/* The kill-switch: one call, immediate, reversible. */}
                  <div
                    className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <StatusPill tone={s.status === 'running' ? 'ok' : 'neutral'}>{s.status}</StatusPill>
                    <Switch
                      checked={s.status === 'running'}
                      onChange={() => pendingStatus !== s.id && toggleStatus(s)}
                      className={pendingStatus === s.id ? 'opacity-50' : undefined}
                    />
                  </div>
                </div>

                {s.description && (
                  <p className="pointer-events-none relative z-10 mt-3 line-clamp-2 text-xs text-muted">{s.description}</p>
                )}

                <div className="pointer-events-none relative z-10 mt-4 flex items-center gap-2 rounded-lg border border-border-strong/15 bg-canvas/40 p-2.5">
                  <code className="flex-1 truncate text-[11px] text-muted">{s.endpoint}</code>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      copy(s.id, s.endpoint)
                    }}
                    className="pointer-events-auto relative z-20 text-faint hover:text-signal"
                    title="Copy endpoint"
                  >
                    {copiedId === s.id ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="pointer-events-none relative z-10 mt-4 flex items-center justify-between border-t border-border/10 pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Layers size={12} /> {s.toolGroupIds.length} tool {s.toolGroupIds.length === 1 ? 'group' : 'groups'}
                    {s.connectorIds.length > 0 && ` · ${s.connectorIds.length} connectors`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={12} /> {s.apiKeyCount} {s.apiKeyCount === 1 ? 'key' : 'keys'}
                  </span>
                </div>

                {/* Both of these make the server unusable, so say so on the card rather than
                    letting the user find out from a silent empty tool list. */}
                {(s.toolGroupIds.length === 0 || s.apiKeyCount === 0) && (
                  <p className="pointer-events-none relative z-10 mt-2.5 flex items-center gap-1.5 text-[11px] text-warn">
                    <AlertTriangle size={11} />
                    {s.toolGroupIds.length === 0 && s.apiKeyCount === 0
                      ? 'No tools attached and no API key'
                      : s.toolGroupIds.length === 0
                        ? 'No tool groups attached — exposes nothing'
                        : 'No API key — no client can connect'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
