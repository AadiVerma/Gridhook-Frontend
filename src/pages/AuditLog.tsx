import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, Search, Download } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { auditLogs, connectors, LogStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

const statusTone: Record<LogStatus, 'ok' | 'bad' | 'warn'> = {
  success: 'ok',
  error: 'bad',
  timeout: 'warn',
}

export default function AuditLog() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | LogStatus>('all')
  const [connector, setConnector] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return auditLogs.filter((l) => {
      const matchesQuery = l.tool.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === 'all' || l.status === status
      const matchesConnector = connector === 'all' || l.connector === connector
      return matchesQuery && matchesStatus && matchesConnector
    })
  }, [query, status, connector])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AppShell
      title="Audit Log"
      subtitle={`${filtered.length} tool invocations`}
      actions={
        <Button variant="secondary" size="sm">
          <Download size={13} /> Export CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            placeholder="Search by tool name…"
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1) }} className="sm:w-36">
          <option value="all">All status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="timeout">Timeout</option>
        </Select>
        <Select value={connector} onChange={(e) => { setConnector(e.target.value); setPage(1) }} className="sm:w-48">
          <option value="all">All connectors</option>
          {connectors.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/10 text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Connector</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="w-8 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {pageItems.map((l) => (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                      className="cursor-pointer transition-colors hover:bg-surface-raised/40"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                        {new Date(l.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink">{l.tool}</td>
                      <td className="px-4 py-2.5 text-xs text-muted">{l.connector}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted">{l.code}</td>
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
                        <td colSpan={7} className="bg-canvas/40 px-4 py-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[11px] font-medium text-faint">Input</p>
                              <pre className="overflow-x-auto rounded-lg border border-border-strong/15 bg-black/30 p-2.5 text-[11px] text-muted">
                                {l.input}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-[11px] font-medium text-faint">Output</p>
                              <pre className="overflow-x-auto rounded-lg border border-border-strong/15 bg-black/30 p-2.5 text-[11px] text-muted">
                                {l.output}
                              </pre>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] text-faint">Server: {l.server}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-faint">
                      No log entries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/10 px-4 py-3">
            <p className="text-xs text-faint">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
