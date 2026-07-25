import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plug, Plus, Search, Upload, Download, Trash2, MoreVertical, RefreshCw, Store, FileJson, Check } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Field, Textarea } from '@/components/ui/Input'
import { Badge, StatusPill, Tone } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { connectors as seed, Connector, ConnectorType, toolsForConnector } from '@/lib/mock-data'
import { timeAgo } from '@/lib/utils'

const typeTone: Record<ConnectorType, Tone> = {
  REST: 'signal',
  GraphQL: 'violet',
  SOAP: 'warn',
  Database: 'info',
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Connectors() {
  const navigate = useNavigate()
  const [items, setItems] = useState(seed)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ConnectorType>('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importName, setImportName] = useState('')
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () =>
      items.filter((c) => {
        const matchesQuery = c.name.toLowerCase().includes(query.toLowerCase()) || c.baseUrl.toLowerCase().includes(query.toLowerCase())
        const matchesType = typeFilter === 'all' || c.type === typeFilter
        return matchesQuery && matchesType
      }),
    [items, query, typeFilter],
  )

  function confirmDelete() {
    setItems((prev) => prev.filter((c) => c.id !== pendingDelete))
    setPendingDelete(null)
  }

  function exportSpec(c: Connector) {
    downloadJson(`${c.name.toLowerCase().replace(/\s+/g, '-')}.spec.json`, {
      name: c.name,
      baseUrl: c.baseUrl,
      type: c.type,
      authType: c.authType,
      tools: toolsForConnector(c).map(({ name, method, path }) => ({ name, method, path })),
    })
    setOpenMenu(null)
  }

  function runHealthCheck(c: Connector) {
    setOpenMenu(null)
    setCheckingId(c.id)
    setTimeout(() => {
      setItems((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: 'active', lastSync: new Date().toISOString() } : x)),
      )
      setCheckingId(null)
    }, 900)
  }

  function toggleActive(id: string) {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c)),
    )
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      setImportText(text)
      setImportName(file.name.replace(/\.(json|ya?ml)$/i, ''))
    })
  }

  function confirmImport() {
    setImportError('')
    if (!importText.trim()) {
      setImportError('Paste a spec or upload a file first.')
      return
    }
    let parsedName = importName
    let parsedUrl = 'imported.api/v1'
    try {
      const parsed = JSON.parse(importText)
      parsedName = parsedName || parsed.info?.title || parsed.name || 'Imported connector'
      parsedUrl = parsed.servers?.[0]?.url ?? parsed.baseUrl ?? parsedUrl
    } catch {
      if (!parsedName) {
        setImportError('Could not parse this as JSON — give the connector a name to continue anyway.')
        return
      }
    }
    const id = `con_import_${Date.now()}`
    const newConnector: Connector = {
      id,
      name: parsedName || 'Imported connector',
      glyph: (parsedName || 'IM').slice(0, 2).toUpperCase(),
      tint: 'signal',
      baseUrl: parsedUrl,
      type: 'REST',
      authType: 'API Key',
      toolCount: 5,
      status: 'active',
      lastSync: new Date().toISOString(),
      callsToday: 0,
    }
    setItems((prev) => [newConnector, ...prev])
    setImportOpen(false)
    setImportText('')
    setImportName('')
    navigate(`/connectors/${id}`)
  }

  return (
    <AppShell
      title="Connectors"
      subtitle={`${items.length} integrations wired into your MCP servers`}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import spec
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link to="/connectors/new">
              <Plus size={14} /> Add connector
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input placeholder="Search connectors by name or host…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="sm:w-44">
          <option value="all">All types</option>
          <option value="REST">REST</option>
          <option value="GraphQL">GraphQL</option>
          <option value="SOAP">SOAP</option>
          <option value="Database">Database</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="group relative overflow-visible transition-colors hover:border-signal/30">
            <CardContent className="p-4">
              <Link to={`/connectors/${c.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Open ${c.name}`} />
              <div className="pointer-events-none flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas/60 border border-border/10 text-xs font-bold text-ink">
                    {c.glyph}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-[11px] text-faint">{c.baseUrl}</p>
                  </div>
                </div>
                <div className="pointer-events-auto relative z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOpenMenu(openMenu === c.id ? null : c.id)
                    }}
                    className="rounded-md p-1.5 text-faint opacity-0 transition-opacity hover:bg-surface-raised hover:text-ink group-hover:opacity-100"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {openMenu === c.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border-strong/15 bg-surface-raised p-1 shadow-2xl animate-fade-in"
                    >
                      <button
                        onClick={() => runHealthCheck(c)}
                        disabled={checkingId === c.id}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted hover:bg-canvas/60 hover:text-ink disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={checkingId === c.id ? 'animate-spin' : ''} />
                        {checkingId === c.id ? 'Checking…' : 'Health check'}
                      </button>
                      <button
                        onClick={() => exportSpec(c)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted hover:bg-canvas/60 hover:text-ink"
                      >
                        <Download size={13} /> Export spec
                      </button>
                      <button
                        onClick={() => {
                          setPendingDelete(c.id)
                          setOpenMenu(null)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-bad hover:bg-bad/10"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pointer-events-none mt-4 flex flex-wrap items-center gap-1.5">
                <Badge tone={typeTone[c.type]}>{c.type}</Badge>
                <Badge tone="neutral">{c.authType}</Badge>
                <Badge tone="neutral">{c.toolCount} tools</Badge>
              </div>

              <div className="pointer-events-none mt-4 flex items-center justify-between border-t border-border/10 pt-3">
                <div
                  className="pointer-events-auto relative z-20 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch checked={c.status === 'active'} onChange={() => toggleActive(c.id)} />
                  <StatusPill tone={c.status === 'active' ? 'ok' : c.status === 'error' ? 'bad' : 'neutral'} dot={c.status !== 'active'}>
                    {c.status}
                  </StatusPill>
                </div>
                <span className="pointer-events-none text-[11px] text-faint">synced {timeAgo(c.lastSync)}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        <Link
          to="/connectors/new"
          className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong/25 text-muted transition-colors hover:border-signal/40 hover:text-signal"
        >
          <Plug size={20} />
          <span className="text-sm font-medium">Add a connector</span>
          <span className="text-[11px] text-faint">or browse the marketplace</span>
        </Link>
      </div>

      {filtered.length === 0 && (
        <Card className="mt-4 flex flex-col items-center gap-2 py-14 text-center">
          <Store size={22} className="text-faint" />
          <p className="text-sm font-medium text-ink">No connectors match your filters</p>
          <p className="text-xs text-muted">Try clearing the search or type filter.</p>
        </Card>
      )}

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete connector"
        description="This removes the connector and disables any MCP tools built on top of it. This cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>
            <Trash2 size={13} /> Delete connector
          </Button>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          setImportError('')
        }}
        title="Import spec"
        description="Upload an OpenAPI/Swagger JSON file, or paste the spec directly."
        className="max-w-xl"
      >
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/25 py-6 text-muted transition-colors hover:border-signal/40 hover:text-signal"
          >
            <FileJson size={20} />
            <span className="text-sm font-medium">Click to upload a spec file</span>
            <span className="text-[11px] text-faint">.json, .yaml — or paste below</span>
          </button>

          <Field label="Connector name" hint="Auto-filled from the spec's title when available.">
            <Input placeholder="e.g. Internal Billing API" value={importName} onChange={(e) => setImportName(e.target.value)} />
          </Field>

          <Field label="Spec contents">
            <Textarea
              rows={6}
              placeholder='{"openapi": "3.0.0", "info": {"title": "My API"}, "servers": [{"url": "https://api.example.com"}] }'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          {importError && <p className="text-xs text-bad">{importError}</p>}

          <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmImport}>
              <Check size={13} /> Import connector
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
