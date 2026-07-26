import { useMemo, useState } from 'react'
import { Search, ExternalLink, Wrench, Download, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Field } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { marketplaceAdapters, mcpServers } from '@/lib/mock-data'
import { formatNumber } from '@/lib/utils'

const categories = ['All', ...Array.from(new Set(marketplaceAdapters.map((a) => a.category)))]

export default function Marketplace() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [installing, setInstalling] = useState<(typeof marketplaceAdapters)[number] | null>(null)
  const [installStep, setInstallStep] = useState<'auth' | 'assign' | 'done'>('auth')
  const [server, setServer] = useState(mcpServers[0]?.id ?? '')

  const filtered = useMemo(
    () =>
      marketplaceAdapters.filter(
        (a) => (category === 'All' || a.category === category) && a.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category],
  )

  function openInstall(a: (typeof marketplaceAdapters)[number]) {
    setInstalling(a)
    setInstallStep('auth')
  }

  return (
    <AppShell title="Marketplace" subtitle={`${marketplaceAdapters.length} pre-built adapters ready to install`} backTo="/connectors">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input placeholder="Search adapters…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === c
                  ? 'border-signal/50 bg-signal/10 text-signal'
                  : 'border-border-strong/15 text-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <Card key={a.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas/60 border border-border/10 text-xs font-bold text-ink">
                  {a.glyph}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{a.name}</p>
                  <p className="text-[11px] text-faint">{a.category} · {a.region}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-xs text-muted">{a.description}</p>

              <div className="mt-3 flex items-center gap-1.5">
                <Badge tone="neutral">{a.authType}</Badge>
                <Badge tone="neutral">
                  <Wrench size={9} className="mr-1" /> {a.toolCount} tools
                </Badge>
              </div>

              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-canvas/60">
                <div
                  className="h-full rounded-full bg-signal/70"
                  style={{ width: `${Math.min(100, (a.toolCount / 30) * 100)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-3">
                <span className="flex items-center gap-1 text-[11px] text-faint">
                  <Download size={11} /> {formatNumber(a.installs)} installs
                </span>
                <div className="flex items-center gap-2">
                  <button className="text-faint hover:text-signal" title="Docs">
                    <ExternalLink size={13} />
                  </button>
                  <Button size="sm" variant="primary" onClick={() => openInstall(a)}>
                    Install
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        open={!!installing}
        onClose={() => setInstalling(null)}
        title={installing ? `Install ${installing.name}` : ''}
        description={installStep === 'auth' ? 'Configure credentials for this adapter.' : installStep === 'assign' ? 'Attach the connector to an MCP server.' : undefined}
      >
        {installing && installStep === 'auth' && (
          <div className="space-y-4">
            <Field label="Connector label">
              <Input defaultValue={installing.name} />
            </Field>
            {installing.authType === 'OAuth2' ? (
              <div className="rounded-lg border border-border-strong/15 bg-canvas/40 p-3 text-xs text-muted">
                You'll be redirected to {installing.name} to authorize access. No credentials are stored here.
              </div>
            ) : (
              <Field label={`${installing.authType} credential`}>
                <Input type="password" placeholder="••••••••••••••••" />
              </Field>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInstalling(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => setInstallStep('assign')}>
                Continue <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        )}

        {installing && installStep === 'assign' && (
          <div className="space-y-4">
            <Field label="Assign to MCP server" hint="Tools become callable on this server immediately.">
              <Select value={server} onChange={(e) => setServer(e.target.value)}>
                {mcpServers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInstallStep('auth')}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setInstallStep('done'); toast.success('Adapter installed') }}>
                Install adapter
              </Button>
            </div>
          </div>
        )}

        {installing && installStep === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok/10 text-ok">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-ink">{installing.name} installed</p>
            <p className="text-xs text-muted">
              {installing.toolCount} tools are now live on {mcpServers.find((s) => s.id === server)?.name}.
            </p>
            <Button variant="primary" size="sm" className="mt-2" onClick={() => setInstalling(null)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
