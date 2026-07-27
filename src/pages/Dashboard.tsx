import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Plug, Wrench, Activity, AlertTriangle, ArrowUpRight, Plus, Store, Server, Copy, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/Badge'
import { dailyInvocations, topTools, connectorStatus, totalTools, totalCallsToday, connectorLastSync } from '@/lib/mock-data'
import { useConnectorDrafts } from '@/lib/connector-drafts-store'
import { timeAgo } from '@/lib/utils'
import { useState } from 'react'

export default function Dashboard() {
  const [copied, setCopied] = useState(false)
  const { connectors } = useConnectorDrafts()
  const activeConnectors = connectors.filter((c) => connectorStatus(c) === 'active').length
  const toolTotal = connectors.reduce((s, c) => s + totalTools(c), 0)
  const callsToday = connectors.reduce((s, c) => s + totalCallsToday(c), 0)
  const errored = connectors.filter((c) => connectorStatus(c) === 'error').length

  function copyEndpoint() {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Live overview of your connectors and MCP traffic"
      actions={
        <Button variant="primary" size="sm" asChild>
          <Link to="/connectors/new">
            <Plus size={14} /> New connector
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active connectors" value={String(activeConnectors)} icon={<Plug size={16} />} trend="+2 this week" trendTone="ok" />
        <StatCard label="MCP tools" value={String(toolTotal)} icon={<Wrench size={16} />} trend="+9 this week" trendTone="ok" />
        <StatCard label="Invocations / 24h" value={callsToday.toLocaleString()} icon={<Activity size={16} />} trend="+12.4%" trendTone="ok" />
        <StatCard label="Errors / 24h" value={String(errored)} icon={<AlertTriangle size={16} />} trend={errored > 0 ? 'needs attention' : 'all clear'} trendTone={errored > 0 ? 'bad' : 'ok'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Invocations, last 7 days</CardTitle>
              <CardDescription>Tool calls routed through all MCP servers</CardDescription>
            </div>
            <Link to="/analytics" className="flex items-center gap-1 text-xs text-signal hover:underline">
              Full analytics <ArrowUpRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyInvocations} barCategoryGap={18}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--border) / 0.05)' }}
                    contentStyle={{
                      background: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border-strong) / 0.15)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'rgb(var(--ink))' }}
                  />
                  <Bar dataKey="calls" fill="rgb(var(--signal))" radius={[5, 5, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="errors" fill="rgb(var(--bad))" radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border/10 pt-3 text-center">
              <div>
                <p className="font-mono text-sm font-semibold text-ink">98.4%</p>
                <p className="text-[11px] text-faint">success rate</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-ink">142ms</p>
                <p className="text-[11px] text-faint">avg latency</p>
              </div>
              <div>
                <p className="truncate font-mono text-sm font-semibold text-ink">{topTools[0].tool}</p>
                <p className="text-[11px] text-faint">top tool</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>MCP endpoint health</CardTitle>
              <CardDescription>Core Operations server</CardDescription>
            </div>
            <StatusPill tone="ok">Online</StatusPill>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
              <p className="mb-1.5 text-[11px] text-faint">Endpoint URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-xs text-ink">gw.gridhook.dev/mcp/core-ops</code>
                <button onClick={copyEndpoint} className="text-faint hover:text-signal">
                  {copied ? <CheckCircle2 size={14} className="text-ok" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Connected clients</span>
                <span className="font-mono text-ink">6</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Uptime (30d)</span>
                <span className="font-mono text-ok">99.98%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">p95 latency</span>
                <span className="font-mono text-ink">318ms</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" asChild>
                <Link to="/mcp-servers">
                  <Server size={13} /> Manage servers
                </Link>
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" asChild>
                <Link to="/connectors/store">
                  <Store size={13} /> Marketplace
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Recent connectors</CardTitle>
            <CardDescription>Most recently synced integrations</CardDescription>
          </div>
          <Link to="/connectors" className="flex items-center gap-1 text-xs text-signal hover:underline">
            View all <ArrowUpRight size={12} />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/10">
            {connectors.slice(0, 5).map((c) => {
              const status = connectorStatus(c)
              const lastSync = connectorLastSync(c)
              return (
              <Link
                key={c.id}
                to="/connectors"
                className="flex items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-surface-raised/30 -mx-2 px-2 rounded-lg"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas/60 border border-border/10 text-xs font-bold text-ink">
                  {c.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                  <p className="truncate text-[11px] text-faint">{c.description}</p>
                </div>
                <span className="hidden text-xs text-muted sm:block">{totalTools(c)} tools</span>
                <span className="hidden text-xs text-faint sm:block">{lastSync ? timeAgo(lastSync) : 'never'}</span>
                <StatusPill tone={status === 'active' ? 'ok' : status === 'error' ? 'bad' : 'neutral'}>
                  {status}
                </StatusPill>
              </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
