import { Link } from 'react-router-dom'
import { Plug, Server, Wrench, Waypoints, Check, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const steps = [
  { icon: Plug, title: 'Connect your first API', desc: 'Add a REST, GraphQL, SOAP, or database connector.', to: '/connectors/new', done: true },
  { icon: Wrench, title: 'Map tools', desc: 'Generate or hand-map MCP tools from your connector endpoints.', to: '/connectors', done: true },
  { icon: Server, title: 'Create an MCP server', desc: 'Group connectors into an endpoint your AI client can call.', to: '/mcp-servers', done: false },
  { icon: Waypoints, title: 'Explore the knowledge graph', desc: 'See how entities across your connectors relate to each other.', to: '/knowledge-graph', done: false },
]

export default function Welcome() {
  const doneCount = steps.filter((s) => s.done).length

  return (
    <AppShell title="Setup guide" subtitle="Get your first MCP server live in a few minutes" maxWidth="760px">
      <Card className="mb-4">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(var(--border) / 0.12)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="rgb(var(--signal))"
                strokeWidth="3"
                strokeDasharray={`${(doneCount / steps.length) * 97.4} 97.4`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink">
              {doneCount}/{steps.length}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Onboarding progress</p>
            <p className="text-xs text-muted">Finish the remaining steps to go fully live.</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {steps.map((s) => (
          <Card key={s.title}>
            <CardContent className="flex items-center gap-4 p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  s.done ? 'bg-ok/10 text-ok' : 'bg-canvas/60 border border-border/10 text-muted'
                }`}
              >
                {s.done ? <Check size={17} /> : <s.icon size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="text-xs text-muted">{s.desc}</p>
              </div>
              <Button variant={s.done ? 'secondary' : 'primary'} size="sm" asChild>
                <Link to={s.to}>
                  {s.done ? 'Revisit' : 'Start'} <ArrowRight size={13} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
