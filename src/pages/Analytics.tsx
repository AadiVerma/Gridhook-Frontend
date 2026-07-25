import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Activity, CheckCircle2, Repeat, DollarSign } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { connectors, dailyInvocations, monthlyCost, topTools } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const ranges = ['7d', '30d', '90d'] as const

export default function Analytics() {
  const [range, setRange] = useState<(typeof ranges)[number]>('7d')
  const totalCalls = dailyInvocations.reduce((s, d) => s + d.calls, 0)
  const totalErrors = dailyInvocations.reduce((s, d) => s + d.errors, 0)
  const successRate = (((totalCalls - totalErrors) / totalCalls) * 100).toFixed(1)

  const byConnector = connectors
    .map((c) => ({ name: c.name, calls: c.callsToday }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 6)

  return (
    <AppShell
      title="Analytics"
      subtitle="Usage, cost, and reliability across all MCP servers"
      actions={
        <div className="flex rounded-lg border border-border-strong/15 bg-surface p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === r ? 'bg-signal text-white' : 'text-muted hover:text-ink',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total calls" value={totalCalls.toLocaleString()} icon={<Activity size={16} />} trend="+8.1%" trendTone="ok" />
        <StatCard label="Success rate" value={`${successRate}%`} icon={<CheckCircle2 size={16} />} trend="+0.4pt" trendTone="ok" />
        <StatCard label="Proxy calls" value="18,204" icon={<Repeat size={16} />} trend="-2.3%" trendTone="bad" />
        <StatCard label="Est. cost" value="$608" icon={<DollarSign size={16} />} sub="this billing period" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Calls by day</CardTitle>
              <CardDescription>Total invocations vs. errors</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyInvocations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border) / 0.08)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} width={32} />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--border) / 0.05)' }}
                    contentStyle={{ background: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--border-strong) / 0.15)', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="calls" fill="rgb(var(--signal))" radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Estimated cost</CardTitle>
              <CardDescription>Weekly proxy + compute spend</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCost}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border) / 0.08)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--faint))', fontSize: 11 }} width={32} />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--border) / 0.05)' }}
                    contentStyle={{ background: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--border-strong) / 0.15)', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="cost" fill="rgb(var(--violet))" radius={[5, 5, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTools.map((t) => (
              <div key={t.tool} className="flex items-center gap-3">
                <code className="w-40 shrink-0 truncate text-xs text-muted">{t.tool}</code>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas/60">
                  <div className="h-full rounded-full bg-signal/70" style={{ width: `${(t.calls / topTools[0].calls) * 100}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-ink">{t.calls.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls by connector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byConnector.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-muted">{c.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas/60">
                  <div className="h-full rounded-full bg-info/70" style={{ width: `${(c.calls / (byConnector[0].calls || 1)) * 100}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-ink">{c.calls.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
