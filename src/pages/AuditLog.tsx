import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Download, AlertTriangle, ScrollText, X } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Label } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { errorMessage } from '@/lib/api-client'
import { AuditLogEntry, InvocationStatus, auditApi, formatPayload } from '@/lib/audit-api'
import { McpServer, mcpApi } from '@/lib/mcp-api'
import { Tool, connectorApi } from '@/lib/connector-api'
import { useConnectorsStore } from '@/lib/connectors-store'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const statusTone: Record<InvocationStatus, 'ok' | 'bad' | 'warn'> = {
  success: 'ok',
  error: 'bad',
  timeout: 'warn',
}

/**
 * Audit rows carry opaque tool ids, not names. There's no global tool endpoint, so resolve
 * lazily per connector actually present in the loaded rows and cache across pages.
 */
function useToolNames(connectorKey: string) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [resolving, setResolving] = useState(false)
  // Each connector is fetched at most once, so a failure isn't retried on every render —
  // hence `resolving` going false is what lets the table fall back to showing the raw id.
  const requested = useRef<Set<string>>(new Set())

  useEffect(() => {
    const pending = connectorKey.split(',').filter((cid) => cid && !requested.current.has(cid))
    if (pending.length === 0) return
    pending.forEach((cid) => requested.current.add(cid))

    let cancelled = false
    setResolving(true)
    Promise.all(pending.map((cid) => connectorApi.listTools(cid).catch(() => [] as Tool[])))
      .then((results) => {
        if (cancelled) return
        setNames((prev) => {
          const next = { ...prev }
          results.flat().forEach((t) => {
            next[t.id] = t.name
          })
          return next
        })
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
  }, [connectorKey])

  return { names, resolving }
}

/** RFC3339 for the API. An unparseable value is silently ignored server-side, so only send valid ones. */
function toRfc3339(value: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export default function AuditLog() {
  const { connectors } = useConnectorsStore()

  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const [status, setStatus] = useState<'all' | InvocationStatus>('all')
  const [connector, setConnector] = useState('all')
  const [server, setServer] = useState('all')
  const [tool, setTool] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const [servers, setServers] = useState<McpServer[]>([])
  const [connectorTools, setConnectorTools] = useState<Tool[]>([])

  const filter = useMemo(
    () => ({
      status: status === 'all' ? undefined : status,
      connector: connector === 'all' ? undefined : connector,
      server: server === 'all' ? undefined : server,
      tool: tool === 'all' ? undefined : tool,
      from: toRfc3339(from),
      to: toRfc3339(to),
    }),
    [status, connector, server, tool, from, to],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await auditApi.list({ ...filter, page, pageSize: PAGE_SIZE })
      setRows(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(errorMessage(err, 'Unable to load the audit log. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    load()
  }, [load])

  // Server filter options.
  useEffect(() => {
    mcpApi
      .list()
      .then(setServers)
      .catch(() => setServers([]))
  }, [])

  // The tool filter is server-side (?tool={id}), which needs concrete ids — so it only opens
  // up once a connector is chosen and we can enumerate that connector's tools.
  useEffect(() => {
    if (connector === 'all') {
      setConnectorTools([])
      setTool('all')
      return
    }
    let cancelled = false
    connectorApi
      .listTools(connector)
      .then((list) => !cancelled && setConnectorTools(list))
      .catch(() => !cancelled && setConnectorTools([]))
    return () => {
      cancelled = true
    }
  }, [connector])

  const connectorKey = useMemo(
    () => Array.from(new Set(rows.map((r) => r.connector).filter(Boolean))).sort().join(','),
    [rows],
  )
  const { names: toolNames, resolving: resolvingToolNames } = useToolNames(connectorKey)

  const connectorNames = useMemo(() => {
    const map: Record<string, string> = {}
    connectors.forEach((c) => {
      map[c.id] = c.name
    })
    return map
  }, [connectors])

  const serverNames = useMemo(() => {
    const map: Record<string, string> = {}
    servers.forEach((s) => {
      map[s.id] = s.name
    })
    return map
  }, [servers])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const hasActiveFilters =
    status !== 'all' || connector !== 'all' || server !== 'all' || tool !== 'all' || !!from || !!to

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
    setExpanded(null)
  }

  function clearFilters() {
    updateFilter(() => {
      setStatus('all')
      setConnector('all')
      setServer('all')
      setTool('all')
      setFrom('')
      setTo('')
    })
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const blob = await auditApi.exportCsv(filter)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'audit-logs.csv'
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not export the audit log.'))
    } finally {
      setExporting(false)
    }
  }

  const dateRangeInvalid = (!!from && !toRfc3339(from)) || (!!to && !toRfc3339(to))
  const isEmptyResult = !loading && !error && rows.length === 0

  // Lets the empty state fill the viewport instead of sitting in a short box.
  const emptyStateRef = useRef<HTMLDivElement>(null)
  const [emptyStateHeight, setEmptyStateHeight] = useState(360)

  useLayoutEffect(() => {
    if (!isEmptyResult) return
    function measure() {
      const el = emptyStateRef.current
      if (!el) return
      const footer = document.querySelector('footer')
      const footerHeight = footer?.getBoundingClientRect().height ?? 0
      setEmptyStateHeight(Math.max(320, window.innerHeight - el.getBoundingClientRect().top - footerHeight))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isEmptyResult])

  return (
    <AppShell
      title="Audit Log"
      subtitle={`${total} tool invocation${total === 1 ? '' : 's'}`}
      actions={
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={exporting}>
          <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      }
    >
      {hasActiveFilters && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[11px] font-medium text-faint hover:text-signal"
          >
            <X size={11} /> Clear filters
          </button>
        </div>
      )}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={(e) => updateFilter(() => setStatus(e.target.value as 'all' | InvocationStatus))}>
            <option value="all">All status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
          </Select>
        </div>
        <div>
          <Label>Connector</Label>
          <Select value={connector} onChange={(e) => updateFilter(() => setConnector(e.target.value))}>
            <option value="all">All connectors</option>
            {connectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Tool</Label>
          <Select
            value={tool}
            disabled={connector === 'all'}
            onChange={(e) => updateFilter(() => setTool(e.target.value))}
            className={connector === 'all' ? 'opacity-50' : undefined}
          >
            <option value="all">{connector === 'all' ? 'Pick a connector first' : 'All tools'}</option>
            {connectorTools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>MCP server</Label>
          <Select value={server} onChange={(e) => updateFilter(() => setServer(e.target.value))}>
            <option value="all">All servers</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => updateFilter(() => setFrom(e.target.value))} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => updateFilter(() => setTo(e.target.value))} />
        </div>
      </div>

      {dateRangeInvalid && (
        <p className="mb-3 flex items-center gap-1.5 text-[11px] text-warn">
          <AlertTriangle size={11} /> That date isn't valid, so it's being left out of the filter.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertTriangle size={20} className="text-bad" />
              <p className="text-sm text-ink">{error}</p>
              <Button variant="secondary" size="sm" onClick={load}>
                Retry
              </Button>
            </div>
          ) : isEmptyResult ? (
            <div
              ref={emptyStateRef}
              className="relative flex items-center justify-center overflow-hidden rounded-2xl"
              style={{ height: emptyStateHeight }}
            >
              <div className="pointer-events-none absolute inset-0 bg-dotgrid" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(55% 55% at 50% 45%, transparent, rgb(var(--canvas)) 100%)' }}
              />
              <div className="pointer-events-none absolute left-1/2 top-[45%] h-[320px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/10 blur-[130px]" />

              <div className="relative flex w-full max-w-sm flex-col items-center gap-4 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong/15 bg-surface text-faint shadow-panel">
                  <ScrollText size={22} />
                </span>
                <div>
                  <p className="text-base font-semibold tracking-tight text-ink">
                    {hasActiveFilters ? 'No log entries match your filters' : 'No tool invocations yet'}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {hasActiveFilters
                      ? 'Try widening the date range or clearing a filter.'
                      : 'Invocations show up here as your connectors run tools through Gridhook.'}
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    <X size={13} /> Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/10 text-[11px] uppercase tracking-wide text-faint">
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Tool</th>
                      <th className="px-4 py-3 font-medium">Connector</th>
                      <th className="px-4 py-3 font-medium">Server</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="w-8 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {loading &&
                      rows.length === 0 &&
                      [0, 1, 2, 3, 4, 5].map((i) => (
                        <tr key={`skeleton-${i}`}>
                          <td colSpan={8} className="px-4 py-3">
                            <div className="h-3 w-full animate-pulse rounded bg-faint/10" />
                          </td>
                        </tr>
                      ))}

                    {rows.map((l) => (
                      <Fragment key={l.id}>
                        <tr
                          onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                          className="cursor-pointer transition-colors hover:bg-surface-raised/40"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                            {new Date(l.time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-ink">
                            {toolNames[l.tool] ?? (
                              // Falls back to the raw id once resolution has settled — a tool
                              // deleted since the invocation will never resolve to a name.
                              <span className="text-faint" title={l.tool}>
                                {resolvingToolNames ? 'resolving…' : l.tool}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted">{connectorNames[l.connector] ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-muted">
                            {l.server ? serverNames[l.server] ?? '—' : <span className="text-faint">direct</span>}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted">{l.code || '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted">{l.durationMs}ms</td>
                          <td className="px-4 py-2.5">
                            <Badge tone={statusTone[l.status]}>{l.status}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-faint">
                            <ChevronDown size={14} className={cn('transition-transform', expanded === l.id && 'rotate-180')} />
                          </td>
                        </tr>
                        {expanded === l.id && (
                          <tr>
                            <td colSpan={8} className="bg-canvas/40 px-4 py-3">
                              {l.error && (
                                <p className="mb-2 rounded-lg border border-bad/25 bg-bad/5 p-2.5 text-[11px] text-bad">
                                  {l.error}
                                </p>
                              )}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="mb-1 text-[11px] font-medium text-faint">Input</p>
                                  <pre className="max-h-56 overflow-auto rounded-lg border border-border-strong/15 bg-black/30 p-2.5 text-[11px] text-muted">
                                    {formatPayload(l.input)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-[11px] font-medium text-faint">Output</p>
                                  <pre className="max-h-56 overflow-auto rounded-lg border border-border-strong/15 bg-black/30 p-2.5 text-[11px] text-muted">
                                    {formatPayload(l.output)}
                                  </pre>
                                </div>
                              </div>
                              {/* No user attribution: on the MCP path an API key identifies a server, not a person. */}
                              <p className="mt-2 font-mono text-[11px] text-faint">
                                {new Date(l.time).toLocaleString()} · invocation {l.id}
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}

                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border/10 px-4 py-3">
                <p className="text-xs text-faint">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1 || loading}
                    onClick={() => {
                      setPage((p) => p - 1)
                      setExpanded(null)
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => {
                      setPage((p) => p + 1)
                      setExpanded(null)
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
