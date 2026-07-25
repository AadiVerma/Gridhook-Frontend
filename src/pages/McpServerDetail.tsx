import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Copy, Check, Plus, KeyRound, Trash2, Cpu, Terminal, MessageSquare, Wind, Code2, Bot, Rocket, Sparkles, MoreHorizontal } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Field } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { connectors, mcpServers, mcpClients } from '@/lib/mock-data'

const clientIcons: Record<string, any> = {
  cursor: Terminal,
  vscode: Code2,
  claude: Sparkles,
  chatgpt: MessageSquare,
  gemini: Bot,
  windsurf: Wind,
  zed: Cpu,
  raycast: Rocket,
  custom: KeyRound,
}

export default function McpServerDetail() {
  const { id } = useParams()
  const server = mcpServers.find((s) => s.id === id) ?? mcpServers[0]
  const [copied, setCopied] = useState(false)
  const [assigned, setAssigned] = useState<string[]>(server.connectorIds)
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [keys, setKeys] = useState([
    { id: 'k1', label: 'Production', prefix: 'gh_live_8f2a', created: '2026-06-01' },
    { id: 'k2', label: 'Staging', prefix: 'gh_test_1c9d', created: '2026-06-14' },
  ])

  function toggleConnector(cid: string) {
    setAssigned((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]))
  }

  function copyEndpoint() {
    navigator.clipboard?.writeText(server.endpoint).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const activeTools = connectors
    .filter((c) => assigned.includes(c.id))
    .flatMap((c) => Array.from({ length: Math.min(3, c.toolCount) }, (_, i) => `${c.name.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`))

  return (
    <AppShell title={server.name} subtitle={`/${server.slug}`} backTo="/mcp-servers">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Server settings</CardTitle>
                <CardDescription>Name, description, and custom instructions passed to clients.</CardDescription>
              </div>
              <StatusPill tone={server.status === 'running' ? 'ok' : 'neutral'}>{server.status}</StatusPill>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Name">
                <Input defaultValue={server.name} />
              </Field>
              <Field label="Description">
                <Textarea rows={2} defaultValue={server.description} />
              </Field>
              <Field label="Custom instructions" hint="Injected as system context for connected agents.">
                <Textarea rows={3} placeholder="Always confirm destructive actions before calling write tools." />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Assigned connectors</CardTitle>
                <CardDescription>Toggle which connectors expose tools on this server.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/10">
              {connectors.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas/60 border border-border/10 text-[11px] font-bold text-ink">
                    {c.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{c.name}</p>
                    <p className="truncate text-[11px] text-faint">{c.toolCount} tools available</p>
                  </div>
                  <Switch checked={assigned.includes(c.id)} onChange={() => toggleConnector(c.id)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>API keys</CardTitle>
                <CardDescription>Scoped keys clients use to authenticate against this server.</CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setKeyModalOpen(true)}>
                <Plus size={13} /> Generate key
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-border/10">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm text-ink">{k.label}</p>
                    <p className="font-mono text-[11px] text-faint">{k.prefix}••••••••</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-faint">created {k.created}</span>
                    <button
                      onClick={() => setKeys((prev) => prev.filter((x) => x.id !== k.id))}
                      className="rounded-md p-1.5 text-faint hover:bg-bad/10 hover:text-bad"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {keys.length === 0 && <p className="py-3 text-center text-xs text-faint">No API keys yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active tools</CardTitle>
                <CardDescription>Read-only list of tools currently callable on this server.</CardDescription>
              </div>
              <Badge tone="neutral">{activeTools.length} tools</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {activeTools.map((t) => (
                  <code key={t} className="rounded-md border border-border-strong/15 bg-canvas/40 px-2 py-1 text-[11px] text-muted">
                    {t}
                  </code>
                ))}
                {activeTools.length === 0 && <p className="text-xs text-faint">No connectors assigned yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Connect your MCP client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
                <p className="mb-1.5 text-[11px] text-faint">Endpoint URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs text-ink">{server.endpoint}</code>
                  <button onClick={copyEndpoint} className="shrink-0 text-faint hover:text-signal">
                    {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {mcpClients.map((c) => {
                  const Icon = clientIcons[c.id] ?? MoreHorizontal
                  return (
                    <button
                      key={c.id}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-border-strong/15 p-2.5 text-center transition-colors hover:border-signal/40 hover:bg-signal/5"
                      title={c.name}
                    >
                      <Icon size={16} className="text-muted" />
                      <span className="truncate text-[10px] text-muted">{c.name}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rounded-lg border border-border-strong/15 bg-canvas/40 p-3">
                <p className="mb-1.5 text-[11px] font-medium text-muted">Manual config (OAuth / API key)</p>
                <pre className="overflow-x-auto rounded-md bg-black/40 p-2 text-[10px] leading-relaxed text-muted">
{`{
  "mcpServers": {
    "${server.slug}": {
      "url": "${server.endpoint}",
      "headers": { "Authorization": "Bearer <API_KEY>" }
    }
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={keyModalOpen} onClose={() => setKeyModalOpen(false)} title="Generate API key" description="Scoped to this MCP server only.">
        <div className="space-y-4">
          <Field label="Key label">
            <Input placeholder="e.g. CI pipeline" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setKeys((prev) => [...prev, { id: `k${prev.length + 1}`, label: 'New key', prefix: 'gh_live_new1', created: '2026-07-25' }])
                setKeyModalOpen(false)
              }}
            >
              <KeyRound size={13} /> Generate
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
