import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Server, Copy, Check, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Field } from '@/components/ui/Input'
import { StatusPill } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { mcpServers } from '@/lib/mock-data'

export default function McpServers() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'running' | 'stopped'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [name, setName] = useState('')

  const filtered = useMemo(
    () =>
      mcpServers.filter(
        (s) => (status === 'all' || s.status === status) && s.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, status],
  )

  function copy(id: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopiedId(id)
    toast.success('Endpoint copied')
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <AppShell
      title="MCP Servers"
      subtitle="Group connectors into endpoints your AI clients can connect to"
      actions={
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New server
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input placeholder="Search servers…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as any)} className="sm:w-40">
          <option value="all">All status</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((s) => (
          <Card key={s.id} className="relative">
            <CardContent className="p-5">
              <Link to={`/mcp-servers/${s.id}`} className="absolute inset-0 z-0" aria-label={s.name} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas/60 border border-border/10 text-signal">
                    <Server size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{s.name}</p>
                    <p className="text-[11px] text-faint font-mono">/{s.slug}</p>
                  </div>
                </div>
                <StatusPill tone={s.status === 'running' ? 'ok' : 'neutral'}>{s.status}</StatusPill>
              </div>

              <p className="relative z-10 mt-3 text-xs text-muted">{s.description}</p>

              <div className="relative z-10 mt-4 flex items-center gap-2 rounded-lg border border-border-strong/15 bg-canvas/40 p-2.5">
                <code className="flex-1 truncate text-[11px] text-muted">{s.endpoint}</code>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    copy(s.id, s.endpoint)
                  }}
                  className="relative z-20 text-faint hover:text-signal"
                >
                  {copiedId === s.id ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
                </button>
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-between border-t border-border/10 pt-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <Users size={12} /> {s.connectedClients} connected clients
                </span>
                <span className="text-muted">{s.connectorIds.length} connectors · {s.apiKeyCount} keys</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New MCP server" description="Create an endpoint AI clients can connect to.">
        <div className="space-y-4">
          <Field label="Server name">
            <Input placeholder="e.g. Support Copilot" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug" hint="Used in the endpoint URL.">
            <Input placeholder="support-copilot" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!name} onClick={() => { setCreateOpen(false); toast.success(`Server "${name}" created`) }}>
              Create server
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
